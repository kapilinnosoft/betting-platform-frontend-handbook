# Home Page (common reference)

This is the single Home Page entry point for the common module. It groups by capability rather than by frontend. Endpoint paths and rates below are source-observed; implementation-specific differences remain inline.

The visual map is available at [visual-guide.html](visual-guide.html). Detailed component flow and full response mapping are in [component-flow.md](component-flow.md) and [api-inventory.md](api-inventory.md).

| Home capability | API reference | How it is used |
|---|---|---|
| Banners | Both define `GET /banners` (`getBanners`). | Placement values vary: rsplay Home uses `HomeBanner`, `HomeBannerLogin` and `SecondaryBanner`; vishnu7 uses `MainBanner` and `WellcomeBanner`. Sources: `rsplay:src/store/api/contentApi.ts:6-13 (contentApi.getBanners)`, `vishnu7:src/store/api/contentApi.ts:6-13 (contentApi.getBanners)`. |
| Popular matches and fixtures | Sources call different fixture APIs; they are grouped here as one Home capability, not represented as one shared endpoint. | rsplay uses `GET /fixture?status=ACTIVE` (`getEvents`) every 2 s. vishnu7 `/home` uses `GET events/popular` (`getPopularEvents`) and `GET /fixture` (`getMatches`) for card start times, plus `GET /fixture/groupByCompetition?sport=Cricket&sortBy=time` every 3 s for the match table. Sources: `rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:55-57 (useFixtureData)`, `vishnu7:src/hooks/usePopularEvents.ts:4-12 (usePopularEvents)`, `vishnu7:src/hooks/useGroupedFixtures.ts:20-30 (useGroupedFixtures)`. |
| Fixture counts | `GET /fixture/counts` (`getFixtureCounts`) is called by the rsplay Header every 2 s. | It supplies sport counts shown in the Home layout. The vishnu7 Header calls user info and wallets instead; it does not mount a fixture-count query. Sources: `rsplay:src/store/api/eventsApi.ts:291-297 (getFixtureCounts)`, `rsplay:src/components/Header.tsx:67-69 (Header)`, `vishnu7:src/components/Header.tsx:46-48 (Header)`. |
| Casino games and promotions | Home casino endpoints vary by implementation. | rsplay uses `GET /casino/games` (`getCasinoGames`); vishnu7 uses `GET /casino/home/games` and `GET /casino/home/provider`. Sources: `rsplay:src/pages/Home/components/PopularGames.tsx:32-37 (PopularGames)`, `vishnu7:src/pages/Dashboard/index.tsx:20-23 (Dashboard)`, `vishnu7:src/pages/Home/components/CasinoGames.tsx:14-45 (CasinoGames)`. |

## Home surfaces

The module includes the rsplay `/` route, vishnu7 `/dashboard`, and vishnu7 `/home`. These are kept in one Home module; the dashboard is casino-first and `/home` is sports-first. rsplay changes its Home sections based on authentication (`rsplay:src/pages/Home/index.tsx:57-69 (Home)`). vishnu7 routes `/` to `/dashboard` and exposes `/home` separately (`vishnu7:src/App.tsx:54-62 (App)`).

Layout queries also contribute to the Home network profile. In particular, fixture counts are part of the rsplay Header and should be included when reviewing Home behavior; the full always-on list is in [polling-and-frequency-inventory.md](../../../inventory/polling-and-frequency-inventory.md).

**Contract note:** Q-12 confirms both backends use the same backend template, but matching paths do not prove that frontend payloads, response shapes, or page behavior are identical. See the [API inventory](../../../inventory/api-inventory.md#same-backend-url-different-endpoint-names-rsplay--vishnu7).