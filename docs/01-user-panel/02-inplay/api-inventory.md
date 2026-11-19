# Module 2: In-Play Fixtures (API inventory)

Full endpoint definitions and shared backend response contracts are canonical in [Module 1](../01-home-page/api-inventory.md). This page records the arguments and UI usage specific to In-Play.

## rsplay (`810884b`)

| API | Request on this module | Trigger / frequency | Condition and consumer |
|---|---|---|---|
| `getEvents` | `GET /fixture?inplay=true&status=ACTIVE` on `/inplay`; sport routes send `sport` and optional `competitionId` but no `inplay=true` | Mount, then every 2 s | `useFixtureData` on all listed fixture routes. `sportName='Football'` is sent as `Soccer`; only truthy params are appended (`rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:36-57`, `useFixtureData`; `rsplay:src/store/api/eventsApi.ts:298-315`, `getEvents`). Canonical: [Module 1 R5](../01-home-page/api-inventory.md#r5-getevents-canonical-shared-with-module-2) |
| `getRaces` | `GET /fixture/race?sport=HorseRacing&inplay=true` and `...?sport=Greyhound&inplay=true` on `/inplay` | Mount, then every 10 s | Only when `sportName` is absent; races are displayed under the football/cricket/tennis lists (`rsplay:src/pages/Inplay/index.tsx:36-56`, `Inplay`). No `status` is passed. Canonical query/response: [Module 1 R6-R7](../01-home-page/api-inventory.md#r6r7-getraces-canonical) |
| `getRaces` | `GET /fixture/race?sport={sportName}&competitionId={competitionId}` on `/racing/:sportName[/:competitionId]` | Mount, then every 10 s | Competition ID is optional; no `inplay` or `status` is passed (`rsplay:src/pages/Racing/index.tsx:19-44`, `Racing`). Canonical: [Module 1 R6-R7](../01-home-page/api-inventory.md#r6r7-getraces-canonical) |
| `getBanners` | `/banners?platform=WebBanner&type=SportBanner` and `/banners?platform=AppBanner&type=SportBanner` | Mount per argument set; RTK cache applies | `SportBanner` on Inplay and Racing; static image fallback when a response has no banners (`rsplay:src/pages/Sports/components/SportBanner.tsx:16-31`, `SportBanner`). Canonical endpoint: [Module 1 R1-R4](../01-home-page/api-inventory.md#r1r4-getbanners-canonical) |

The imported `NotificationBar` is not rendered by `pages/Inplay`; global alert polling comes from `HomeLayout`. See [the polling inventory](../../../inventory/polling-and-frequency-inventory.md#rsplay-user-810884b) (`rsplay:src/pages/Inplay/index.tsx:3-6,62-137`, `Inplay`; `rsplay:src/layouts/HomeLayout.tsx:14`, `HomeLayout`).

### Fixture fields used

The `EventItem` response type is declared in `rsplay:src/store/api/eventsApi.ts:43-75`, but `useFixtureData` reads `runners` (plural), `marketId` and `isPremiumFancy`, which do not match that declaration. This is a source/type discrepancy, not a confirmed backend contract; see Q-14 (`rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:61-95`, `transformEvents`).

The race list reads `fixture[].markets[]`, `id`, `sport`, and market `name`, `startTime`, and `externalId`; it filters on market presence and the `forecast` name (`rsplay:src/pages/Inplay/index.tsx:48-56,94-130`, `Inplay`; `rsplay:src/pages/Racing/index.tsx:46-52`, `Racing`). Full race response fields remain in Module 1 R6-R7.

## vishnu7 (`6f3b811`)

| API | Request on this module | Trigger / frequency | Condition and consumer |
|---|---|---|---|
| `getMatchesGroupedByCompetition` | `/inplay`: `GET /fixture/groupByCompetition?sortBy=time&inplay=true`; `/all-sports/:sportName`: adds `sport` and `sortBy=time`, omits `inplay` | Mount, then every 3 s | `useGroupedFixtures`; upcoming sport pages set `skip` and send no fixture request (`vishnu7:src/pages/Inplay/index.tsx:11-18`, `Inplay`; `vishnu7:src/pages/Sports/index.tsx:11-19`, `Sports`; `vishnu7:src/hooks/useGroupedFixtures.ts:20-30`, `useGroupedFixtures`; `vishnu7:src/store/api/sportsApi.ts:198-212`, `getMatchesGroupedByCompetition`). Canonical response/type: [Module 1 V6](../01-home-page/api-inventory.md#v6-getmatchesgroupedbycompetition-canonical-shared-with-module-2) |

`/inplay` additionally mounts `TopGames` (`getPopularEvents` and `getMatches`) and `CasinoGames` (`getHomeCasinoGames`). They are shared with the home page and fully documented in [Module 1](../01-home-page/api-inventory.md#v7v8-getpopularevents--getmatches) (`vishnu7:src/pages/Inplay/index.tsx:19-31`, `Inplay`; `vishnu7:src/pages/Home/components/TopGames.tsx:7-20`, `TopGames`). Layout APIs are global and listed in the [polling inventory](../../../inventory/polling-and-frequency-inventory.md#vishnu7user-6f3b811).

The grouped endpoint returns `fixture` as nested sport -> competition -> fixture arrays (`vishnu7:src/store/api/sportsApi.ts:62-67`, `GroupedFixtureResponse`). In-Play reads event id, sport, start time, competition, status flags, and runner prices through the shared table; see [api-data-flow.md](api-data-flow.md).

## Backend contract note

Q-12 confirms each brand has its own backend built from the same template. The shared `/fixture` and `/fixture/groupByCompetition` contracts may therefore be labelled `INFERRED (shared backend template)` across brands, but request arguments and frontend transformations above remain repo-specific. The complete response shape is not captured from a live API response.