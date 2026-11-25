# Admin Module A5: Export Report History (polling and frequency)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`.

**Nothing on this page polls, and it has no Refresh button.** `getAllExports` sets no `pollingInterval`, and the page has no `setInterval` or socket (`OBSERVED`). The header is rendered without `onRefresh` (`pages/ExportHistory/Export.tsx:148`). An export's status changes from `Pending` to `Completed` on the server, but the screen shows the new status only after the list is requested again. Team (Q-57, 2026-11-25): a Refresh button will be added; the list is not meant to poll. The layout's polls still run ([A1 polling](../01-login-and-layout/polling-and-frequency.md)).

## When the list is requested

| Event | Request | Source |
|---|---|---|
| Page open | `GET /exports/report/me` for the last 7 days | `Export.tsx:30-48` |
| Search | 500 ms after typing stops (page reset to 1) | `Export.tsx:39,160-163`; `hooks/debounce.tsx` |
| Date picker closed | new range, page 1 | `Export.tsx:169-176` |
| Type or Status change | new filter, same page | `Export.tsx:182-196` |
| Page or page-size change | new page | `Export.tsx:216-226` |

## Cache behaviour

- `refetchOnMountOrArgChange: true` and `keepUnusedDataFor: 0` (`store/api/apiSlice.ts:40-41`): every visit requests the list again. Leaving and reopening the page is currently the only way to refresh it without changing a filter.
- `ts` is added inside the query function, so it is not part of the cache key.
- No export mutation invalidates a tag that `getAllExports` provides (it provides none), so starting an export on a report page does not update this list, even if both are open in different tabs.

## Request volume

| Action | Requests |
|---|---|
| Open the page | 1 |
| Change one filter, the page or the page size | 1 |
| Type in search | 1, 500 ms after the last keystroke |
| Wait on the page | 0 (status does not update) |
