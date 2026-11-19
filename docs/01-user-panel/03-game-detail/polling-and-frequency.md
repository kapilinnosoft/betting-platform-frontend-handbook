# Game Detail (polling and frequency)

Global RTK Query behavior and the intentional 1 s / 2 s rates are summarized in the [polling inventory](../../../inventory/polling-and-frequency-inventory.md#global-facts-both-repos). This page records the Game Detail consumers.

| Data | Request | Frequency / trigger | Conditions and effect |
|---|---|---|---|
| Catalogue markets | `GET /catalogue/:eventId` | 1 s for in-play events; 2 s otherwise in the live-aware hook. Another market page uses a fixed 1 s poll. | `useCatalogData` updates its interval from the returned `inplay` flag; catalogue rows, prices and market status refresh. (`src/pages/GameDetails/Hooks/useCatalogData.ts:20-33,111-113 (useCatalogData)`, `src/pages/Markets/index.tsx:21-25 (Markets)`) |
| Scorecard / media URLs | `GET events/scorecard/:eventId` | On mount, no polling | Skipped for no event id, demo users, and guests (`src/pages/GameDetails/Hooks/useCatalogData.ts:27-29 (useCatalogData)`). Canonical media docs are Modules 5-6. |
| Bookset / exposure | `GET /exposure/bookset/calculation?eventId=...&t=...` | On mount/args change; no `pollingInterval` set | Skipped without authentication or event id; bet mutations invalidate book tags and cause refresh (`src/hooks/useMarketExposureData.ts:8-21 (useMarketExposureData)`, `src/store/api/betPlaceApi.ts:13-20 (placeBet)`, `src/store/api/betApi.ts:207-231 (getBookset, betPlace)`). |
| Stake buttons | `GET /stakeset?t=...` | On subscription, no polling | Used to populate slip increments; one implementation falls back to local defaults if the response has no stakes (`src/hooks/useBetSlip.ts:32-36 (useBetSlip)`, `src/components/Betslip.tsx:21-22,188-199 (Betslip)`). |
| Bet placement | `POST /bet/place` | User action only | Mutation invalidates bet/book tags; this is not polling (`src/store/api/betPlaceApi.ts:13-20 (placeBet)`, `src/store/api/betApi.ts:213-231 (betPlace)`). |

`Date.now()` is an intentional cache-buster for bookset and stake GET requests; it is not an interval (`src/store/api/booksetApi.ts:36-42 (getBooksetCalc)`, `src/store/api/stakesApi.ts:25-31 (getStakeSet)`, `src/store/api/betApi.ts:207-212,232-240 (getBookset, getStakes)`).