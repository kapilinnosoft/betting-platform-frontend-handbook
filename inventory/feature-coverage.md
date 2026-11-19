# Feature coverage: rsplay-user vs vishnu7user

This table shows which reference repo implements which User Panel feature. It drives the documentation plan: each module is documented from rsplay first, with a separate vishnu7 section where vishnu7 adds or differs.

Status at Step 3 (module analysis). Rows for Modules 1-3, the four scoped Module 4 reports and Modules 5–7 (rsplay column) and Module 8 (vishnu7 column) have been verified against source; later modules remain initial coverage. "Present" means the code exists, and detailed behaviour is verified when the module is documented. "NOT FOUND" means no route, endpoint or component was found by name search. That is re-checked per module before it becomes final.

| Module | Feature | rsplay-user (`810884b`) | vishnu7user (`6f3b811`) |
|---|---|---|---|
| 1 Home | Landing page | `/` → `pages/Home` | `/` → `/dashboard` (`pages/Dashboard`), plus `/home` (`pages/Home`) |
| 1 Home | Banners | `getBanners` (`MainBanner`, `SecondaryBanner`, `SportBanner`, `WelcomeBannerModal`) | `getBanners` (`Dashboard`, `WelcomePopup`) |
| 1 Home | Sport listings | `SportsListing` (guest, top 3 per tab) / `SportsListingLogin` (logged in, top 5 per sport) via `getEvents` + `getRaces`. Cricket, soccer, tennis, horse racing, greyhound | `/home` only: `useGroupedFixtures` → `getMatchesGroupedByCompetition`, **cricket only** (intended, Q-18). `/dashboard` has no fixture list |
| 1 Home | Popular events | NOT FOUND | `getPopularEvents` (`usePopularEvents`) |
| 1 Home | Casino sections | `PopularGames` (`getCasinoGames`), `CasinoBanner` | `getHomeCasinoGames`, `getHomeProviderGames`, `getHomeFavouriteCasinoTables` |
| 1 Home | Sport counts in header | `getFixtureCounts` (2 s) | NOT FOUND |
| 2 In-play | In-play / sport fixture lists | `pages/Inplay` + `useFixtureData` (`getEvents`, 2 s; route-dependent `inplay`) | `pages/Inplay`, `pages/Sports` + `useGroupedFixtures` (`getMatchesGroupedByCompetition`, 3 s; only `/inplay` sets `inplay=true`) |
| 2 In-play | Racing (horse/greyhound) | `/inplay` embeds races; `/racing/:sportName[/:competitionId]` lists races via `getRaces` (10 s) | Endpoints defined but **never called**; no racing route or consumer found |
| 2 In-play | Sidebar competitions | `useSidebar` → `getCompetitionById`, `getEvents` | `Sidebar` → lazy `getSportCompetitions`, `getMatches` |
| 3 Game detail | Catalogue (markets) | `getCatalogueByEventId` (1/2 s) | `getMatcheDetails` (1 s) |
| 3 Game detail | Market types | Catalogue-driven normal, fancy/session and premium groups; see [common Module 3](../docs/01-user-panel/03-game-detail/overview.md) | Catalogue-driven normal, fancy and premium groups; see [common Module 3](../docs/01-user-panel/03-game-detail/overview.md) |
| 3 Game detail | Bet slip and placement | `POST /bet/place`; shared backend contract (Q-22, resolved) | `POST /bet/place`; shared backend contract (Q-22, resolved; optional `position` not sent) |
| 3 Game detail | One-click betting | `useOneClickBet`, `get/saveOneClickBetting` | NOT FOUND |
| 3 Game detail | Book / exposure | `GET /exposure/bookset/calculation`; see [common Module 3](../docs/01-user-panel/03-game-detail/book-calculations.md) | `GET /exposure/bookset/calculation`; see [common Module 3](../docs/01-user-panel/03-game-detail/book-calculations.md) |
| 3 Game detail | Fancy/session P/L book | `GET /exposure/profit-loss`; query fields vary, see [API inventory](../docs/01-user-panel/03-game-detail/api-inventory.md) | `GET /exposure/profit-loss`; query fields vary, see [API inventory](../docs/01-user-panel/03-game-detail/api-inventory.md) |
| 3 Game detail | Cashout | Local hedge calculation; candidate ordering differs in source | Local hedge calculation; candidate ordering differs in source |
| 3 Game detail | Open / matched bets | `CurrentBets` (`getBetHistory`) | `MyBets` (`getBetHistory`), `ExposureSummaryModal` (`getOpenBetsSummary`) |
| 3 Game detail | Stake buttons | `GET/PUT /stakeset`; see [API inventory](../docs/01-user-panel/03-game-detail/api-inventory.md) | `GET/PUT /stakeset`; see [API inventory](../docs/01-user-panel/03-game-detail/api-inventory.md) |
| 3 Game detail | Multi-market / pinned markets | NOT FOUND | `/multi-market`, `get/pin/unpinMarket` |
| 3 Game detail | Auto-redirect on market close | Catalogue status `closed` schedules navigation after 1 s | No equivalent behavior documented in the common flow |
| 4 Reports | Account statement | `/account-statement` → `getMyTransactions`, `exportGameTransactions` | `/user/account-statement` → `getAccountStatement`, drill-down `getStatementMarketBets`, `getEventProfitLossBets`, export `exportAccountStatement`, `getMyExports` |
| 4 Reports | Bet history / unsettled | `/bet-history`, `/unsettled-bet` → `getBetHistory`, `exportBetHistory` | `/user/bet-history` → `getBetHistory` |
| 4 Reports | Profit & loss | `/profit-loss` → `getProfitLoss` | `/user/profit-loss` → `getProfitLossSummary` |
| 4 Reports | Casino bet history | `/casino-bet-history` → `getCasinoRoundHistory` | `/user/casino-bet-history` → `getCasinoRoundHistory` |
| 4 Reports | Documentation | [Module 4](../docs/01-user-panel/04-reports/overview.md), verified for the four scoped reports | Not covered (team decision 2026-11-19) |
| 4 Reports | Commission | `/commission` → `getMyCommissions` | NOT FOUND |
| 4 Reports | Export history | `/export-report-history` → `getExportReports` | via `getMyExports` inside the account statement |
| 4 Reports | Bonus statement | `/bonus-statement` → `getBonusApplicants` | NOT FOUND |
| 4 Reports | Activity log | NOT FOUND | `/user/activity-logs` → `getActivityLog` |
| 4 Reports | Results | `/results` → `getResults` | NOT FOUND (casino-results page exists but is unrouted) |
| 4 Reports | Turnover | `getTurnover`, but `pages/Reports/Turnover.tsx` is **unrouted** | NOT FOUND |
| 5 Scorecard | Scorecard URL (embedded) | `getScorecard` → `scorecardUrl` (`useCatalogData`) | `getMediaUrls` → `scorecardUrl` → `mediaSlice` |
| 6 Live TV | Stream URL | `getScorecard` → `liveTvUrl` (game detail: toggle < 1024 px and ≥ 1280 px; race detail ≥ 1280 px only) | `getMediaUrls` → `liveTvUrl` → `mediaSlice` |
| 7 Raw scorecard | Raw cricket score | `getLiveScorecard` (`CustomLiveScoreCard`, 1 s, cricket, logged-in non-demo) | `getRawScore` (`Media`, 1 s) + `ScoreCardStrip` |
| 5–7 | Documentation | [Modules 5–7](../docs/01-user-panel/05-scorecard-live-tv/overview.md), verified for rsplay | Not covered (rsplay chosen as reference, 2026-11-19) |
| 8 Casino | Lobby / categories | `/LIVECASINO`, `/SLOT` and 6 more `pageType` routes → `getCasinoGames`, `getCasinoCategories` | `/casino` → `useCasinoLobby` (`getCasinoGames`, `getCasinoCategories`, `getCasinoProviders`) |
| 8 Casino | Provider list | `getCasinoProviders` defined but **never called** | `getCasinoProviders` (`useCasinoLobby`) |
| 8 Casino | Favourites | `addToFavorite`, `getFavoriteGames` | NOT FOUND (only `getHomeFavouriteCasinoTables` = recent tables) |
| 8 Casino | Launch | `createCasinoSession` (`useCasinoGames`, `/GAME/:id` → `useGame`) | `createCasinoSession` (`useCasinoGameLauncher` → `navigate('/casino-playground')`), `CasinoGamePlayer` |
| 8 Casino | QTech lobby | NOT FOUND | `/casino-qtech` → `getLobbyUrlById` → `<iframe src={data?.url}>` |
| 8 Casino | Consent gate | NOT FOUND | `useCasinoConsentGate`, `CasinoConsentModal` (only when `VITE_SHOW_CASINO_MODAL` and `VITE_CASINO_POINT_VALUE` are set) |
| 8 Casino | Documentation | Not covered (team decision 2026-11-19) | [Module 8](../docs/01-user-panel/08-casino/overview.md), verified for vishnu7 |
| — | Auth | Login, register with OTP, demo login, forgot/reset; token refresh on 401 | Login, register, demo login, forgot/reset, Telegram/mobile MFA verification; no refresh |
| 9 Deposit and Withdraw | Wallet (deposit/withdraw, bank/UPI/crypto) | `/deposit`, `/withdraw` behind `FeatureRoute`; [Module 9](../docs/01-user-panel/09-wallet/overview.md), verified | NOT FOUND |
| — | Push notifications (FCM) | `registerFcmDevice` / `deleteFcmDevice` | NOT FOUND |
| — | i18n | `src/i18n`, `i18next` | NOT FOUND |
