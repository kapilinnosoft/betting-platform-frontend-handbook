# Module 2: In-Play Fixtures (API data flow)

Response shapes below reflect source types and fields read by the UI, not captured backend responses. Each frontend is traced separately.

## rsplay (`810884b`)

### `/fixture` to match rows

`pages/Inplay` passes its optional `sportName` to `useFixtureData` (`rsplay:src/pages/Inplay/index.tsx:19-35`, `Inplay`). The hook builds query arguments with `Football -> Soccer`, `competitionId = Number(routeParam)`, `status='ACTIVE'`, and an `inplay` boolean that is true only on `/inplay` when the internal default tab is `In-Play` and search is empty (`rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:18-57`, `useFixtureData`). `getEvents` appends only truthy values (`rsplay:src/store/api/eventsApi.ts:298-315`, `getEvents`). Thus the all-sports in-play route sends `inplay=true&status=ACTIVE`; a sport route sends `sport` and `status=ACTIVE`, plus `competitionId` if provided.

`transformEvents` maps `id` to numeric `eventId`; `name`, `competition.name`, `inplay`, `startTime`, sport flags and `marketId` to row fields; and the `runners` array to named runner objects with back/lay prices (`rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:61-97`, `transformEvents`). A separate six-price array uses runner order `[0, 2, 1]` to produce the 1/X/2 display order. Tags are derived from fancy, bookmaker, premium and in-play flags (`rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:74-93`, `transformEvents`).

The transformed data is split into cricket, soccer-as-football, and tennis. Other sports are dropped from this match list (`rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:99-118`, `groupedEvents`). The page renders `CricketFixture` sections, which render `InplayRow` for each event or a per-section empty message (`rsplay:src/pages/Inplay/index.tsx:79-87`, `Inplay`; `rsplay:src/pages/Inplay/components/CricketFixture.tsx:12-29`, `CricketFixture`). `InplayRow` shows the API's `inplay` flag as LIVE, event and competition text, market icons, and six odds buttons. It hides odds when competition and event names match and navigates to game detail on row click (`rsplay:src/pages/Inplay/components/InplayRow.tsx:92-100,111-180`, `InplayRow`). The TV icon is unconditional; the team confirmed it should be conditional (Q-15, confirmed defect) (`rsplay:src/pages/Inplay/components/InplayRow.tsx:146-165`, `InplayRow`).

### Racing fixtures

On `/inplay`, two `getRaces` calls request HorseRacing and Greyhound with `inplay=true`; the page removes fixtures with no markets or a market named `forecast`, then renders `RaceRow` (`rsplay:src/pages/Inplay/index.tsx:36-56,88-130`, `Inplay`). The separate Racing page applies the same market filters, groups fixtures by country, and renders race-time buttons (`rsplay:src/pages/Racing/index.tsx:46-52,87-99`, `Racing`). In `RaceRow`, the client clock determines live state from race start times; authenticated clicks navigate to race detail (`rsplay:src/pages/Racing/components/RaceRow.tsx:45-76`, `RaceRow`).

## vishnu7 (`6f3b811`)

### Grouped fixtures to rows

On `/inplay`, `Inplay` sets `inplay=true` and leaves `sportName` undefined. On `/all-sports/:sportName`, `Sports` supplies the route sport and omits `inplay`; upcoming sports set `skip` (`vishnu7:src/pages/Inplay/index.tsx:9-18`, `Inplay`; `vishnu7:src/pages/Sports/index.tsx:11-19,29-50`, `Sports`). The hook always passes `sortBy:'time'`, and the API converts `football` to `Soccer`; empty search is omitted (`vishnu7:src/hooks/useGroupedFixtures.ts:20-30`, `useGroupedFixtures`; `vishnu7:src/store/api/sportsApi.ts:198-212`, `getMatchesGroupedByCompetition`).

`GroupedFixtureResponse.fixture` is nested by sport and competition (`vishnu7:src/store/api/sportsApi.ts:62-67`, `GroupedFixtureResponse`). If a sport is specified, `getSportFixtureGroups` selects the matching normalized sport group. The hook flattens those groups, sorts fixtures by `startTime`, then moves league-level fixtures (`id === competitionId`) to the front (`vishnu7:src/hooks/useGroupedFixtures.ts:32-38`, `useGroupedFixtures`; `vishnu7:src/utils/index.ts:16-45`, `normalizeSportName`, `getSportFixtureGroups`, `flattenFixtureGroups`, `sortFixturesByStartTime`, `sortFixturesWithTopLeaguesFirst`).

Time mode displays the flattened list; competition mode renders each nested competition heading and its rows (`vishnu7:src/pages/Inplay/index.tsx:24-29`, `Inplay`; `vishnu7:src/components/common/GroupedBettingTable.tsx:15-37`, `GroupedBettingTable`). `GroupedBettingTable` uses competition names as headings; `MatchRow` reads `id`, `sport`, `name`, `startTime`, `inplay`, `isFancy`, `isBookmaker` and runner prices, then navigates to `/game-details/{sport}/{id}` (`vishnu7:src/components/common/GroupedBettingTable.tsx:15-37`, `GroupedBettingTable`; `vishnu7:src/components/common/BettingTable.tsx:51-100`, `MatchRow`).

No betting or odds calculations occur in this module. Sorting, sport normalization, fixture flattening, and display-order selection are the transformations documented above.