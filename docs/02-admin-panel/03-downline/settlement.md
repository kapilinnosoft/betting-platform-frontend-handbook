# Admin Module A3: Settlement

`rsplay/rsplay-admin@12f0054`, paths relative to `src/pages/Settlement/`. Route `/settlement`, under `ModuleRoute "Users"` (`App.tsx:136-140`). It is the last child of Sidebar › Downline for every role that can see Users (`components/common/EnhancedSidebar.tsx:284`).

Settlement lists the logged-in account's downline with their P/L (`referance`, shown as "Total P/L"). It lets the account transfer that P/L, one member at a time or in bulk.

## List

| Item | Behaviour | Source |
|---|---|---|
| Request | `GET users/me/sub-users` with `level: 1`, `settlement: true`, `username`, `page`, `limit` (no `rollId`, so all roles) ([DL1](api-inventory.md#dl1-getmembers)) | `useSettlementHook.ts:29-39` |
| Search | "Search User". **Not debounced**, so each keystroke sends a request. Resets to page 1 | `index.tsx:252-258`; `useSettlementHook.ts:84-87` |
| Page size | 10, 25, 50. Changing the size does not reset the page | `index.tsx:308-315` |

| Column | Field | Notes |
|---|---|---|
| (checkbox) | — | disabled when `referance == 0` or without `update`. The header box selects every row on the page with non-zero P/L |
| S. NO. | — | |
| USERNAME | `role`, `username` | role badge |
| Credit Reference | `creditAmount` | |
| Total P/L | `referance` | coloured by sign |
| Upline P/L | `downlinePlInPercent` | coloured by sign |
| Total Balance | `totalBalance` | |
| Balance | `availableBalance` | |
| Exposure | `exposureAmount` for USER rows, `exposure` for others | coloured by sign |
| Partnership | `partnership` | |
| Transfer | — | link, ignored when `referance === 0` |
| Profile Icon | — | `detailedView`; link built with hard-coded role ids (below) |

Source: `index.tsx:43-245`.

## Transfer (single and bulk)

`modal/SettlementModal.tsx`. Two instances are always mounted: one single, one bulk (`index.tsx:275-287`).

| Item | Single | Bulk | Source |
|---|---|---|---|
| Opens from | row "Transfer" | "Bulk Transfer" (enabled when at least one row is selected and the account has `update`) | `index.tsx:194-217,259-272` |
| Shows | "Your Balance" (own Main wallet), "User Balance", "Total P/L" | "Your Balance", "Total P/L" of the selection | `SettlementModal.tsx:32-37,78-95` |
| Amount (read-only) | `abs(referance)`, 2 decimals | **sum of the selected `referance` values, signs kept** | `SettlementModal.tsx:102`; `useSettlementHook.ts:78-83` |
| Remark | optional text | optional text | `SettlementModal.tsx:109-114` |
| Request | `POST /users/{loggedInUserId}/wallets/settlement` `{ userIds: [id], allAmount, remark }` | same with `userIds: [ids…]` | `SettlementModal.tsx:46-57`; [DL25](api-inventory.md#dl25-settlement) |
| After | toast with the response `message`, the modal closes | the modal closes and the selection clears | `SettlementModal.tsx:58-61`; `index.tsx:282-285` |

Because the bulk amount keeps the signs, a selection with +500 and −500 sends a total of 0. The mutation drops `allAmount` when it is 0 (`store/api/DownlineApi.ts:356`). A single transfer always sends a positive amount. Team (Q-46, 2026-11-24): bulk settlement takes the full amount of each selected member and clears their settlement; no money moves in a negative direction. So the netted `allAmount` in the bulk body does not decide the amount settled.

The path user id is the **logged-in** account (`user.data.id`), not the member (`SettlementModal.tsx:52`).

## Profile link

```text
/members/{ role=='SUPERMASTER' ? 2 : role=='MASTER' ? 3 : 4 }/sub/{id}/{ isSelfRegistered && createdBy=='OWNER' ? 'd' : 'h' }/{upline}/account-summary
```

Source: `index.tsx:232-238`. Role names in this app are written with a space (`SUPER MASTER`), so the first test never matches. The first segment is therefore `3` for Masters and `4` for everyone else. Inside account details, that segment is only carried into the tab links (`AccountDetails.tsx:56-58`), so the wrong id has no visible effect at this commit. Team (Q-48): a confirmed defect; ids must come from `/role/available`. `createdBy` is not declared in the `Member` type (`types/index.ts:445-477`).
