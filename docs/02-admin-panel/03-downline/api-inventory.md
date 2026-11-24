# Admin Module A3: Downline (API inventory)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. Every request goes through the single `apiSlice`. Most queries add `ts=<Date.now()>` (the cache-buster, design intent as in Q-06). Response shapes come from TypeScript types and the fields the pages read; no live responses were captured.

## Summary

| # | Name | Request | When it runs | Consumer |
|---|---|---|---|---|
| DL1 | `getMembers` | `GET users/me/sub-users` | level list open, filters, page; Settlement | `AllDownlineListing.tsx`, `Settlement/useSettlementHook.ts` |
| DL2 | `getSummary` | `GET /users/summary` | level list and drill-down open | `AllDownlineListing.tsx`, `SubUsers.tsx` |
| DL3 | `getSubMembers` | `GET /users/sub-users/{memberid}` | drill-down open, tab, filters, page | `SubUsers.tsx` |
| DL4 | `addMember` | `POST /users/sub-user` | Create submit | `Modal/CreateMember.tsx` |
| DL5 | `deposit` | `POST users/{userId}/wallets/deposit` | D submit | `components/common/DepositWithdraw.tsx` |
| DL6 | `withdraw` | `POST users/{userId}/wallets/withdraw` | W submit | same |
| DL7 | `depositCoin` | `POST /coin/deposit/{userId}` | Coin › Deposit | `Modal/CoinDepositWithdraw.tsx` |
| DL8 | `withdrawCoin` | `POST /coin/withdraw/{userId}` | Coin › Withdraw | same |
| DL9 | `getSportPermission` | `GET /sports-permission/{userId}` | Sport Permission opened | `Modal/SportPermission.tsx` |
| DL10 | `updateSportPermission` | `PUT /sports-permission/{userId}` | Sport Permission submit | same |
| DL11 | `changeStatus` | `PATCH /users/change-status/{userId}` | Change Status submit | `Modal/ChangeStatus.tsx` |
| DL12 | `changeUserAccess` | `PATCH /users/change/{userId}` | New User Access confirm | `Modal/UserAccessConfirm.tsx` |
| DL13 | `getLoginAsToken` | `GET /auth/gettoken/{userId}` | Login As | canonical [A1 L11](../01-login-and-layout/api-inventory.md#l11-getloginastoken) |
| DL14 | `getAccountSummary` | `GET /users/account/summary/{memberid}/{uplineId}` | Account Summary open | `AccountDetails/AccountSummary.tsx` |
| DL15 | `membersChangePassword` | `PATCH /admin/users/password/{id}` | Change Password submit | `Modal/PasswordChange.tsx` |
| DL16 | `getTransactionHistory` | `GET users/transactions/deposit-withdraw/{userId}` | Transaction History tab | `AccountDetails/TransactionHistory.tsx` |
| DL17 | `getAccountStatement` | `GET /users/transactions/all` | Account Statement tabs | `AccountDetails/AccontSatatementTransection/*` |
| DL18 | `getUserBetList` | `GET /reports/bet` | Bet List › Sports; market bet list | `BetHistoryDetails/UserSportsBets.tsx`, `BettingPlDetails/ParticularSportBets.tsx` |
| DL19 | `getUserCasinoBetList` | `GET reports/casino-bet` | Bet List › Casino | `BetHistoryDetails/UserCasinoBets.tsx` |
| DL20 | `getUserPlbyEvent` | `GET /reports/event/profitloss` | Betting Pnl tabs | `BettingPlDetails/SportsPL.tsx`, `CasinoPl.tsx` |
| DL21 | `getPlbyMarketUsers` | `GET reports/market/profitloss/{eventId}/{memberid}` | expanding an event in Sports P&L | `BettingPlDetails/SportsPL.tsx` |
| DL22 | `getLoginHistory` | `GET activity-log/{userId}` | Activity Log tab | `AccountDetails/ActivityLog.tsx` |
| DL23 | `getCompetitions` | `GET /competitions?sport=` | sport chosen in Bet List | `UserSportsBets.tsx`, `ParticularSportBets.tsx` |
| DL24 | `getEventByCompetitionId` | `GET /events?competitionId=` | competition chosen | same |
| DL25 | `settlement` | `POST /users/{loggedInUserId}/wallets/settlement` | Settlement submit | `Settlement/modal/SettlementModal.tsx` |
| DL26 | exports | several `POST` (below) | export buttons | account-details tabs |

---

## DL1 `getMembers`

`store/api/DownlineApi.ts:28-69`. Provides `Members`.

| Param | Level list | Settlement |
|---|---|---|
| `rollId` | role id from the URL | — |
| `level` | `1` | `1` |
| `username` | debounced search | search (not debounced) |
| `status` | `Active`/`Inactive`/`BetLock`/`Suspended` (All → omitted) | — |
| `fromDate`, `toDate` | after Apply | — |
| `page`, `limit` | yes | yes |
| `settlement` | — | `true` |

Only truthy values are sent (`:55-66`). Response `MembersResponse` (`types/index.ts:486-492`): `downlineUsers: Member[]`, `pagination.totalItems`, `summary`. The `summary` in this response is not used. The strip uses DL2 instead (`AllDownlineListing.tsx:108`, commented). For the `Member` fields shown, see [member listing](member-listing.md).

## DL2 `getSummary`

`DownlineApi.ts:311-340`. `GET /users/summary`. It accepts `username`, `page`, `limit`, `rollId`, `level`, dates and `status`, but both callers pass `{}`, so only `ts` is sent. Provides `BalanceSummaryDataApi` (invalidated by deposit, not by withdraw). The `summary` object is shown by `components/common/BalanceSummary.tsx:10-16`:

| Label | Field |
|---|---|
| Total Balance | `totalBalance` |
| Total Avail. bal. | `availableBalance` |
| Total Exposure | `exposure` (red) |
| Balance (Downline) | `downlineBalance` |
| Total Users Balance | `playerBalance` |

This endpoint is different from the Dashboard's `GET /dashboard/balance-summary` ([A2 D1](../02-dashboard/api-inventory.md#d1-getbalancesummary)), although the labels are similar.

## DL3 `getSubMembers`

`DownlineApi.ts:125-167`. `GET /users/sub-users/{memberid}` with `rollId` (active tab), `level: 1`, `upline` (from the URL), `username`, `status`, dates, `page`, `limit`. No cache tags. Response `MembersResponse`; the page reads `downlineUsers` and `pagination.totalItems` (`SubUsers.tsx:110-111`).

## DL4 `addMember`

`store/api/commonApi.ts:12-33`. Body `{ username, mobile?, password, roleId, fromAccount, partnership, creditLimit? }`. The type also allows `firstname`, `lastname`, `transactionCode`, which are not sent. Invalidates `Bankers`, `Members`. Details: [create member](create-member.md#request).

## DL5 `deposit` / DL6 `withdraw`

`commonApi.ts:91-106` / `:107-122`. Body `{ amount, fromAccount, toAccount, narration, refernce }`; `userId` goes in the path. Deposit invalidates `BalanceSummaryDataApi`, `Bankers`, `Members`, `Wallet`. Withdraw invalidates `Bankers`, `Members`, `Wallet`. Details: [member actions](member-actions.md#deposit-and-withdraw).

## DL7 `depositCoin` / DL8 `withdrawCoin`

`store/api/coinApi.ts:46-63`. Body `{ amount, fromAccount, toAccount, narration }` (`CoinDepositWithdraw.tsx:62-68`). Invalidates `CoinManagement`, `Wallet`, `Bankers`, `Members`.

## DL9 `getSportPermission` / DL10 `updateSportPermission`

`DownlineApi.ts:229-235` / `:236-246`. GET response `SportPermissionResponse` (`types/index.ts:825-829`): `permission: { permission: { name, allowed }[] } | null`. PUT body `{ data: { name, allowed }[] }` (`UpdateSportPermissionBody`, `types/index.ts:831-834`). PUT invalidates `Members`.

## DL11 `changeStatus`

`DownlineApi.ts:213-221`. Body `{ status }` with one of `Active`, `Inactive`, `Suspended`, `BetLock`. Rows come back with lower-case statuses (`active`, `inactive`, `suspended`, `bet_lock`), mapped in `ChangeStatus.tsx:20-37`. Invalidates `Members`.

## DL12 `changeUserAccess`

`DownlineApi.ts:222-228`. No body. Response `{ success }`. Invalidates `Members`.

## DL14 `getAccountSummary`

`DownlineApi.ts:168-177`. `GET /users/account/summary/{userId}/{path}?ts=`, where `path` is the route's `:uplineId`. From the level list that is the member's upline string. From the drill-down list it is `h` (F3, Q-42). Response `AccountSummaryResponse.accountSummary` (`types/index.ts:634-690`, two merged interface declarations). Fields read: `id`, `username`, `firstname`, `lastname`, `email`, `mobile`, `roleId`, `role.{id,name}`, `wallets[]` (`Main`: `amount`, `exposureAmount`), `uplineMap` (role → username), `upline.roleId`. The whole object is written to `localStorage.accountSummary`.

## DL15 `membersChangePassword`

`commonApi.ts:34-49`. `PATCH /admin/users/password/{id}` with `{ newPassword }`. The role-user path `PATCH /privileges/change-password/{id}` (`store/api/rolesApi.ts:196-211`) is wired in the same modal but not used here.

## DL16 `getTransactionHistory`

`DownlineApi.ts:256-280`. `GET users/transactions/deposit-withdraw/{userId}` with `userId` also as a param, `search`, dates, `page`, `limit`. Page reads `transactions`, `pagination.totalItems` (`TransactionHistory.tsx:53-54`).

## DL17 `getAccountStatement`

`commonApi.ts:61-90`. `GET /users/transactions/all` with `userId`, `recordType` (`Gaming`, `Sports`, `Casino` or `Transaction`), `context` (D/W tab), `search`, dates, `page`, `limit`. Page reads `data`, `pagination.totalItems`.

## DL18 `getUserBetList`

`store/api/DownlineDetailsApi.ts:30-79`. `GET /reports/bet` with `searchByUserId`, `reportType` (`DIRECT` when `:userType === 'd'`, else `HIERARCHY`), `sport`, `competitionId`, `eventId`, `market`, `marketId`, dates, `page`, `limit`. Page reads `bets`, `pagination.totalItems` (`UserSportsBets.tsx:74-75`).

## DL19 `getUserCasinoBetList`

`DownlineDetailsApi.ts:80-117`. `GET reports/casino-bet` with `searchByUserId`, `reportType`, `searchByUserName`, `gameId`, dates, `page`, `limit`.

## DL20 `getUserPlbyEvent`

`DownlineApi.ts:282-310`. `GET /reports/event/profitloss` with `userId`, `gameType` (`SPORTS` / `CASINO`), `searchByEvent`, `sport`, dates, `page`, `limit`. Page reads `eventProfitLoss`, `pagination.totalItems`.

## DL21 `getPlbyMarketUsers`

`store/api/reportsApi.tsx:189-204`. `GET reports/market/profitloss/{eventId}/{memberid}` with `page`, `limit: 20`. Rows are appended for infinite scroll (`SportsPL.tsx:31-60`).

## DL22 `getLoginHistory`

`DownlineDetailsApi.ts:6-29`. `GET activity-log/{userId}` with `userId` also as a param, dates, `page`, `limit`. Provides `Members`. `userId` comes from `localStorage.accountSummary.id` (F4, Q-43).

## DL23 `getCompetitions` / DL24 `getEventByCompetitionId`

`commonApi.ts:124-133` (`GET /competitions?sport=`); `reportsApi.tsx:100-115` (`GET /events?competitionId=`, provides `Event`). Used to fill the Bet List filters.

## DL25 `settlement`

`DownlineApi.ts:341-362`. `POST /users/{userId}/wallets/settlement`. The path id is the logged-in account. Body `{ userIds: number[], allAmount?, remark? }`; `allAmount` and `remark` are dropped when falsy. Invalidates `Members`. Details: [settlement](settlement.md).

## DL26 Exports from account details

All in `store/api/ExportApi.ts`, all `POST`, each starting an export job (the result appears in Export Report History, which is not documented yet).

| Name | URL | Tab |
|---|---|---|
| `exportBetList` | `reports/export-bet/report` (`:62`) | Bet List › Sports, market bet list |
| `exportCasinoBetList` | `/reports/export-casino/bet-report` (`:114`) | Bet List › Casino |
| `exportPlbyEvent` | `/reports/export-event/profit-loss` (`:188`) | Betting Pnl (both) |
| `exportAccountStatement` | `/users/transactions/export-userTransaction` (`:605`) | Account Statement (both) |
| `exportTransactionHistory` | `/users/transactions/deposit-withdraw/export` (`:774`) | Transaction History |
| `exportActivityLog` | `/activity-log/export` (`:575`) | Activity Log |

## Defined for Downline but not reachable

| Name | Request | Why not reachable | Definition |
|---|---|---|---|
| `addCreditRefrence` | `POST /users/{userId}/wallets/give/credit-limit` `{ creditLimit, fromAccount, toAccount }` | Credit edit icons commented out | `DownlineApi.ts:193-211` |
| `getOwnerMfaStatus` | `GET /mfa/owner/status?userId=&role=` | MFA buttons commented out | `DownlineApi.ts:363-369` |
| `disableOwnerMfa` | `POST /mfa/owner/disable` `{ userId, role }` | same | `DownlineApi.ts:370-376` |
| `roleUserChangePassword` | `PATCH /privileges/change-password/{id}` `{ newPassword }` | `isRoleUser` never passed to the modal | `rolesApi.ts:196-211` |
| `getCasinoDetail` | `GET /casino/profit/loss/{userId}` | `/casino-detail` route has no tab | `DownlineApi.ts:178-191` |
| `updateTransactionCode` | `POST users/transaction-code/viewed` | transaction-code flow commented out | `DownlineApi.ts:248-253` |
| `upsertBetLock`, `getDownlineBetStatus` | `/sports-permission/upsert-betlock`, `/sports-permission/downline/bet-status` | used by other admin modules, not Downline (not documented yet) | `DownlineApi.ts:70-124` |

## Check of the team-supplied "Account list flow" list (2026-11-24)

The team pasted an API list for an "Account list flow (`/users`)". rsplay-admin has no `/users` or `/users/add` route; its Downline pages are `/members/…`. The list was checked line by line against rsplay-admin at `12f0054`:

| Listed | In rsplay-admin `@12f0054` |
|---|---|
| `GET /users/me/sub-users` (account list) | ✓ DL1 |
| `GET /users/sub-users/:userId` (drill into downline) | ✓ DL3 |
| `GET /dashboard/balance-summary` (account summary bar) | ✗ for Downline: the strip uses `GET /users/summary` (DL2). `balance-summary` is used on the Dashboard only |
| `POST /users/:userId/wallets/deposit` / `withdraw` (D / W) | ✓ DL5 / DL6 |
| `GET /users/me/wallets` (own balance in the D/W popup) | ✗ in the D/W popup, which shows the member's row values. Used by the layout header and the Settlement popup ([A1 L10](../01-login-and-layout/api-inventory.md#l10-getwallet)) |
| `PATCH /users/exposure-limit/:userId` (L, exposure limit) | `NOT FOUND` |
| `POST /users/:userId/wallets/give/credit-limit` (C) | defined, **not reachable** |
| `PATCH /admin/users/password/:id` (P, account users) | ✓ DL15 (from Account Summary, not a row button) |
| `PATCH /privileges/change-password/:id` (P, role users) | defined, not used by Downline |
| `PATCH /users/change-status/:userId` (S) | ✓ DL11 (one status dialog; no separate "U st / B st") |
| `PATCH /users/:userId/settings` (US, user settings) | `NOT FOUND` |
| `GET` / `PUT /sports-permission/:userId` | ✓ DL9 / DL10 |
| `GET /mfa/owner/status`, `POST /mfa/owner/disable` | defined, **not reachable** |
| `GET /role/available` (account type dropdown) | ✓ endpoint ([A1 L7](../01-login-and-layout/api-inventory.md#l7-availbleroles)), but rsplay-admin has no account-type dropdown: the role comes from the level being listed |
| `POST /users/sub-user` (create) | ✓ DL4 |
| `GET /users/me/sub-users?search=` (header client search) | `NOT FOUND`: no header search; the list sends `username` |

`OBSERVED`: the list also does not match `betx777/betex777-admin@0221735`, which uses `/user-exposure-limit/{userId}` and has no `/users/{id}/settings`. The team confirmed (Q-53) that endpoints missing from the admin panel code are out of scope: the handbook documents only what the admin panel code calls. Endpoints marked `NOT FOUND` are therefore not documented.
