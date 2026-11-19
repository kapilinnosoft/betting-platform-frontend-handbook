# Module 4: Account statement

Route `/account-statement` → `pages/Reports/AccountStatement.tsx` (`AccountStatement`). rsplay `@810884b`; paths relative to `src/`. The shared date, Go/Reset, search and paging behaviour is described once in the [overview](overview.md#the-shared-page-pattern).

API: [S1 `getMyTransactions`](api-inventory.md#s1-getmytransactions) for the table and [S2 `exportGameTransactions`](api-inventory.md#s2-exportgametransactions) for CSV/PDF.

## Screen layout

| Area | Controls | Source |
|---|---|---|
| Filter row | Context dropdown, From, To, **Go**, **Reset** | `AccountStatement.tsx:122-176` |
| Balance box | "Closing Balance", "Opening Balance" (shows `...` while loading) | `AccountStatement.tsx:179-196` |
| Toolbar | Search box, CSV button, PDF button, page-size selector | `AccountStatement.tsx:200-240` |
| Table | Date, Credit, Debit, Balance, Description | `AccountStatement.tsx:243-361` |
| Footer | `Pagination` | `AccountStatement.tsx:364-375` |

## Filters and the request

| Filter | UI values | Sent as | When it is sent |
|---|---|---|---|
| Context | ALL, Won, Lost, Bonus, Rollback, Deposit, Withdrawal, Casino Bet, Casino Win, Casino Bet Refund, Coin | `context` = `Won`, `Lost`, `Bonus`, `Rollback`, `Deposit`, `Withdrawal`, `CasinoBet`, `CasinoWin`, `CasinoBetRefund`, `CoinConversion`; omitted for ALL | **Immediately** on change, without Go and without resetting `page` (F3) |
| From / To | Default: display `now − 25 days` / `now`; applied start of that day / end of today | `fromDate`, `toDate` (UTC ISO) | On Go or Reset |
| Search | free text | `search`; empty string is dropped by the query builder | 500 ms after the last keystroke; page → 1 |
| Page, size | 1…, 25/50/100 | `page`, `limit` | On change |

Context options: `AccountStatement.tsx:20-32`. Query call: `AccountStatement.tsx:45-52`. What `search` matches is decided by the backend (`NOT CONFIRMED FROM SOURCE`).

Example request (sanitised; dates are illustrative):

```http
GET /users/me/transactions?t=1763540000000&page=1&limit=25&fromDate=2026-10-24T18:30:00.000Z&toDate=2026-11-19T18:29:59.999Z&context=CasinoBet
Authorization: Bearer <access-token>
```

## Table columns

Each row is one `Transaction` (`store/api/transactionApi.ts:3-19`). Mapping at `AccountStatement.tsx:304-357`:

| Column | Value | Rule |
|---|---|---|
| Date | `timestamp` | `dayjs(timestamp).format('D/M/YYYY, h:mm:ss a')` (browser time zone); `-` if missing |
| Credit | `amount` to 2 decimals | only when `type.toLowerCase() === 'credit'`, else `-` |
| Debit | `amount` to 2 decimals | only when `type.toLowerCase() === 'debit'`, else `-` |
| Balance | `availableBalance` to 2 decimals | `0.00` if missing |
| Description | `narration ?? context ?? '-'` | green text, with a copy icon that copies the text and toasts "Copied to clipboard!" |

A row whose `type` is neither credit nor debit shows `-` in both amount columns. Before the rows, a pinned **"Closing Balance"** row repeats the closing balance in the Balance column (`AccountStatement.tsx:292-302`).

## Opening and closing balance

`AccountStatement.tsx:56-63`:

```ts
closingBalance = transactions.length > 0 ? Number(transactions[0].availableBalance ?? 0).toFixed(2) : '0.00'
openingBalance = transactions.length > 0 ? Number(transactions[transactions.length - 1].availableBalance ?? 0).toFixed(2) : '0.00'
```

Both figures come from the rows on the current page; with no rows both show `0.00`. Team-confirmed platform-specific requirement (Q-27, 2026-11-19); not analysed further.

## Export

`handleExport` (`AccountStatement.tsx:97-112`) runs on the CSV or PDF button:

1. Calls `triggerExport` with the **applied** filters (`context`, `fromDate`, `toDate`, `search`), `exportFormat` `'Csv'` or `'Pdf'`, and `fileName: account-statement-YYYYMMDD-HHmmss`. `page` and `limit` are not sent, so the export is not limited to the page on screen (`INFERRED`; backend decides).
2. On success, it toasts "Export started. Track its progress in Export Report History." On failure, "Failed to export transactions".
3. Both buttons are disabled while the request is in flight (`isExporting`).

The response body (read as a `Blob`) is not used, so nothing is downloaded here. `INFERRED`: the backend creates the file as a background job and the user downloads it from `/export-report-history` (deferred report, `GET /exports/report/me`). Typed filters that were not applied with Go are **not** used.
