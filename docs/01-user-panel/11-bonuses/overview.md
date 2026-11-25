# Module 11: Bonuses (overview)

**Scope.** The **Bonus Statement** page at `/bonus-statement` (menu name "Bonus History"), which lists the bonuses awarded to the logged-in user with their turnover progress, instalments and status. Also covers the other places the user sees bonus information: the bonus balance in the profile drawer and the bonus rule text in the footer.

**Reference.** rsplay only: `rsplay/rsplay-user@7a89e53`, read at `HEAD`. Paths are relative to `src/` unless they start with `public/`. The team chose this commit on 2026-11-25. None of the files in this module changed between `810884b` and `7a89e53`.

**Files in this module**

| File | What it covers |
|---|---|
| this page | Route, access, filters, columns, instalments, the turnover calculation, bonus balance, findings |
| [api-inventory.md](api-inventory.md) | B1 `getBonusApplicants`; the bonus wallet in B2 |
| [polling-and-frequency.md](polling-and-frequency.md) | When the list is requested; the 5 s wallet poll behind the bonus balance |

---

## Route and access

| Item | Rule | Source |
|---|---|---|
| Route | `/bonus-statement`, lazy-loaded, inside `HomeLayout` and `ProtectedRoute` | `App.tsx:59,92,95` (`App`); `routes/index.tsx:17` (`BonusStatementPage`) |
| Guest | `ProtectedRoute` opens the login modal and redirects to `/` | `components/common/ProtectedRoute.tsx:12-28` (`ProtectedRoute`) |
| Menu entry | Profile drawer item 11 "Bonus History" | `utils/constants.ts:362-367` (`profileDrawerItems`); `components/ProfileDrawer.tsx:32` |
| Demo user | No menu link (the drawer shows demo users only Rules). The page itself has no demo check | `ProfileDrawer.tsx:208-210`; `pages/BonusStatement/index.tsx` |
| Page title | "Bonus Statement" | `public/locales/en/common.json:728` (`bonusStatement.title`) |

## Where bonus information appears

| Place | What is shown | Data | Source |
|---|---|---|---|
| Bonus Statement page | Each awarded bonus | B1 `GET /bonuses/applicants/list` | `pages/BonusStatement/index.tsx` (`BonusStatement`) |
| Profile drawer | "Bonus Balance", 2 decimals | `wallet.bonusBalance`, from the wallet with `type` `bonus` in `GET /users/me/wallets` (polled every 5 s by the header) | `ProfileDrawer.tsx:57,146-150`; `store/slices/walletSlice.ts:53-54`; [B2](api-inventory.md#b2-bonus-wallet-get-usersmewallets) |
| Account statement | "Bonus" option in the Context filter | `GET /users/me/transactions` with `context=Bonus` | [Module 4 › Account statement](../04-reports/account-statement.md) |
| Footer (every page) | "Bonus Rule:" and a fixed sentence about turnover before withdrawing a bonus | Translation text only, no API | `components/Footer.tsx:29-32`; `public/locales/en/common.json:75-76` |

The footer sentence is static text. Whether the backend applies the rule it states is not visible in the frontend (Q-62).

## Filters

| Filter | Options | Sent as | Applied | Resets page | Source |
|---|---|---|---|---|---|
| Category | ALL, JOINING, DEPOSIT, REFERRAL | `category` = `JoiningBonus`, `DepositBonus`, `ReferralBonus` (left out for ALL) | at once | **no** | `index.tsx:38-43,128-138` |
| From / To | Date and time pickers (`DD/MM/YYYY HH:mm`, 15-minute steps) | `fromDate`, `toDate` as `toISOString()` | on **Go** | yes | `index.tsx:141-152,88-99`; `components/common/DatePickerInput.tsx:21-47` |
| Reset | Puts category, dates and search back to the defaults | — | at once | yes | `index.tsx:101-111` |
| Search ("Search Bonus") | Free text, bonus name | `search` (left out when empty) | 500 ms after typing stops | yes | `index.tsx:113-118,185-190`; `utils/index.ts:14-23` (`debounce`) |
| Page size | 25, 50, 100 (top) and 10, 25, 50, 100 (bottom) | `limit` (default 25) | at once | yes | `index.tsx:194-201,335-346` |

**Default range: 25 days back from the start of that day, to the end of today.** The applied values start as `dayjs().subtract(25, 'day').startOf('day')` and `dayjs().endOf('day')`. The From and To boxes, however, show the current time on both dates, not 00:00 and 23:59 (`index.tsx:47-52`, [F3](#findings)). **Go** applies the exact minutes in the boxes. It does not check that From is before To.

The request also sends `userId: Number(profile.id)` and waits until the profile has loaded (`skip: !user?.id`) (`index.tsx:44,61-72`). See [B1](api-inventory.md#b1-getbonusapplicants).

## Columns

| Column | Value | Display rule | Source |
|---|---|---|---|
| # | position | `(page − 1) × limit + row + 1` | `index.tsx:266-268` |
| Bonus Name | `bonus.name` | Name, with `awardedAt` as `DD/MM/YYYY` underneath (`-` when empty) | `index.tsx:269-276` |
| Bonus ID | `bonus.id` | as is | `index.tsx:277-279` |
| Category | `bonus.category` | Raw value (for example `JoiningBonus`), not the translated filter label | `index.tsx:280-282` |
| Awarded Amount | `awardedAmount` | Raw number, no formatting or currency | `index.tsx:283-285` |
| Turnover (Completed / Required) | `turnoverCompleted`, `turnoverRequired` | `completed / required`, raw numbers | `index.tsx:286-288` |
| Installments | `bonus.installments` | A button that opens the instalment rows when `bonus.installments > 1` and the row has an `installments` list; otherwise plain text | `index.tsx:289-300` |
| Awarded At | `awardedAt` | `D/M/YYYY`, local time; `-` when empty | `index.tsx:301-303` |
| Expire At | `expireAt` | `D/M/YYYY`; `-` when `null` | `index.tsx:304-306` |
| Status | `status` | Coloured text (below). `REJECTED` is clickable and opens the reason modal | `index.tsx:307-316,15-34,80-85` |

Status colours (`getStatusColor`, `index.tsx:15-34`): `CLAIMED` blue, `ACTIVE` green, `PENDING` yellow, `EXPIRED` red, `REJECTED` dark red, `APPROVED` green, `COMPLETED` emerald, anything else grey. The type also allows `CANCELLED` (`types/bonus.ts`, `BonusApplicantStatus`), which shows grey.

While the request is loading **or refetching**, the table shows skeleton rows (`isLoading || isFetching`, `index.tsx:246-255`). An empty result shows "No data available".

## Instalments

`pages/BonusStatement/components/InstallmentDropdown.tsx` (`InstallmentRows`). Clicking the Installments button opens one bonus's rows; clicking it again, or another bonus's button, closes it (only one open at a time, `index.tsx:76-78`).

| Field | Display | Source |
|---|---|---|
| Installment No | `installmentNo` | `InstallmentDropdown.tsx:76-81` |
| Amount | `₹` + `amount` with 2 decimals (currency sign is fixed in the code) | `:84-89` |
| Total Turnover Required | Running total, see below | `:56-63,92-99` |
| Release Date | `releaseDate` as `dd/MM/yyyy hh:mm a`; `-` when `null` | `:102-111` |
| Status | Badge. Same colours as the main table, except `ACTIVE` has no colour here (grey). `REJECTED` opens the reason modal | `:30-47,113-123` |

### Calculation: Total Turnover Required per instalment

`OBSERVED` (`InstallmentDropdown.tsx:56-63`):

```
share       = turnoverRequired / number of instalment rows
row k value = share × k            (k = 1 … number of rows), shown with 2 decimals
```

Example: `turnoverRequired` 3000 and three instalment rows show 1000.00, 2000.00, 3000.00.

- The divisor is the length of the `installments` list in the response, not `bonus.installments`.
- The frontend assumes the turnover is split **equally** across instalments. The response has no per-instalment turnover field. Whether the backend uses the same split is `BACKEND CONFIRMATION REQUIRED` (Q-62).

### Rejection reason

Clicking a `REJECTED` status (bonus or instalment) opens `ReasonModal` with `rejectReason`, or "No reason provided" when it is empty (`index.tsx:80-85`; `InstallmentDropdown.tsx:49-54`). The modal closes with Escape or the Close button and locks page scroll while open (`pages/BonusStatement/components/ReasonModal.tsx:14-25`, `ReasonModal`).

## Findings

All `OBSERVED` from source unless labelled.

| # | Finding | Where |
|---|---|---|
| F1 | **The browser sends `userId`** from the profile. Whether the backend limits results to the token's own user is not visible in the frontend (Q-62) | `index.tsx:65` |
| F2 | `Number(user.id)`: if a user id is not numeric, the request sends `NaN` (`INFERRED`; the profile types `id` as a string) | `index.tsx:65`; `store/api/userApi.ts:20` |
| F3 | **The default From and To boxes show the current time**, but the applied range is start of day 25 days ago to end of today. Pressing Go without changes narrows the range to the times shown | `index.tsx:47-52,88-99` |
| F4 | **Category does not reset the page.** On page 3, choosing a category with one page of results shows an empty table | `index.tsx:130` |
| F5 | **Reset does not clear the search box.** The input is uncontrolled, so the typed text stays while `search` is cleared | `index.tsx:110,185-190` |
| F6 | **Two page-size controls with different options** (25/50/100 at the top, 10/25/50/100 at the bottom) | `index.tsx:194-201,335-346` |
| F7 | Go does not check that From is before To | `index.tsx:88-99` |
| F8 | Category, amounts and turnover are shown raw: no translation of the category and no number formatting, while instalment amounts use `₹` and 2 decimals | `index.tsx:280-288`; `InstallmentDropdown.tsx:88` |
| F9 | Instalment turnover is an equal split computed in the browser (see [Calculation](#calculation-total-turnover-required-per-instalment)) | `InstallmentDropdown.tsx:56-63` (Q-62) |
| F10 | The footer's bonus rule is static translation text, shown on every page whatever the backend rule is | `Footer.tsx:29-32` (Q-62) |
| F11 | Response fields not shown: `triggerEvent`, `timesClaimed`, `timesRejected`, `bonus.releaseType`, `createdAt`, `user` | `types/bonus.ts` (`BonusApplicantItem`) |
| F12 | Menu says "Bonus History", the page title says "Bonus Statement" | `utils/constants.ts:364`; `common.json:728` |

Questions raised: Q-62, Q-63 in [open-questions.md](../../../inventory/open-questions.md).
