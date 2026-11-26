# Admin Module A4: Account Statement (API inventory)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. Response shapes come from the TypeScript types in `types/accountStatement.ts` and the fields the page reads, not from captured responses.

## Summary

| # | Name | Request | Parameters sent | When it runs | Repeats | Consumer |
|---|---|---|---|---|---|---|
| AS1 | `getMyTransactions` | `GET /users/me/transactions` | `t`, `page`, `limit`, and when set: `search`, `fromDate`, `toDate`, `context`, `type` | Deposit/Withdraw tab: open, filter, search, date, page, Refresh | once per argument set | `pages/RoleWiseAccountStatement/index.tsx:72-74` |
| AS2 | `getGameTransactions` | `GET /users/transactions/game-transactions` | `page`, `limit`, `search` (always, may be empty), and when set: `fromDate`, `toDate`, `context`, `type` | Game Transaction tab: same | once per argument set | `index.tsx:81-83` |
| AS3 | `exportAccountStatement` | `POST /users/transactions/export-userTransaction` (query parameters, no body) | `exportFormat`, `timezone`, and when set: `context`, `type`, `fromDate`, `toDate` | Excel / PDF / CSV click (both tabs) | once per click | `index.tsx:227-241` |

---

## AS1 `getMyTransactions`

`store/api/commonApi.ts:134-155`. `GET /users/me/transactions`. No cache tags.

The query function copies only the parameters that are set: `page` and `limit` when defined; `search`, `fromDate`, `toDate`, `context`, `type`, `walletType`, `recordType` when truthy. It always adds `t: Date.now()` (cache-busting, design intent as Q-06). This page never sends `walletType` or `recordType`.

| Parameter | Value from this page |
|---|---|
| `page`, `limit` | current page; page size 10 / 25 / 50 / 100 |
| `search` | debounced search text (omitted when empty) |
| `fromDate`, `toDate` | `dayjs(from).startOf('day').toISOString()`, `dayjs(to).endOf('day').toISOString()` |
| `context` | Deposit, Withdrawal, Bonus or CoinConversion |
| `type` | Debit or Credit |

Example (sanitised):

```
GET /users/me/transactions?t=1764050000000&page=1&limit=10&fromDate=2026-11-18T18:30:00.000Z&toDate=2026-11-25T18:29:59.999Z&context=Deposit
```

Response `TransactionsResponse` (`types/accountStatement.ts:1-29`): `data: Transaction[]`, `pagination { currentPage, totalPage, totalItems, limit }`.

| Field | Shown as |
|---|---|
| `id` | Transaction Id (number-formatted, see [F3](overview.md#findings)) |
| `timestamp` | Transaction Time |
| `narration` | Description |
| `type` | Type badge, Amount sign and colour |
| `amount` | Amount |
| `context` | Context |
| `status` | Status badge |
| `availableBalance` | Balance |
| `fromAccount`, `toAccount` | From/To (read by the page but not declared in the type) |
| not read | `walletId`, `entityId`, `meta`, `nonce`, `remark`, `isCommissionSettled`, `currencyId` |

The User Panel calls the same path for the player's own statement ([User Panel Module 4 S1](../../01-user-panel/04-reports/api-inventory.md#s1-getmytransactions)). The two frontends send different parameters. Whether the backend scopes the admin call differently by role is `BACKEND CONFIRMATION REQUIRED` (Q-56).

## AS2 `getGameTransactions`

`store/api/commonApi.ts:157-164`. `GET /users/transactions/game-transactions`. The page's parameter object is passed as is: undefined values are dropped by RTK Query, but `search` is always sent, including as an empty string. No `ts`. Tags are commented out.

| Parameter | Value from this page |
|---|---|
| `page`, `limit` | as AS1 |
| `search` | debounced search text, `''` when empty |
| `fromDate`, `toDate` | as AS1 |
| `context` | Won, Lost, Rollback or Bet |
| `type` | Debit or Credit |

Response `GameTransactionsResponse` (`types/accountStatement.ts:47-77`): `success`, `message`, `transactions: GameTransaction[]`, `pagination`.

| Field | Shown as |
|---|---|
| `id`, `timestamp`, `narration`, `type`, `amount`, `context`, `status`, `availableBalance` | as AS1 |
| `username` | Player |
| not read | `entityId`, `meta`, `fromAccount`, `toAccount` (From/To is hidden on this tab), `userId`, `walletType` |

The type declares `status: 'confirmed'` only (`types/accountStatement.ts:57`).

## AS3 `exportAccountStatement`

`store/api/ExportApi.ts:590-622`. `POST /users/transactions/export-userTransaction`. Every value goes in the query string; there is no body. Each parameter is added only when truthy. No cache tags.

| Parameter | Value from this page |
|---|---|
| `exportFormat` | `Excel`, `Pdf` or `Csv` (the header button name) |
| `timezone` | `Intl.DateTimeFormat().resolvedOptions().timeZone`, for example `Asia/Kolkata` |
| `context`, `type` | as the active filters (omitted for ALL) |
| `fromDate`, `toDate` | the applied range's raw `Date` objects, serialised with `Date.toString()` (see [export](overview.md#export)) |
| not sent by this page | `search`, `page`, `limit`, `walletType`, `recordType`, `userId` |

Response `ExportResponse` (`types/index.ts:1823-1828`): `exportId`, `message`, `status` (`Pending` / `Completed` / `Failed`), `success`. The page reads `success` and `message` only.

The Downline account-details tabs call the same request for a member ([A3 DL26](../03-downline/api-inventory.md#dl26-exports-from-account-details)).

## Defined but not used

| Name | Request | Note |
|---|---|---|
| `exportGameAccountStatement` | `POST users/transactions/export-game-transactions` | Same parameters as AS3. Not used anywhere (team, Q-55). No file calls `useExportGameAccountStatementMutation` at HEAD (`ExportApi.ts:789-821,847`). See Q-55 |
