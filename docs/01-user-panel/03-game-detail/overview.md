# Game Detail (common module)

This module groups the market-detail experience around shared backend paths and user actions. Source aliases, request-field differences, and refresh behavior are noted inline without separating the documentation by project.

## User flow

1. A market-detail page reads an event id and requests `GET /catalogue/:eventId`. The source aliases are `getCatalogueByEventId` and `getMatcheDetails` (`src/apis/catalogueApi.ts:42-62 (catalogueApi.getCatalogueByEventId)`, `src/store/api/sportsApi.ts:229-235 (sportsApi.getMatcheDetails)`).
2. Catalogue data is transformed into normal, fancy/session, and premium market groups. The page renders runner prices and market limits from that data (`src/pages/GameDetails/Hooks/useCatalogData.ts:35-99 (useCatalogData)`, `src/pages/Markets/index.tsx:32-40 (Markets)`).
3. Selecting Back or Lay creates a local bet selection. The slip collects stake/odds changes and submits `POST /bet/place` (`src/types/betPlace.ts:4-19 (BetPlaceRequest)`, `src/types/Bet.ts:3-16 (PlaceBetPayload)`).
4. Authenticated market views request `GET /exposure/bookset/calculation` for existing exposure. The book display adds the current unsent slip's locally calculated exposure (`src/store/api/booksetApi.ts:34-43 (getBooksetCalc)`, `src/store/api/betApi.ts:207-212 (getBookset)`, `src/utils/helper.ts:3-41 (getDeltaExposure)`, `src/utils/index.ts:247-283 (getDeltaExposure)`).

## Shared capabilities

| Capability | API path | Notes |
|---|---|---|
| Catalogue and live prices | `GET /catalogue/:eventId` | Same path; source hook names differ. Refresh is live-aware in one consumer and fixed at 1 s in another. See [API inventory](api-inventory.md) and [polling](polling-and-frequency.md). |
| Place bet | `POST /bet/place` | Same method and path; request type declarations differ in optional fields and `marketType` values. See [bet placement](bet-placement-flow.md). |
| Existing book/exposure | `GET /exposure/bookset/calculation` | Same path and `eventId` query. The query adds `t=Date.now()`; local pending-slip exposure is added to the API result. |
| Stake buttons | `GET /stakeset`, `PUT /stakeset` | Same paths. GET includes a timestamp cache buster; PUT accepts `{ data: [{ label, value }] }`. |
| Fancy/session profit-loss | `GET /exposure/profit-loss` | Same path; the query args vary (`eventId`, `selectionId`, and optionally `marketId`). |

Full request and response notes are in [api-inventory.md](api-inventory.md). Scorecard, TV, and raw-scorecard APIs are listed in the [central registry](../../../inventory/api-inventory.md); their detailed modules are pending.

## Market limits and calculations

Normal market `minBetAmount` and `maxBetAmount` become slip `min` / `max` fields. The other market page reads the market values first and falls back to `betConfig` (`src/pages/GameDetails/Hooks/useCatalogData.ts:49-66 (useCatalogData)`, `src/pages/Markets/components/NormalMarket.tsx:37-40 (NormalMarket)`). These are displayed and used by MIN/MAX controls; do not infer that every client enforces the limits before sending. See [book and calculations](book-calculations.md).

One slip shows an estimated profit computed in the browser (`src/utils/betSlipPL.ts:3-27 (betSlipPL)`). Cashout is also a local calculation that prepares another bet-slip selection; it is not a separate cashout endpoint (`src/pages/GameDetails/Hooks/useCashOut.tsx:184-236 (useCashOut)`, `src/hooks/useCashout.ts:141-182 (useCashout)`). The two cashout candidate sort directions differ; details are recorded in [book and calculations](book-calculations.md).

Response shapes come from source types and the fields read by the UI. No live API captures were made, so these are not independently verified backend schemas.