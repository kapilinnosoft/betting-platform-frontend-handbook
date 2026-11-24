# Admin Module A3: Account details

`rsplay/rsplay-admin@12f0054`, paths relative to `src/pages/Downline/AccountDetails/` unless stated otherwise. Route: `/members/:id/sub/:memberid/:userType/:uplineId/<tab>` (`App.tsx:141-209`). `:memberid` is the member being viewed. `:userType` is `d` (direct) or anything else (hierarchy).

## Tab shell (`AccountDetails.tsx`)

| Item | Behaviour | Source |
|---|---|---|
| Tab list | **User** members: Account Summary, Bet List, Betting Pnl, Account Statement, Activity Log. **Agent** members: Account Summary, Transaction History, Activity Log | `AccountDetails.tsx:22-40` |
| How "user or agent" is decided | `summary.role.id === USER role id`, where `summary` is read from `localStorage.accountSummary`, written by the **last** Account Summary load, not from the URL | `AccountDetails.tsx:21,41-44`; `AccountSummary.tsx:79-88` |
| Changing tabs | `navigate(…/{tabId}, { replace: true })` | `AccountDetails.tsx:56-58` |
| Mobile | dropdown instead of tabs | `AccountDetails.tsx:78-92` |
| Back | `navigate(-1)` | `AccountDetails.tsx:62-66` |

`/casino-detail` (`CasinoPanel.tsx`) is routed but has no tab.

## Account Summary

`AccountSummary.tsx`. Request: `GET /users/account/summary/{memberid}/{uplineId}` ([DL14](api-inventory.md#dl14-getaccountsummary)). The response is saved to `localStorage.accountSummary`.

| Block | Shown for | Content | Source |
|---|---|---|---|
| Account Summary | USER members | Main wallet: **Available to Bet** = `amount + exposureAmount`; **Funds Available to Withdraw** = `amount + exposureAmount`; **Current Exposure** = `exposureAmount` | `AccountSummary.tsx:94-99,155-246` |
| Account Details | all | Upline chain: a fixed "OWNER" tile, then each `uplineMap` entry (role → username), then the member | `AccountSummary.tsx:249-286` |
| Profile | all | USER members: Full Name, Email, Phone Number, Domain. Agents: Phone Number, Domain | `AccountSummary.tsx:104-126` |
| Password | all | `******`. "Change Password" appears when `summary.upline.roleId === logged-in role id`, and opens [Change Password](member-actions.md#change-password-from-account-summary) | `AccountSummary.tsx:127,323-353` |

Both "Available to Bet" and "Withdrawable" use the same formula, `amount + exposureAmount`. `INFERRED`: `exposureAmount` is stored as a negative number, so adding it reduces the figure. Which wallet field is the real withdrawable amount (for example `lockedAmount` or `nonWithdrawableAmount`) is `BACKEND CONFIRMATION REQUIRED`. The User Panel had a similar question (Q-34).

"Domain" is a hard-coded staging admin URL, the same for every member (F12, Q-52: confirmed defect; it should come from per-platform environment configuration). A computed `showChangePasswordButton` is never used (`:129-132`).

## Tabs for USER members

| Tab | Component | Request | Filters | Columns |
|---|---|---|---|---|
| Bet List › Sports | `BetHistoryDetails/UserSportsBets.tsx` | `GET /reports/bet` with `searchByUserId={memberid}`, `reportType` DIRECT/HIERARCHY, `sport`, `competitionId`, `eventId`, `market`, `marketId`, page, limit ([DL18](api-inventory.md#dl18-getuserbetlist)) | Sport (Cricket, Soccer, Tennis, Grey hound, Horse Racing) → competitions (`GET /competitions`) → events (`GET /events?competitionId=`) → market | AD, SM, SSM, MA, User, Bet ID, Status, Bet Taken, Bet Settle, Event, Market, Odds Req., Type, Stake, P/L, IP |
| Bet List › Casino | `BetHistoryDetails/UserCasinoBets.tsx` | `GET reports/casino-bet` with `searchByUserId`, `reportType`, page, limit ([DL19](api-inventory.md#dl19-getusercasinobetlist)) | search | AD, SM, SSM, MA, User, Bet ID, Date & Time, Game Name, Game Id, Bet Amount, P/L, Status |
| Betting Pnl › Sports | `BettingPlDetails/SportsPL.tsx` | `GET /reports/event/profitloss` with `gameType: 'SPORTS'`, `userId`, `searchByEvent`, dates, page, limit ([DL20](api-inventory.md#dl20-getuserplbyevent)). Expanding an event loads `GET reports/market/profitloss/{eventId}/{memberid}` (20 per page, infinite scroll) ([DL21](api-inventory.md#dl21-getplbymarketusers)) | event search, date range | Event Name, Stake, Player P/L; markets: Market Name, Stake, Player P/L |
| Betting Pnl › Casino | `BettingPlDetails/CasinoPl.tsx` | `GET /reports/event/profitloss` with `gameType: 'CASINO'` | game search, date range | Event Name (game), Stake, Player P/L |
| Account Statement › Sports Transaction | `AccontSatatementTransection/SportsTransection.tsx` | `GET /users/transactions/all` with `userId`, `recordType` = `Gaming` (All) / `Sports` / `Casino`, `search`, dates ([DL17](api-inventory.md#dl17-getaccountstatement)) | All / Sports / Casino; search | Date/Time, Type, Remark, Credit, Debit, Balance |
| Account Statement › D/W Transaction | `AccontSatatementTransection/DwTransection.tsx` | same endpoint with `recordType: 'Transaction'` and `context` (status dropdown; All → omitted) | dropdown; search | Date/Time, Remark, Deposit, Withdraw, Balance, From/To |
| Activity Log | `ActivityLog.tsx` | `GET activity-log/{summary.id}` (**id from localStorage**, F4) ([DL22](api-inventory.md#dl22-getloginhistory)) | date range | Date/Time, Login Status, IP Address, ISP, City / State / Country, Security, Connection, Action |

Sources: `UserSportsBets.tsx:25-73`; `UserCasinoBets.tsx:25-56`; `SportsPL.tsx:38-41,221-231`; `CasinoPl.tsx:46-58`; `SportsTransection.tsx:30-55`; `DwTransection.tsx:29-52`; `ActivityLog.tsx:26,35-46`.

`ParticularSportBets.tsx` (a bet list for one market, opened from Sports P&L) uses the same `GET /reports/bet` with `marketId`.

## Tabs for agent members

| Tab | Request | Columns |
|---|---|---|
| Transaction History (`TransactionHistory.tsx`) | `GET users/transactions/deposit-withdraw/{memberid}` with `userId`, dates, page, limit ([DL16](api-inventory.md#dl16-gettransactionhistory)) | Date/Time, Deposit by upline, Withdraw by upline, Status, From/To |
| Activity Log | as above | as above |

Source: `TransactionHistory.tsx:27,42-51`.

## Exports

Every tab except Account Summary has Excel / PDF / CSV buttons plus Refresh. Each export is a `POST` that starts a file job. "No Data To Export" is shown when the current page is empty. The buttons need `Users.download` in most tabs (`canDownload && handleExport`). In Transaction History, Casino Bets and the market bet list (`ParticularSportBets`) they are not permission-checked. The Activity Log export sends the browser time zone. Export requests: see [DL26](api-inventory.md#dl26-exports-from-account-details).

## Shared behaviour

- Dates are sent only after **Apply** in the date-range picker (the `appliedRange` pattern used on every tab).
- No tab polls. Each refetches on mount (global `refetchOnMountOrArgChange`), on filter or page change, and on the Refresh icon.
- Default page size is 10 on every tab.
