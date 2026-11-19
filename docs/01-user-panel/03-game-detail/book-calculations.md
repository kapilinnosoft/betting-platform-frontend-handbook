# Game Detail (book and calculations)

## Catalogue limits

Normal market mapping copies `minBetAmount` / `maxBetAmount` into slip fields `min` / `max`; the other market UI falls back from market-level limits to `betConfig` (`src/pages/GameDetails/Hooks/useCatalogData.ts:49-66 (useCatalogData)`, `src/pages/Markets/components/NormalMarket.tsx:37-40 (NormalMarket)`). The values are shown in the slip and used by MIN/MAX controls. The submit handlers inspected do not compare stake to those values before sending; backend enforcement is not confirmed.

## Estimated profit

The `betSlipPL` client calculation is:

| Condition | Displayed estimate |
|---|---|
| Back, fancy market, category other than `fancy1`, `oddeven`, or `cricketcasino` | `fancyPercentage × stake × 0.01` |
| Back, bookmaker (identified by a normal market whose name contains `bookmaker`) | `rate × stake × 0.01` |
| Back, other normal odds | `(rate - 1) × stake` |
| Lay | `stake` |

Values are rounded to two decimal places (`src/utils/betSlipPL.ts:3-27 (betSlipPL)`). This is a client estimate, not the backend's final settlement calculation.

## Existing exposure and pending slip

Bookset response entries are matched to a market and selection. Both exposure hooks add `getDeltaExposure(...)` to the server-provided selection exposure (`src/hooks/useMarketExposureData.ts:23-35 (useMarketExposureData)`, `src/hooks/useMarketExposureData.ts:17-34 (useMarketExposureData)`). The local helper accounts for normal and bookmaker Back/Lay scenarios; it returns zero for fancy/other pending bets (`src/utils/helper.ts:3-41 (getDeltaExposure)`, `src/utils/index.ts:247-283 (getDeltaExposure)`).

## Cashout estimate

Cashout is calculated locally from the selected market's runner prices and existing exposure. The helper considers candidate Back/Lay hedges for the two runners, computes each resulting position, and selects a candidate. The resulting bet is placed into the regular bet slip; no separate cashout mutation is defined in these flows (`src/pages/GameDetails/Hooks/useCashOut.tsx:39-68,184-236 (useCashOut)`, `src/hooks/useCashout.ts:33-68,141-182 (useCashout)`).

The candidate formulas use `diff / odds` for regular odds and `diff / (1 + odds / 100)` for bookmaker markets; simulated return uses `(odds - 1) × stake` or `(odds / 100) × stake`, respectively (`src/hooks/useCashout.ts:70-96,109-129 (simulate, solve)`). Both implementations round to cents and ignore books with fewer than two matching runners. Their candidate sort direction is opposite in source: one sorts ascending by minimum resulting position; the other sorts descending (`src/pages/GameDetails/Hooks/useCashOut.tsx:125-130 (candidate sort)`, `src/hooks/useCashout.ts:167-180 (candidate sort)`). The shared path does not imply identical cashout selection behavior.