# Module 4: Reports (polling and frequency)

rsplay `@810884b`; paths relative to `src/`.

**There is no polling in the four reports.** None of the report hooks sets `pollingInterval` or `refetchOnMountOrArgChange`, and the pages use no `setInterval` or socket (`OBSERVED`, search at HEAD). Data changes only when the user changes a filter or page, or when RTK Query's cache rules apply. The always-on layout calls still run on these pages because they sit inside `HomeLayout`: `/fixture/counts` every 2 s, `/users/me/wallets` every 5 s, `/system` and alerts every 30 s. See [polling inventory › rsplay](../../../inventory/polling-and-frequency-inventory.md#always-on-polling-every-page-under-homelayout).

## When each report request runs

| Request | Class | Runs when | Source |
|---|---|---|---|
| `GET /users/me/transactions` | `ON_MOUNT`, `ON_STATE_CHANGE`, `ON_INTERACTION` | Page opens; context change (immediate); search 500 ms after typing stops; Go; Reset; page or size change | `AccountStatement.tsx:45-52` |
| `POST /users/transactions/export-userTransaction` | `ON_INTERACTION` | CSV or PDF click (buttons disabled while running) | `AccountStatement.tsx:97-112` |
| `GET /bet/history` (`PAST`) | `ON_MOUNT`, `ON_STATE_CHANGE`, `ON_INTERACTION` | Page opens; search 500 ms after typing stops; Go (applies sport and dates); Reset; page or size change | `BetHistory.tsx:35-46` |
| `POST /bet/export-history` | `ON_INTERACTION` | CSV or PDF click | `BetHistory.tsx:87-103` |
| `GET /bet/profit-loss` ×2 | `ON_MOUNT`, `ON_STATE_CHANGE`, `ON_INTERACTION` | Page opens (both); Go or Reset (both, new dates); page or size change (table call only) | `BetProfitLoss.tsx:36-53` |
| `GET /casino/round/history` | `ON_MOUNT`, `ON_STATE_CHANGE`, `ON_INTERACTION` | Page opens; Go; Reset; page or size change | `CasinoBetHistory.tsx:25-30` |

## Cache behaviour worth knowing

`INFERRED` from RTK Query 1.9.7 defaults (`keepUnusedDataFor` 60 s; no override in `apiSlice.ts`):

- **Re-opening a report shows cached data.** The default applied range is start of day / end of day, so it is the same on every visit that day. Opening a report again within 60 s of leaving it reuses the cached result with **no** new request. After 60 s the entry is gone and the page refetches.
- **Go with unchanged dates.** If the applied values do not change (for example Reset twice), the arguments are identical and no request is sent.
- **Go with the default displayed dates** changes the range (F2), so it does send a request.
- **After placing a bet.** `placeBet` invalidates `BetPlace` (`store/api/betPlaceApi.ts:19`). Bet history and P&L entries that are open refetch; cached entries with no subscriber are removed, so the next visit fetches fresh data. Account statement and casino history have no tags and are not affected.
- **`isFetching` shows skeletons.** Every page change or filter refetch replaces the table with skeleton rows until the response arrives.

## Request volume

| Action | Requests |
|---|---|
| Open Account statement, Bet history or Casino bet history | 1 |
| Open Profit & loss | 2 (table + total) |
| Typing "abc" quickly into a search box | 1 (debounced) |
| First Go on P&L (any change) | 2: the applied dates switch from start/end of day to the displayed times (F2), so both calls get new arguments |
| A later Go on P&L after changing only the sport | 1 (table only; the total call's arguments are unchanged) |
