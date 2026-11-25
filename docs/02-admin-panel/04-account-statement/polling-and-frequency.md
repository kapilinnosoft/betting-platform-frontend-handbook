# Admin Module A4: Account Statement (polling and frequency)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`.

**Nothing on this page polls.** Neither query sets `pollingInterval`, and the page has no `setInterval` or socket (`OBSERVED`). The layout's polls (unread notifications 10 s, profile 20 s, wallet 20 s) still run. See [A1 polling](../01-login-and-layout/polling-and-frequency.md).

## When each request runs

| Request | When it runs | Source |
|---|---|---|
| `GET /users/me/transactions` | Page open (Deposit/Withdraw is the default tab); switching back to this tab; Context or Type change; search 500 ms after typing stops; date picker closed; page or size change; Refresh (after 500 ms) | `pages/RoleWiseAccountStatement/index.tsx:54-74,225,260-264` |
| `GET /users/transactions/game-transactions` | Switching to Game Transaction; then the same filter, page and Refresh changes | `index.tsx:76-83` |
| `POST /users/transactions/export-userTransaction` | Excel, PDF or CSV click, when the current page has rows | `index.tsx:228-250` |

## Cache behaviour

- `refetchOnMountOrArgChange: true` and `keepUnusedDataFor: 0` (`store/api/apiSlice.ts:40-41`): opening the page always sends a new request, and the inactive tab's data is dropped as soon as the tab changes. Switching back refetches.
- `getMyTransactions` adds `t: Date.now()` inside the query function, so it is not part of the cache key. `getGameTransactions` adds no cache-buster.
- A tab switch resets filters and the page **and** changes the active query, so it sends exactly one request for the new tab.
- No mutation invalidates these queries. An export does not refresh the table.

## Request volume

| Action | Requests |
|---|---|
| Open the page | 1 (`/users/me/transactions`) |
| Switch tab | 1 |
| Change one filter, the page or the page size | 1 |
| Type in search | 1, 500 ms after the last keystroke |
| Press Refresh | 1 (after 500 ms) |
| Export | 1 `POST` |
