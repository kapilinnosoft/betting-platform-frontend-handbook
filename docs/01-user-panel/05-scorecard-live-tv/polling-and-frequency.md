# Modules 5–7: Scorecard, Live TV and Raw scorecard (polling and frequency)

rsplay `@810884b`; paths relative to `src/`.

| Request | Class | Interval | Runs while | Stops when | Source |
|---|---|---|---|---|---|
| `GET events/scorecard/:eventId` | `ON_MOUNT` | none (once) | Game detail or race detail opens for a logged-in, non-demo user | — | `useCatalogData.ts:27-29`; `RacingInside/index.tsx:29-31` |
| `GET /events/raw-scorecard/:eventId` | `POLLING` | **1 s** | Cricket game detail is open, user logged in and not demo | user leaves the page, or the API reports no data (`onUnavailable` unmounts the component) | `CustomLiveScoreCard.tsx:35-38` |

The 1 s rate is intentional for live data (team confirmation, Q-03/Q-05). Like all RTK Query polling here, it continues in hidden browser tabs.

## Notes

- **One poll, two components.** The desktop and mobile copies of `CustomLiveScoreCard` are both mounted (F4). They use the same endpoint and argument, so RTK Query keeps **one** cache entry and **one** 1 s timer (`INFERRED` from RTK Query subscription behaviour).
- **No stop at match end.** Polling also runs before the match and after the result while the page is open (F8).
- **No retry after "no data".** After the first empty response the poll stops for the rest of the visit, and the page shows the iframe fallback if the event is in play (F9).
- **URL call is not refreshed.** `getScorecard` has no polling and no `refetchOnMountOrArgChange`. Re-opening the same event within 60 s reuses the cached URLs; after that it fetches again (`INFERRED`, RTK default `keepUnusedDataFor`) (F6).
- **Iframes generate their own traffic.** Once the scorecard or TV iframe loads, all refreshes happen between the iframe and its provider, outside this app's API layer. The scorecard fallback iframe is loaded twice (F4).
- **Load on a cricket game detail page** for a logged-in user: catalogue every 1 s (in play) or 2 s ([Module 3](../03-game-detail/polling-and-frequency.md)), raw scorecard every 1 s, plus the layout polls (2 s, 5 s, 30 s; see [polling inventory](../../../inventory/polling-and-frequency-inventory.md#always-on-polling-every-page-under-homelayout)).
