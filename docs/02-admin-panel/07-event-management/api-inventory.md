# Admin Module A7: Event Management (API inventory)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/pages/EventManagement/` unless stated. Every endpoint is defined in `api/eventManagementApi.ts` and injected into the shared `apiSlice` (bearer token, `refetchOnMountOrArgChange: true`, `keepUnusedDataFor: 0`; `store/api/apiSlice.ts:40-41`). Response shapes come from TypeScript types and the fields the pages read, not from captured responses. Examples are sanitised.

The three list queries add `ts: Date.now()` and set `forceRefetch: () => true`, so they are requested again whenever a component subscribes. `ts` is added inside the query function and is not part of the cache key.

## Summary

| # | Name | Request | Parameters sent | When it runs | Repeats | Consumer |
|---|---|---|---|---|---|---|
| EM1 | `getEvents` | `GET /events` | `status`, `ts`, and when set: `sport`, `search`, `inplay=true`, `page`, `limit` | Events page open; tab, game, search, page or size change; Refresh; after EM2-EM4 | once per argument set | [Events](overview.md#events) |
| EM2 | `updateStatus` | `PATCH /events/:eventId` | body `{ status: "ACTIVE" \| "INACTIVE" }` | Events ▸ Status switch | once per click | [Events › Columns](overview.md#columns) |
| EM3 | `updateInplay` | `PATCH /events/inplay/:eventId` | body `{ status: "ACTIVE" \| "INACTIVE" }` (opposite of the current `inplay`) | Events ▸ Inplay checkbox | once per click | [Events › Columns](overview.md#columns) |
| EM4 | `betSuspended` | `PATCH /events/bet-suspended/:eventId` | body `{ status: "SUSPENDED" \| "ACTIVE" }` | BS ▸ Confirm or Remove | once per confirm | [Bet suspended (BS)](overview.md#bet-suspended-bs) |
| EM5 | `multipleStatusChange` | `PATCH /events/multiple/status` | body `{ status: "ACTIVE" \| "INACTIVE", eventIds: number[] }` | Activate / Deactivate selected toggle | once per toggle | [Activate or deactivate several events](overview.md#activate-or-deactivate-several-events) |
| EM6 | `getEventMarket` | `GET /market` | `eventId`, `ts` | An Events row is expanded; after EM5 or EM7 while expanded | once per expanded row | [Markets of an event](overview.md#markets-of-an-event) |
| EM7 | `updateMarketStatus` | `PATCH /market/status/:marketId` | body `{ status: "ACTIVE" \| "INACTIVE" }` | Market switch in an expanded row | once per click | [Markets of an event](overview.md#markets-of-an-event) |
| EM8 | `getFixtures` | `GET /fixture` | `sport`, `status`, `ts`, and `search` when set | Fixtures page open; game, status or search change; Refresh; after EM9 | once per argument set | [Fixtures](overview.md#fixtures) |
| EM9 | `updateFixtureStatus` | `PATCH /fixture/status` | body `{ eventIds: number[], status: "Active" \| "Inactive" \| "Closed" }` | Fixtures ▸ On/Off, Inactive, Close (after confirmation) | once per action | [Fixtures](overview.md#on--off) |
| EM10 | `getDynamicBetConfig` | `GET /betconfig/dynamic` | `sport`, `marketType`, `ts`, and `eventId` at event level | Bet Config form mounts (each sport or market tab); after EM11 or EM12 | once per tab shown | [Bet Config](bet-config.md#fields) |
| EM11 | `updateDynamicBetConfig` | `PUT /betconfig/dynamic` | body: scope + all ten values + `stakeOverride` | Confirm and update | once per confirm | [Bet Config › Saving](bet-config.md#saving) |
| EM12 | `resetDynamicBetConfigStake` | `PATCH /betconfig/dynamic/reset-stake` | body `{ sport, marketType, eventId? }` | Reset stakes ▸ confirm | once per confirm | [Stake source and Reset stakes](bet-config.md#stake-source-and-reset-stakes) |
| EM13 | `updatePopular` | `PATCH /events/popular/:eventId` | body `{ status }` | Not called at this commit (kept for future use) | — | none |
| EM14 | `updateMarket` | `PATCH /market/:id` | body: old per-market limit fields | Not called; the fields are no longer in use (team) | — | none |

---

## EM1 `getEvents`

`api/eventManagementApi.ts:17-48`, called from `hooks/useEventManagement.ts:39-46`. Provides `Event`.

| Parameter | Value |
|---|---|
| `status` | `INACTIVE` (InActive Matches tab), `ACTIVE` (InPlay), `UPCOMING` (Upcoming) (`utils.ts:13-17 (getGameStatus)`, upper-cased) |
| `inplay` | `true` on the InPlay tab only; omitted otherwise |
| `sport` | `Cricket`, `Soccer`, `Tennis`, `Greyhound`, `HorseRacing` |
| `search` | debounced search text, omitted when empty |
| `page`, `limit` | current page and page size |
| `competitionId` | supported by the definition, never sent by this page |
| `ts` | `Date.now()` |

Example: `GET /events?sport=Cricket&status=ACTIVE&inplay=true&page=1&limit=10&ts=<ms>`

Response (`types/index.ts:858-888 (EventItem, EventManagementResponse)`): `{ success, message, events: EventItem[], pagination }`. Fields read: `id`, `name`, `competition.name`, `status`, `inplay`, `startTime`, `userOnline`, `totalBets`, `isBetSuspended`, `sport`; `pagination.totalItems`.

The same URL is also defined as `getEventByCompetitionId` in `store/api/reportsApi.tsx:100-113` (reports, `competitionId` only); it belongs to the reports pages.

## EM2 `updateStatus`

`api/eventManagementApi.ts:118-125`; `useEventManagement.ts:69-76`. Invalidates `Event`.

```
PATCH /events/<event-id>
{ "status": "INACTIVE" }
```

Effect on the User Panel: see Q-66.

## EM3 `updateInplay`

`api/eventManagementApi.ts:108-115`; `useEventManagement.ts:60-67`. Invalidates `Event`. Sends `INACTIVE` when the event is currently in play and `ACTIVE` when it is not. The team says this overrides the in-play flag and decides whether the in-play or off-play stake limits apply.

```
PATCH /events/inplay/<event-id>
{ "status": "ACTIVE" }
```

## EM4 `betSuspended`

`api/eventManagementApi.ts:128-135`; `useEventManagement.ts:78-86`. Invalidates `Event`.

```
PATCH /events/bet-suspended/<event-id>
{ "status": "SUSPENDED" }
```

`{ "status": "ACTIVE" }` removes the suspension. While suspended, the backend rejects bets with "Bet not allowed" (team).

## EM5 `multipleStatusChange`

`api/eventManagementApi.ts:148-155`; `useEventManagement.ts:102-121`. Invalidates `Market` (not `Event`); the page calls `refetch()` itself to reload the list.

```
PATCH /events/multiple/status
{ "status": "INACTIVE", "eventIds": [<event-id>, <event-id>] }
```

## EM6 `getEventMarket`

`api/eventManagementApi.ts:85-95`; `hooks/useEventMarkets.ts:5`. Provides `Market`.

`GET /market?eventId=<event-id>&ts=<ms>`

Response (`types.ts:21-45 (MarketItem, MarketResponse)`): `{ success, message, markets: MarketItem[] }`. The page reads `id`, `name` and `status` only. The type also carries `runner[]` and the old per-market limits (`inPlayMinBetAmount` … `exposureLimit`), which are no longer in use (team).

## EM7 `updateMarketStatus`

`api/eventManagementApi.ts:138-145`; `useEventMarkets.ts:8-15`. Invalidates `Market`.

```
PATCH /market/status/<market-id>
{ "status": "INACTIVE" }
```

When a market is inactive the backend stops sending it to the User Panel (team).

## EM8 `getFixtures`

`api/eventManagementApi.ts:51-69`; `hooks/useFixtures.ts:25-30`. Provides `Fixture`.

| Parameter | Value |
|---|---|
| `status` | Status "All": `Active,Inactive,Upcoming,Live,Open` (comma-separated). Otherwise `Active` or `Inactive`. The code comment says that without `status` the API lists only Active, Live, Open and Upcoming (`useFixtures.ts:27`) |
| `sport` | as EM1 |
| `search` | when set |
| `ts` | `Date.now()` |

Example: `GET /fixture?sport=Cricket&status=Active,Inactive,Upcoming,Live,Open&ts=<ms>`

Response (`types.ts:107-129 (FixtureItem, FixtureResponse)`): `{ success, message, fixture: FixtureItem[] }`, the **full** list. The page pages it in the browser. Fields read: `id`, `externalId`, `name`, `competition.name`, `sport`, `startTime`, `status`, `inplay`, `isFancy`, `isBookmaker`, `isPremiumFancy`, `isMatchOdds`.

The User Panel lists call the same path with other parameters (for example `status=ACTIVE&inplay=true`); see [Module 2](../../01-user-panel/02-inplay/api-inventory.md).

## EM9 `updateFixtureStatus`

`api/eventManagementApi.ts:72-82`; `useFixtures.ts:53-84`. Invalidates `Fixture`. Ids are converted to numbers.

```
PATCH /fixture/status
{ "eventIds": [<event-id>], "status": "Closed" }
```

| `status` | Sent by | Effect (team, 2026-11-26) |
|---|---|---|
| `Active` | On/Off switched on | Match shown on the User Panel |
| `Inactive` | On/Off switched off; **Inactive** for the selection | Match hidden from the User Panel |
| `Closed` | **Close** after confirmation | Removed from the User Panel and the admin list; cannot be undone. Open bets are settled or voided by the Owner separately |

## EM10 `getDynamicBetConfig`

`api/eventManagementApi.ts:158-168`; `hooks/useBetConfigForm.ts:24`. Provides `BetConfig`.

`GET /betconfig/dynamic?sport=Cricket&marketType=NORMAL&ts=<ms>` (add `&eventId=<event-id>` at event level).

Response (`types.ts:60-83 (DynamicBetConfig)`):

```json
{
  "success": true,
  "message": "<text>",
  "data": {
    "scope": "SPORT",
    "eventId": null,
    "sport": "Cricket",
    "marketType": "NORMAL",
    "inPlayMinStake": "<number as string>",
    "inPlayMaxStake": "<number as string>",
    "offPlayMinStake": "<number as string>",
    "offPlayMaxStake": "<number as string>",
    "minOdd": "<number as string>",
    "maxOdd": "<number as string>",
    "maxProfitPerBet": "<number as string>",
    "maxProfit": "<number as string>",
    "overallExposure": "<number as string>",
    "betTiming": 0,
    "stakeOverride": false,
    "stakeSource": "<source>"
  }
}
```

`scope` is typed `'SPORT' | 'EVENT' | string`. The values of `stakeSource` are not known (Q-68).

## EM11 `updateDynamicBetConfig`

`api/eventManagementApi.ts:170-177`; `useBetConfigForm.ts:67-81`; body built by `utils.ts:38-55 (buildBetConfigBody)`. Invalidates `BetConfig`.

```
PUT /betconfig/dynamic
{
  "sport": "Cricket",
  "marketType": "NORMAL",
  "eventId": <event-id, event level only>,
  "inPlayMinStake": 100,
  "inPlayMaxStake": 50000,
  "offPlayMinStake": 100,
  "offPlayMaxStake": 25000,
  "minOdd": 1.01,
  "maxOdd": 50,
  "maxProfitPerBet": 100000,
  "maxProfit": 500000,
  "overallExposure": 500000,
  "betTiming": 5,
  "stakeOverride": true
}
```

The values above are illustrative only. All ten values are always sent. `stakeOverride` is `true` when a stake field changed or it was already `true`.

## EM12 `resetDynamicBetConfigStake`

`api/eventManagementApi.ts:180-187`; `useBetConfigForm.ts:83-92`. Invalidates `BetConfig`.

```
PATCH /betconfig/dynamic/reset-stake
{ "sport": "Cricket", "marketType": "NORMAL" }
```

Clears the saved stakes for the scope, so they follow the live feed and then the platform default. Other settings are kept.

## EM13 `updatePopular`

`api/eventManagementApi.ts:98-105`. `PATCH /events/popular/:eventId` with `{ status }`, invalidates `Event`. No page calls it (`useUpdatePopularMutation` has no consumer). The team keeps it for marking a match popular, for user apps that show a popular-events section ([Module 1 V7](../../01-user-panel/01-home-page/api-inventory.md)).

## EM14 `updateMarket`

`api/eventManagementApi.ts:190-197`. `PATCH /market/:id` with `Partial<MarketProps>` (`types.ts:47-57`: `inPlayMinBetAmount`, `inPlayMaxBetAmount`, `offPlayMinBetAmount`, `offPlayMaxBetAmount`, `potentialProfit`, `minRate`, `maxRate`), invalidates `BetConfig`. No page calls it, and the team says these per-market fields are no longer in use; Bet Config replaces them.
