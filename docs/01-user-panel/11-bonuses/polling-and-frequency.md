# Module 11: Bonuses (polling and frequency)

rsplay `@7a89e53`; paths relative to `src/`.

**The Bonus Statement list does not poll.** `getBonusApplicants` sets no `pollingInterval`, and the page has no `setInterval`, socket or Refresh button (`OBSERVED`). The bonus **balance** in the profile drawer comes from the header's 5 s wallet poll. The other layout polls also run here; see [polling inventory › rsplay](../../../inventory/polling-and-frequency-inventory.md#always-on-polling-every-page-under-homelayout).

## When each request runs

| Request | Class | Runs when | Source |
|---|---|---|---|
| B1 `GET /bonuses/applicants/list` | `ON_MOUNT` | Page opens, once the profile id exists | `pages/BonusStatement/index.tsx:61-72` |
| B1 | `ON_STATE_CHANGE` | Category change (at once); Go; Reset; search (500 ms after typing stops); page; page size | `index.tsx:88-118,130,194-201,335-346` |
| B2 `GET /users/me/wallets` | `POLLING` 5 s | Header, every page while logged in | `components/Header.tsx:57-60` |

## Cache behaviour

`INFERRED` from RTK Query defaults: the user app's `apiSlice` does not set `refetchOnMountOrArgChange` or `keepUnusedDataFor` (`store/api/apiSlice.ts:63`), and B1 has no `t` cache-buster. So:

- Reopening the page within about 60 s with the same filters shows the cached list without a new request.
- The default range is computed when the page mounts, so a later visit usually has a different `toDate` and makes a new request.
- Returning to a filter set already loaded in this visit reuses the cached result.

## Request volume

| Action | Requests |
|---|---|
| Open the page | 1 B1 (after the profile loads) |
| Change a filter, the page or the page size | 1 B1 |
| Type in search | 1 B1, 500 ms after the last keystroke |
| Open instalments or a rejection reason | 0 |
| Stay on the page | 0 B1; B2 every 5 s (header) |
