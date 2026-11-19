# Component inventory (User Panel)

This lists components that call APIs or own module logic, with their module and data dependencies. Modules 1-3 are documented; paths are relative to `src/`.

## rsplay (`810884b`)

| Component / hook | File | Module(s) | API hooks | Redux reads | Shared? |
|---|---|---|---|---|---|
| `Home` | `pages/Home/index.tsx` | 1 | `getSystemSettings` | `auth`, `user` | — |
| `MainBanner` | `pages/Home/components/MainBanner.tsx` | 1 | `getBanners` ×2 | `auth` | — |
| `SecondaryBanner` | `pages/Home/components/SecondaryBanner.tsx` | 1 | `getBanners` ×2 | — | — |
| `SportsSection` | `pages/Home/components/SportsSection.tsx` | 1 | — (static) | — | — |
| `SportsListing` | `pages/Home/components/SportsListing.tsx` | 1 | `getRaces` ×2 (via `useFixtureData`) | — | — |
| `SportsListingLogin` | `pages/Home/components/SportsListingLogin.tsx` | 1 | `getRaces` ×2 (via `useFixtureData`) | — | — |
| `CasinoBanner` | `pages/Home/components/CasinoBanner.tsx` | 1 | — (static) | — | — |
| `PopularGames` | `pages/Home/components/PopularGames.tsx` | 1 → 8 | `getCasinoGames` | `auth`, `user` | — |
| `useFixtureData` | `pages/Inplay/Hooks/useFixtureData.ts` | 1, 2 | `getEvents` (2 s) | — | **Yes** (Home + In-play) |
| `InplayRow` | `pages/Inplay/components/InplayRow.tsx` | 1, 2 | — | `auth` (unused) | **Yes** |
| `RaceRow` | `pages/Racing/components/RaceRow.tsx` | 1, 2 | — | `auth` | **Yes** |
| `Inplay` | `pages/Inplay/index.tsx` | 2 | `getEvents`, `getRaces` (in-play races), `getBanners` via `SportBanner` | — | — |
| `Racing` | `pages/Racing/index.tsx` | 2 | `getRaces`, `getBanners` via `SportBanner` | — | — |
| `SportBanner` | `pages/Sports/components/SportBanner.tsx` | 2 | `getBanners` ×2 (`SportBanner`) | — | Shared by Inplay and Racing |
| `SportsNameHeader` | `components/common/SportsNameHeader.tsx` | 1, 2 | — | — | **Yes** |
| `OddButton` | `components/OddButton.tsx` | 1, 2, 3 | — | — | **Yes** |
| `Header` | `components/Header.tsx` | Layout (Phase 4) | `getSystemSettings`, `getUserProfile`, `getIsMasterOwner`, `getUserWallets` (5 s), `getFixtureCounts` (2 s) | `auth`, `wallet`, `user` | Every page |
| `Sidebar` / `useSidebar` | `components/Sidebar.tsx`, `hooks/useSidebar.ts` | Layout | `getSystemSettings`, `getContactSupportAccount`, lazy `getCompetitionById`, `getEvents` | `auth` | Every page |
| `AlertNotification` / `HomeLayout` | `components/AlertNotification.tsx`, `layouts/HomeLayout.tsx` | Layout | `getNotifications({type:'Alert'})` (30 s) | — | Every page |
| `MobileFooterBar` | `components/MobileFooterBar.tsx` | Layout | `getContactSupportAccount` / `getContactSupport` | `auth`, `user` | Every page (mounted on desktop too) |
| `useRegister` / `useLoginPage` | `pages/Auth/hooks/useRegister.ts`, `pages/Auth/hooks/useLogin.ts` | Supplemental Authentication | `sendOtp`, `registerUser`, `login` | `auth` | Login and Signup |

Imported but unused on Home: `pages/Home/components/SportsTab.tsx`, `components/common/EventsTable`.

## vishnu7 (`6f3b811`)

| Component / hook | File | Module(s) | API hooks | Redux reads | Shared? |
|---|---|---|---|---|---|
| `Dashboard` | `pages/Dashboard/index.tsx` | 1 | `getBanners`, `getHomeCasinoGames`, `getHomeProviderGames` | — | — |
| `WelcomePopup` | `pages/Home/components/WelcomePopup.tsx` | 1 | `getBanners(WellcomeBanner)` | `user.info`, `auth.isAuthenticated` | — |
| `Home` | `pages/Home/index.tsx` | 1 | via `useGroupedFixtures` | — | — |
| `TopGames` | `pages/Home/components/TopGames.tsx` | 1 | via `usePopularEvents` | — | — |
| `HomePromotions` | `pages/Home/components/HomePromotions.tsx` | 1 | — (static) | — | — |
| `CasinoGames` (home) | `pages/Home/components/CasinoGames.tsx` | 1 → 8 | `getHomeCasinoGames` | — | — |
| `useBannerPlatform` | `hooks/useBannerPlatform.ts` | 1 | — | — | Banner consumers |
| `usePopularEvents` | `hooks/usePopularEvents.ts` | 1 | `getPopularEvents`, `getMatches({})` | — | — |
| `useGroupedFixtures` | `hooks/useGroupedFixtures.ts` | 1, 2 | `getMatchesGroupedByCompetition` (3 s) | — | **Yes** (Home, Inplay, Sports) |
| `Inplay` / `Sports` | `pages/Inplay/index.tsx`, `pages/Sports/index.tsx` | 2 | via `useGroupedFixtures` | — | — |
| `BettingTable`, `GroupedBettingTable`, `MatchListControls` | `components/common/` | 1, 2 | — | — | **Yes** |
| `useCasinoGamePlay` | `hooks/useCasinoGamePlay.ts` | 1, 8 | — (uses `useCasinoGameLauncher`) | — | **Yes** |
| `Marquee` | `components/Marquee.tsx` | Layout | `getNotifications({type:'Alert'})` | `ui`, `media` | Most pages |
| `Header` | `components/Header.tsx` | Layout | `getUserInfo` (5 s), `getUserWallets` (5 s), `getContactSupport` | `ui`, `user` | Every page |
| `SignupPage` / `LoginPage` | `pages/auth/SignupPage.tsx`, `pages/auth/LoginPage.tsx` | Supplemental Authentication | `sendOtp`, `register`, `login` | `auth` | Auth routes commented out in App at documented HEAD |
| `OTPModal` | `components/OTPModal.tsx` | Supplemental Authentication | `verifyNumber`, `verifyTelegram` | `auth` | Conditional MFA after login |

Unused: `pages/Home/components/GameCard.tsx` (no importer). `pages/Home/components/SportsTabs.tsx` is used only by `pages/Inplay`.

## Module 3: Game Detail (common module)

| Component / hook | File | API / responsibility |
|---|---|---|
| `GameDetails` / `useCatalogData` | `pages/GameDetails/index.tsx`, `pages/GameDetails/Hooks/useCatalogData.ts` | Catalogue, media metadata, market grouping and limits |
| `Markets` | `pages/Markets/index.tsx` | Catalogue polling and normal/fancy market rendering |
| `NormalMarket` / `NormalRow` | `pages/Markets/components/NormalMarket.tsx`, `pages/GameDetails/components/NormalRow.tsx` | Odds selection, min/max display, exposure and bet-slip setup |
| `BetSlip` / `Betslip` | `components/BetSlip.tsx`, `components/Betslip.tsx` | Stake/odds entry and `POST /bet/place` |
| `useBetSlip` | `hooks/useBetSlip.ts` | Bet payload preparation and client estimate |
| `useMarketExposureData` | `hooks/useMarketExposureData.ts` | Bookset lookup and current-slip exposure delta |
| `useCashOut` / `useCashout` | `pages/GameDetails/Hooks/useCashOut.tsx`, `hooks/useCashout.ts` | Local hedge candidate and bet-slip prefill |
