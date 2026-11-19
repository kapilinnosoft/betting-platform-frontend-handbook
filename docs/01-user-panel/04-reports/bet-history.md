# Module 4: Bet history

Route `/bet-history` → `pages/Reports/BetHistory.tsx` (`BetHistory`). rsplay `@810884b`; paths relative to `src/`. Shared date, Go/Reset, search and paging behaviour: [overview](overview.md#the-shared-page-pattern).

API: [S3 `getBetHistory`](api-inventory.md#s3-getbethistory) with `betTime: 'PAST'`, and [S4 `exportBetHistory`](api-inventory.md#s4-exportbethistory). The same endpoint with `betTime: 'CURRENT'` feeds the open-bets list on game detail (`components/common/CurrentBets.tsx:21-33`) and the deferred Unsettled bets report.

Users also land here automatically from a game detail page 1 s after its market closes (`pages/GameDetails/Hooks/useCatalogData.ts:117-123`).

## Filters and the request

| Filter | UI values | Sent as | When it is sent |
|---|---|---|---|
| Sport | All, Cricket, Football, Tennis, Greyhound, Horse Racing | `sport` = `Cricket`, `Soccer`, `Tennis`, `Greyhound`, `HorseRacing`; omitted for All. "Football" is sent as `Soccer` | On **Go** (`appliedSport`), page → 1 |
| From / To | Default: display `now − 15 days` / `now`; applied start of that day / end of today | `fromDate`, `toDate` (UTC ISO) | On Go or Reset |
| Search | free text | `search` | 500 ms after the last keystroke; page → 1 |
| Bet time | fixed | `betTime=PAST` | always |
| Page, size | 1…, 25/50/100 | `page`, `limit` | On change |

Sport options: `BetHistory.tsx:15-22`. Query call: `BetHistory.tsx:35-46`. Go: `BetHistory.tsx:60-65`. What `PAST` includes (settled only, or also voided) is decided by the backend (`NOT CONFIRMED FROM SOURCE`).

Example request (sanitised):

```http
GET /bet/history?page=1&limit=25&betTime=PAST&fromDate=2026-11-03T18:30:00.000Z&toDate=2026-11-19T18:29:59.999Z&sport=Soccer&search=&t=1763540000000
Authorization: Bearer <access-token>
```

Here `params` is spread straight into the request (`betReportApi.ts:105`), so an empty `search=` is sent, unlike the account statement.

## Table columns

Rows are read as `any` (F9). Mapping at `BetHistory.tsx:250-310`:

| Column | Field read | Display |
|---|---|---|
| Date | `placedAt` | `D/M/YYYY, h:mm:ss a`, browser time zone |
| Competition | `competition` → `event.competition` → `sport` → `-` | first non-empty |
| Event | `event.name` | |
| Market | `marketName` | |
| Runner | `selection` | |
| Side | `betOn` lower-cased | "Back" / "Lay"; any other value shown as-is |
| Line | `line` | centred; `-` if missing |
| Rate | `odds` | as received |
| Amount | `amount` | 2 decimals |
| Profit/Loss | **`payout`**: the bet's **net** profit or loss, stake already taken off, can be negative (team-confirmed, Q-28) | 2 decimals (F5) |
| Status | `status` upper-cased | e.g. `WON`; no colour difference |

**Row colour.** Blue (`#8EC5FE`) when `betOn` is `back`, pink (`#FFA0D0`) otherwise, including unknown values (`BetHistory.tsx:254-255`). The `isWon` and `payout >= 0` checks choose between identical classes, so status and P/L have no colour (`BetHistory.tsx:276,296,303`).

## Export

`handleExport` (`BetHistory.tsx:87-103`) mirrors the account statement: applied `fromDate`, `toDate`, `sport`, `search`, `betTime: 'PAST'`, `exportFormat`, `fileName: bet-history-YYYYMMDD-HHmmss`. Toasts "Export started. Track its progress in Export Report History." or "Failed to export bet history". The response is not used. See [account statement › export](account-statement.md#export).
