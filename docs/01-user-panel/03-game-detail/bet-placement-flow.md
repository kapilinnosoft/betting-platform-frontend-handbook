# Game Detail (bet placement flow)

The shared request path is `POST /bet/place`. The request body is formed from the selected market and bet slip state. Examples use sanitized placeholders and are illustrative, not a backend contract.

## Selection to request

1. An odds click selects `eventId`, `marketId`, `marketName`, category/type, runner/selection, rate, bet side, and limits into local state (`src/pages/Markets/components/NormalMarket.tsx:42-73 (handleOddsClick)`, `src/pages/GameDetails/components/NormalRow.tsx (NormalRow)`).
2. The slip edits stake and, where permitted, rate; the displayed min/max values come from catalogue fields (`src/components/BetSlip.tsx:96-128 (BetSlip)`, `src/pages/Markets/components/NormalMarket.tsx:37-40 (NormalMarket)`).
3. Submission calls a POST mutation with the active slip data (`src/hooks/useBetSlip.ts:51-70 (handlePlaceBet)`, `src/components/Betslip.tsx:50-92 (handleBetPlace)`).

## Shared request example

Both mutations target `POST /bet/place`. The common example below shows a normal market request; it is not the complete schema for every market type.

```http
POST ${API_BASE_URL}/bet/place
Content-Type: application/json
```

```json
{
  "eventId": 123,
  "marketId": "<MARKET_ID>",
  "marketName": "Match odds",
  "marketType": "NORMAL",
  "marketCategory": "NORMAL",
  "selectionId": "<SELECTION_ID>",
  "runnerName": "<RUNNER_NAME>",
  "stake": 100,
  "rate": 2.1,
  "fancyPercentage": 0,
  "betOn": "BACK",
  "acceptOddsChange": false
}
```

The type aliases differ: `BetPlaceRequest` has `betOn: 'BACK' | 'LAY'`, includes `fancyPercentage`, and permits `min`/`max`; `PlaceBetPayload` has `betOn: string`, optional `fancyPercentage`, and requires `acceptOddsChange` (`src/types/betPlace.ts:1-19 (BetPlaceRequest)`, `src/types/Bet.ts:3-16 (PlaceBetPayload)`). The slip handler removes `min` and `max` before sending its body (`src/hooks/useBetSlip.ts:51-59 (handlePlaceBet)`). The corresponding endpoint aliases are `placeBet` and `betPlace` (`src/store/api/betPlaceApi.ts:13-20 (placeBet)`, `src/store/api/betApi.ts:213-231 (betPlace)`).

## Validation and feedback

The source checks presence of selection/market/rate fields before building the request; this check does not itself compare stake with catalogue min/max (`src/components/Betslip.tsx:50-83 (handleBetPlace)`). Another slip disables submission while loading or when stake/rate is empty (`src/components/BetSlip.tsx:156-163 (BetSlip)`). Do not treat either behavior as a replacement for server-side validation.

On success the slips clear local bet state; success/error feedback comes from the mutation/hook layer (`src/hooks/useBetSlip.ts:56-68 (handlePlaceBet)`, `src/store/api/betApi.ts:219-231 (betPlace)`).