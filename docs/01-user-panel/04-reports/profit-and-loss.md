# Module 4: Profit & loss

Route `/profit-loss` → `pages/Reports/BetProfitLoss.tsx` (`BetProfitLoss`). Page title "Profit Loss". rsplay `@810884b`; paths relative to `src/`. Shared date, Go/Reset and paging behaviour: [overview](overview.md#the-shared-page-pattern). This page has **no search** (it is commented out, `BetProfitLoss.tsx:172-180`) and **no export**.

API: [S5 `getProfitLoss`](api-inventory.md#s5-getprofitloss), called **twice**.

## Filters and the two requests

| Filter | UI values | Sent as | When |
|---|---|---|---|
| Sport | Cricket, Football, Tennis, Greyhound, Horse Racing, Casino. **No "All"** | `sport` = `Cricket`, `Soccer`, `Tennis`, `Greyhound`, `HorseRacing`, `Casino`. Default `Cricket` | On Go, page → 1 |
| From / To | Default: display `now − 2 days` / `now`; applied start of that day / end of today | `fromDate`, `toDate` (UTC ISO) | On Go or Reset |
| Page, size | 1…, 25/50/100 | `page`, `limit` | On change |

| Call | Arguments | Used for | Source |
|---|---|---|---|
| Table | `{ page, limit, sport: appliedSport, fromDate, toDate }` | rows, `filteredProfitLoss` (Total row), `pagination` | `BetProfitLoss.tsx:36-43` |
| Header total | `{ page: 1, limit: 1, sport: 'Cricket', fromDate, toDate }` | `totalProfitLossAllSports` only | `BetProfitLoss.tsx:45-53` |

The code comment says the second call exists so the all-sports total "isn't tied to the table's own page/limit or sport filter". It still sends `sport: 'Cricket'`. **Team-confirmed (Q-29, 2026-11-19):** every response carries both `filteredProfitLoss` (selected sport) and `totalProfitLossAllSports` (all sports, whatever `sport` is sent), so the header figure is all-sports and the second call is redundant. Confirmed fix: read it from the table response (F6). Both calls use the same applied dates, so the header total follows the date filter.

## The two totals

| Where | Label | Value | Colour |
|---|---|---|---|
| Filter row chip | "P&L" | `Number(totalsData.totalProfitLossAllSports ?? 0).toFixed(2)` | green `#64b000` if ≥ 0, else red (`BetProfitLoss.tsx:161-170`) |
| Last table row | "Total" | `Number(data.filteredProfitLoss ?? 0).toFixed(2)` | green if ≥ 0, else red (`BetProfitLoss.tsx:281-293`, `325-337`) |

Both are computed by the backend. `INFERRED`: `filteredProfitLoss` covers the whole filtered range, not only the rows on the current page.

## Table: sports (any sport except Casino)

Three columns, `BetProfitLoss.tsx:297-323`:

| Column | Field read | Display |
|---|---|---|
| Sport | `sport ?? sportName` | |
| Market Name | `marketName` | |
| Amount | first of `payout`, `pl`, `amount` | 2 decimals; `-` when 0; no colour |

Each row is one record from `bets`. Whether a row is one market or one bet is `BACKEND CONFIRMATION REQUIRED` (response type `ProfitLossItem` allows both).

## Table: Casino

When the applied sport is `Casino` the page switches to seven columns (`BetProfitLoss.tsx:60-68,250-279`). Rows are `CasinoProfitLossItem` records (`betReportApi.ts:39-53`).

| Column | Value |
|---|---|
| Sport/Game | fixed text "Casino" |
| Event Name | `-` (always) |
| Market | `-` (always) |
| Result | `status` (`Won`, `Lost`, `Pending` per type) |
| Gamename | `gameName` |
| P/L | `totalWins − totalBets`, 2 decimals, green if > 0, red if < 0, `-` if 0 |
| Started Date | `createdAt` as `DD MMM YYYY, hh:mm a` |

The P/L formula is the same as [Casino bet history](casino-bet-history.md#pl-formula).

## Pagination

The page shows pagination even though, per the source comment, "the reference website dont have pagination in this table" (`BetProfitLoss.tsx:344-356`). Skeletons show 8 rows (not `limit`) while loading.
