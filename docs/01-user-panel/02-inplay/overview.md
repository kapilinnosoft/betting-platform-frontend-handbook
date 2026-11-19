# Module 2: In-Play Fixtures

**Repos:** rsplay = `rsplay/rsplay-user@810884b` (primary) · vishnu7 = `vishnu7/vishnu7user@6f3b811` (secondary). Paths are relative to each repo's `src/`.

| File | What it covers |
|---|---|
| this page | Routes, page variants, visible content and navigation |
| [component-flow.md](component-flow.md) | Component trees and API ownership |
| [api-inventory.md](api-inventory.md) | Fixture requests and page-specific API usage |
| [api-data-flow.md](api-data-flow.md) | Fixture transformations from response to row |
| [polling-and-frequency.md](polling-and-frequency.md) | Poll intervals, arguments, lifecycle and stale UI |

API contracts documented in Module 1 are linked rather than repeated. Layout-wide calls remain in the [polling inventory](../../../inventory/polling-and-frequency-inventory.md).

## rsplay

### Fixture lists

`/inplay` renders `pages/Inplay` without a `sportName`; `/sports/{cricket|football|tennis}` and `/sports/{sport}/:competitionId` render the same page with a sport and optional competition (`rsplay:src/App.tsx:70-86`, `Inplay`). The hook determines whether the route is in-play from `pathname.startsWith('/inplay')`, so only `/inplay` sends `inplay=true`. Sport routes send their sport and optional competition, but do not request the in-play-only filter (`rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:18-57`, `useFixtureData`).

The response is grouped client-side into cricket, soccer (displayed as football), and tennis; fixtures for other sports are discarded. `/inplay` displays all three sections, while a sport route displays its matching section (`rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:101-118`, `groupedEvents`; `rsplay:src/pages/Inplay/index.tsx:79-87`, `Inplay`). Despite tab/search state in the hook, this page does not render `SportsFilterBar` or a search input. The route and competition path are the visible filters (`rsplay:src/pages/Inplay/index.tsx:19-37`, `Inplay`). `OBSERVED`.

The shared `InplayRow` opens `/sports/{sport}/market-details/{eventId}` on click, including for guests; the login check is commented out (`rsplay:src/pages/Inplay/components/InplayRow.tsx:71-77`, `handleNavigate`).

### Racing

`/inplay` also requests horse racing and greyhound fixtures and renders race rows. Sport-specific `/sports/...` routes do not show racing. Each in-play race list excludes fixtures with no markets and fixtures containing a market named `forecast` (`rsplay:src/pages/Inplay/index.tsx:36-56,88-130`, `Inplay`). Race-time clicks open the login modal for guests; authenticated users navigate to `/details/{sport}/{raceId}/{marketExternalId}` (`rsplay:src/pages/Racing/components/RaceRow.tsx:67-76`, `RaceRow`).

The separate `/racing/:sportName[/:competitionId]` route is also in this module. It polls the selected racing sport, optionally filtered by competition; the page filters out empty-market and `forecast` fixtures, then groups remaining cards by extracted country code (`rsplay:src/pages/Racing/index.tsx:19-52,87-99`, `Racing`). There is no equivalent racing route in vishnu7 (`NOT FOUND`, checked in `vishnu7:src/App.tsx:54-64`).

### vishnu7

`/inplay` renders `pages/Inplay` with the active tab fixed to `INPLAY`; it requests all sports, filtered by `inplay=true`. Its view selector changes only local presentation between time-sorted rows and competition groups (`vishnu7:src/pages/Inplay/index.tsx:9-29`, `Inplay`; `vishnu7:src/hooks/useGroupedFixtures.ts:20-38`, `useGroupedFixtures`).

`/all-sports/:sportName` renders `pages/Sports`. It requests the named sport without an `inplay` filter. Routes recognized by `isUpcomingSport` skip the fixture query and render a “Coming Soon” state (`vishnu7:src/pages/Sports/index.tsx:11-19,29-50`, `Sports`). The shared hook maps `football` to backend sport `Soccer` and normalizes it again when selecting a group from the response (`vishnu7:src/hooks/useGroupedFixtures.ts:20-36`, `useGroupedFixtures`; `vishnu7:src/utils/index.ts:16-31`, `normalizeSportName` and `getSportFixtureGroups`).

Both pages have an empty-state fallback and route match clicks to `/game-details/{sport}/{id}` (Module 3) (`vishnu7:src/components/common/BettingTable.tsx:44-48,60-65`, `NoMatchesFallback` and `MatchRow`). The `/inplay` page also mounts `TopGames` and `CasinoGames`; their APIs are documented with Module 1 (`vishnu7:src/pages/Inplay/index.tsx:19-31`, `Inplay`).

## Differences at a glance

| Aspect | rsplay | vishnu7 |
|---|---|---|
| Fixture endpoint | `GET /fixture` | `GET /fixture/groupByCompetition` |
| In-play rate | 2 s | 3 s |
| Sport-filtered route | `/sports/:sport[/:competitionId]`; no `inplay=true` param | `/all-sports/:sportName`; no `inplay` param |
| All-sports route | `/inplay`; cricket, soccer, tennis plus racing | `/inplay`; server-grouped matches for all sports |
| Racing | `/inplay` embeds races; separate `/racing` list | No racing route or consumer found |
| List modes | Sport sections; no rendered search/tab control | Time or competition grouping |