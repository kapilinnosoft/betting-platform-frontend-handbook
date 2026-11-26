# Admin Module A5: Export Report History (API inventory)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. All export endpoints are defined in `store/api/ExportApi.ts`. Response shapes come from `types/index.ts`, not from captured responses.

## Summary

| # | Name | Request | Parameters sent | When it runs | Repeats | Consumer |
|---|---|---|---|---|---|---|
| EX1 | `getAllExports` | `GET /exports/report/me` | `page`, `limit`, `ts`, and when set: `fromDate`, `toDate`, `status`, `search`, `exportFormat` | Page open; search, date, Type, Status, page or size change | once per argument set | `pages/ExportHistory/Export.tsx:40-48` |
| EX2 | export requests (19 in use) | `POST …` (one per report) | `exportFormat`, `timezone`, report filters | Excel / PDF / CSV click on a report page | once per click | see [EX2](#ex2-export-requests-that-feed-this-list) |

---

## EX1 `getAllExports`

`store/api/ExportApi.ts:7-22`. `GET /exports/report/me`. No cache tags.

| Parameter | Value from this page |
|---|---|
| `page`, `limit` | current page; page size 10 / 25 / 50 / 100 (always sent) |
| `fromDate`, `toDate` | applied range, `toISOString()`. Default: now − 6 days … now (page-open time) |
| `status` | `Completed`, `Pending` or `Failed` (omitted for All) |
| `exportFormat` | `Excel`, `Csv` or `Pdf` (omitted for All) |
| `search` | debounced report-name text (omitted when empty) |
| `ts` | `Date.now()` (cache-busting, design intent as Q-06) |

Example (sanitised):

```
GET /exports/report/me?page=1&limit=10&fromDate=2026-11-19T09:30:00.000Z&toDate=2026-11-25T09:30:00.000Z&ts=1764063000000
```

Request type `ExportsParams` (`types/index.ts:1798-1806`). Response `BetReportsResponse` (`types/index.ts:1808-1821`): `data: BetReportItem[]`, `pagination` (`totalItems` is read).

| Field (`data[].*`) | Shown as |
|---|---|
| `name` | Report Name |
| `createdAt` | Date & Time |
| `format` | File Type icon (`Pdf`, `Csv`, otherwise Excel) |
| `status` | Status badge (`Completed`, `Pending`, otherwise red) |
| `attachment` | Download link (only when `Completed`) |
| not read | `id`, `type` |

The User Panel calls the same path for the player's own exports (`getExportReports`, listed as deferred in [User Panel Module 4](../../01-user-panel/04-reports/api-inventory.md)). Whether both panels get the same response is `INFERRED (shared backend template)`.

## EX2 Export requests that feed this list

Every export request is a `POST` with all values in the query string and no body. Each one returns `ExportResponse { exportId, message, status, success }` (`types/index.ts:1823-1828`). The pages documented so far show "File Export Successfully" when `success` is true and an error toast otherwise. Every caller passes a `timezone` (search of each calling file at HEAD) and `exportFormat` (`Excel` / `Pdf` / `Csv`), together with that report's filters.

This table is a registry. Each request's parameters are documented in full in the module that owns its page. Rows marked "not documented yet" belong to modules that have not been approved yet.

| Name | Request | Called from | Documented in |
|---|---|---|---|
| `exportAccountStatement` | `POST /users/transactions/export-userTransaction` (`:590-622`) | Account Statement page (both tabs); Downline account details › Account Statement | [A4 AS3](../04-account-statement/api-inventory.md#as3-exportaccountstatement) |
| `exportActivityLog` | `POST /activity-log/export` (`:552-588`) | Activity Log page; Downline account details › Activity Log | [A6 ST3](../06-settings-and-activity-log/api-inventory.md#st3-exportactivitylog) |
| `exportTransactionHistory` | `POST /users/transactions/deposit-withdraw/export` (`:760-787`) | Downline account details › Transaction History | [A3 DL26](../03-downline/api-inventory.md#dl26-exports-from-account-details) |
| `exportBetList` | `POST reports/export-bet/report` (`:25-82`) | My Reports › Bet List (`hooks/Reporthooks/useBetlist.tsx:31`); Downline account details › Bet List, market bet list | A3 DL26 (Downline use); My Reports not documented yet |
| `exportCasinoBetList` | `POST /reports/export-casino/bet-report` (`:85-130`) | My Reports › Casino Bet List (`useCasinoBetlist.tsx:33`); Downline › Casino bets | A3 DL26; My Reports not documented yet |
| `exportPlbyEvent` | `POST /reports/export-event/profit-loss` (`:161-203`) | My Reports › P/L by Event (`usePlbyEvent.tsx:13`); Downline › Betting Pnl (sports and casino) | A3 DL26; My Reports not documented yet |
| `exportPlDownline` | `POST /reports/export-downline/profit-loss` (`:133-158`) | My Reports › P/L by Downline (`usePlDownline.tsx:21`) | not documented yet |
| `exportPlbyPlayer` | `POST reports/export-player/profit-loss` (`:206-242`) | My Reports › P/L by Player (`usePlbyPlayer.tsx:17`) | not documented yet |
| `exportPlCasinoDownline` | `POST /reports/export-casino/downline` (`:245-271`) | My Reports › Casino P/L by Downline (`useCasinoPlDownline.tsx:16`) | not documented yet |
| `exportPlCasinoPlayer` | `POST /reports/export-casino/player/profit-loss` (`:273-312`) | My Reports › Casino P/L by Player (`useCasinoPlbyPlayer.tsx:16`) | not documented yet |
| `exportDeposit`, `exportWithdraw`, `exportLogin`, `exportSignUp`, `exportActiveUser`, `exportIdleUser` | `POST /bussiness-report/export-{deposit, withdrawal, logins, signups, active-users, idle-users}` (`:316-505`) | My Reports › Business Report (`hooks/Reporthooks/useBusinessReport.tsx:72-77`) | not documented yet |
| `exportInactiveUser` | `POST users/export-subuser` (`:508-550`) | Inactive members report (`pages/Reports/InactiveMemeber.tsx:58`) | not documented yet |
| `exportDepositWithdrawRequest` | `POST /banker/export-deposit-withdraw` (`:653-710`) | Banking Management › Deposit/Withdraw requests (`hooks/Bankerhooks/useDwRequest.tsx:32`) | not documented yet |
| `exportBonusStatement` | `POST /bonuses/export-statement` (`:712-758`) | Bonus Management › Bonus Statement (`pages/Bonus/Statement.tsx:36`) | not documented yet |

`/bussiness-report` is spelled this way in the code.

### Defined but not used

| Name | Request | Note |
|---|---|---|
| `exportGameAccountStatement` | `POST users/transactions/export-game-transactions` (`:789-821`) | No caller; not used anywhere (team, Q-55). The Account Statement Game Transaction tab uses `exportAccountStatement`, which is the export in use |
| `exportAffiliateList` | `POST /affiliate/export-list` (`:624-651`) | No caller at HEAD |
