# User Panel: module map (Phase 1)

This page maps the eight Phase 1 modules to their routes, entry files and endpoints in both reference repos. It is the starting point for module-by-module documentation. Module folders are created when each module is documented.

rsplay = `rsplay/rsplay-user@810884b` (primary) · vishnu7 = `vishnu7/vishnu7user@6f3b811` (secondary). All paths are relative to the repo's `src/`.

Before reading module docs, read [application-architecture.md](../00-overview/application-architecture.md), which covers the request pipeline, auth and the polling model.

---

## Module 1: Home Page

**Documented →** [01-home-page/overview.md](01-home-page/overview.md)

| | rsplay | vishnu7 |
|---|---|---|
| Routes | `/` | `/dashboard` (landing; `/` redirects here) and `/home` |
| Entry | `pages/Home/index.tsx` | `pages/Dashboard/index.tsx`, `pages/Home/index.tsx` |
| Child components | `MainBanner`, `SecondaryBanner`, `CasinoBanner`, `PopularGames`, `SportsTab`, `SportsSection`, `SportsListing`, `SportsListingLogin` | `HomePromotions`, `SportsTabs`, `TopGames`, `CasinoGames`, `GameCard`, `WelcomePopup` |
| Endpoints | `getBanners`, `getSystemSettings`, `getEvents` (via `Inplay/Hooks/useFixtureData`), `getRaces`, `getCasinoGames` | `getBanners`, `getHomeCasinoGames`, `getHomeProviderGames`, `getHomeFavouriteCasinoTables`, `getMatchesGroupedByCompetition` (via `useGroupedFixtures`), `getPopularEvents` |
| Global (layout) calls on this page | see the polling inventory: `/fixture/counts` 2 s, wallets 5 s, `/system` 30 s, alerts 30 s | `/users/me` + wallets 5 s, contact support, alerts |

## Module 2: In-Play Fixtures

**Documented →** [02-inplay/overview.md](02-inplay/overview.md)

| | rsplay | vishnu7 |
|---|---|---|
| Routes | `/inplay`, `/sports/{cricket\|football\|tennis}[/:competitionId]`, `/racing/:sportName[/:competitionId]` | `/inplay`, `/all-sports/:sportName` |
| Entry | `pages/Inplay/index.tsx`, `pages/Racing/index.tsx` | `pages/Inplay/index.tsx`, `pages/Sports/index.tsx` |
| Key hooks / components | `Inplay/Hooks/useFixtureData.ts` (route-based args, `Football → Soccer` mapping; tab/search state has no rendered controls), `InplayRow`, `CricketFixture`, racing rows | `hooks/useGroupedFixtures.ts`, `components/common/GroupedBettingTable.tsx`, `BettingTable.tsx`, `MatchListControls` |
| Endpoints | `getEvents` (2 s), `getRaces` (10 s), `getBanners` (`SportBanner`), plus shared-layout `getNotifications` | `getMatchesGroupedByCompetition` (3 s), plus `TopGames` and `CasinoGames` calls documented in Module 1 |
| Sidebar navigation | `hooks/useSidebar.ts` → `getCompetitionById`, `getEvents` | `components/common/Sidebar.tsx` → lazy `getSportCompetitions`, `getMatches` |

## Module 3: Game Detail (markets, book, limits, bet placement)

**Documented →** [03-game-detail/overview.md](03-game-detail/overview.md)

One common module covers catalogue markets, odds selection, bet slip, limits, exposure/book, stake controls, and cashout. The reference uses backend paths as canonical names; source aliases and payload/type differences are documented inline without project labels. See [API inventory](03-game-detail/api-inventory.md), [component flow](03-game-detail/component-flow.md), [bet placement](03-game-detail/bet-placement-flow.md), [book calculations](03-game-detail/book-calculations.md), and [polling](03-game-detail/polling-and-frequency.md).

## Module 4: Reports & Statements

**Documented →** [04-reports/overview.md](04-reports/overview.md) (rsplay only, four reports: Account statement, Bet history, Profit & loss, Casino bet history; team decisions 2026-11-18 and 2026-11-19. The table below is the original survey)

| Report | rsplay route → endpoint | vishnu7 route → endpoint |
|---|---|---|
| Account statement | `/account-statement` → `getMyTransactions`, `exportGameTransactions` | `/user/account-statement` → `getAccountStatement`, `getStatementMarketBets`, `getEventProfitLossBets`, `exportAccountStatement`, `getMyExports` |
| Bet history | `/bet-history` → `getBetHistory`, `exportBetHistory` | `/user/bet-history` → `getBetHistory` |
| Unsettled bets | `/unsettled-bet` → `getBetHistory`, `exportBetHistory` | — |
| Profit & loss | `/profit-loss` → `getProfitLoss` | `/user/profit-loss` → `getProfitLossSummary` |
| Casino bet history | `/casino-bet-history` → `getCasinoRoundHistory` | `/user/casino-bet-history` → `getCasinoRoundHistory` |
| Commission | `/commission` → `getMyCommissions` | — |
| Export history | `/export-report-history` → `getExportReports` | (inside account statement) |
| Bonus statement | `/bonus-statement` → `getBonusApplicants` | — |
| Results | `/results` → `getResults` | — |
| Activity log | — | `/user/activity-logs` → `getActivityLog` |
| Shared filter UI | none: each page builds its own filter row (`FilterContainer.tsx` exists but is imported nowhere) | per-page `components/ReportForm.tsx` |

## Module 5: Scorecard

**Documented →** [05-scorecard-live-tv/overview.md](05-scorecard-live-tv/overview.md), together with Modules 6 and 7 (rsplay only, 2026-11-19). The tables below are the original survey.

| | rsplay | vishnu7 |
|---|---|---|
| Endpoint | `getScorecard` `GET events/scorecard/:eventId`: response has `scorecardUrl`, `liveTvUrl` | `getMediaUrls` (same path): stored in `mediaSlice` |
| Components | `GameDetails/components/Scorecard.tsx`, `LiveScoreCard.tsx` | `Markets/components/Media.tsx` |
| Skip rules | demo users, guests, no `eventId` | Not covered (Modules 5–7 documented from rsplay only) |

## Module 6: Live TV

**Documented →** [05-scorecard-live-tv/scorecard-and-live-tv.md](05-scorecard-live-tv/scorecard-and-live-tv.md#live-tv-module-6)

| | rsplay | vishnu7 |
|---|---|---|
| Source | `liveTvUrl` from `getScorecard` (game detail `useCatalogData.ts:116`, race detail `RacingInside/index.tsx:32`) | `liveTvUrl` from `getMediaUrls` → `mediaSlice.setMediaUrls`; `ui.liveTvEnabled`; TV tab in `Markets` |
| Player | `<iframe src={liveTvUrl} allowFullScreen>` behind an on/off toggle (see Module 6 doc) | Not covered |

## Module 7: Raw Scorecard

**Documented →** [05-scorecard-live-tv/raw-scorecard.md](05-scorecard-live-tv/raw-scorecard.md)

| | rsplay | vishnu7 |
|---|---|---|
| Endpoint | `GET /events/raw-scorecard/:eventId` → `getLiveScorecard` (1 s, `CustomLiveScoreCard.tsx`, auth only, `transformResponse: dropScorecardUrl`) | `getRawScore` (1 s, `Media.tsx`, cricket only, keyed by `externalId`), `scorecard/ScoreCardStrip.tsx` |

## Module 8: Casino

**Documented →** [08-casino/overview.md](08-casino/overview.md) (vishnu7 only, by team decision 2026-11-19; the table below is the original survey)

| | rsplay | vishnu7 |
|---|---|---|
| Lobby routes | `/LIVECASINO`, `/INDIANPOKER`, `/AURACASINO`, `/FANTASY11`, `/AVIATOR`, `/CHICKENROAD`, `/INTCASINO`, `/SLOT` → `pages/CasinoGames` (`pageType` prop) | `/casino` → `pages/Casino` |
| Lobby logic | `CasinoGames/hooks/useCasinoGames.ts`, `CategoryTabs`, `CasinoFavouriteGames`, `constant.tsx` | `hooks/useCasinoLobby.ts` (provider, category, debounced search, pagination `LIMIT`), `CasinoLobbySkeleton`, `HeadingBar` |
| Endpoints | `getCasinoGames`, `getCasinoCategories`, `addToFavorite`, `getFavoriteGames`, `createCasinoSession` | `getCasinoGames`, `getCasinoCategories`, `getCasinoProviders`, `createCasinoSession`, `getLobbyUrlById` |
| Launch | `createCasinoSession` from the lobby (`useCasinoGames`) and from `/GAME/:id` (`pages/Game/hooks/useGame.ts`; navigates back with `navigate(-1)` on several paths) | `hooks/useCasinoGameLauncher.ts` → `navigate('/casino-playground', …)` → `CasinoPlayground` / `casino/CasinoGamePlayer.tsx`; `casinoSlice.launchGame(url)` |
| Provider-specific | — | QTech: `/casino-qtech` → `<iframe src={getLobbyUrlById().url}>`; consent: `useCasinoConsentGate`, `CasinoConsentModal` |
| History | `/casino-bet-history` → `getCasinoRoundHistory` | `/user/casino-bet-history` → `getCasinoRoundHistory` |

---

## Module 9: Deposit and Withdraw

**Documented →** [09-wallet/overview.md](09-wallet/overview.md) (rsplay only, team decision 2026-11-19). UPI, bank and crypto deposit; bank, UPI and crypto withdraw from saved accounts; add/delete accounts; request history. The other implementation has no deposit or withdraw pages.

## Out of Phase 1 scope (noted for completeness)
Login and Signup are documented as a supplemental common module in [authentication](authentication/overview.md); the formal eight-module Phase 1 numbering is unchanged. Deposit and withdraw are now documented as [Module 9](09-wallet/overview.md) (rsplay only, approved 2026-11-19). Other out-of-scope features include coins, referral, profile, change password, MFA, and push notifications. See the [central API inventory](../../inventory/api-inventory.md).
