# Component inventory (User Panel)

This lists components that call APIs or own module logic, with their module and data dependencies. Modules 1-8 are documented; paths are relative to `src/`.

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

### rsplay scorecard, Live TV and raw scorecard (Modules 5–7)

| Component / hook | File | API hooks | Role |
|---|---|---|---|
| `useCatalogData` | `pages/GameDetails/Hooks/useCatalogData.ts` | `getScorecard` (once) | Exposes `liveScoreUrl`, `liveTvUrl` to game detail |
| `GameDetails` | `pages/GameDetails/index.tsx` | — | Chooses raw scorecard vs iframe; mobile Live TV toggle (< 1024 px) |
| `CustomLiveScoreCard` | `pages/GameDetails/components/CustomLiveScoreCard.tsx` | `getLiveScorecard` (1 s) | App-drawn cricket scorecard; reports "no data" to the parent |
| `LiveScoreCard` | `pages/GameDetails/components/LiveScoreCard.tsx` | — | Sandboxed scorecard iframe, 140/400 px |
| `BettingContainer` | `components/BettingContainer.tsx` | (`CurrentBets`) | Right panel ≥ 1280 px: Live TV toggle (logged in), matched bets |
| `RacingInside` | `pages/RacingInside/index.tsx` | `getScorecard` (once) | Race detail; passes `liveTvUrl` to `BettingContainer` |

Not rendered: `pages/GameDetails/components/Scorecard.tsx` (imported by `RacingInside` but not used; its `sharedIframe` is imported by `BettingContainer` but not used).

### rsplay reports (Module 4)

| Component / hook | File | API hooks | Redux | Role |
|---|---|---|---|---|
| `AccountStatement` | `pages/Reports/AccountStatement.tsx` | `getMyTransactions`, lazy `exportGameTransactions` | — | Context, dates, search, balances, export |
| `BetHistory` | `pages/Reports/BetHistory.tsx` | `getBetHistory` (`PAST`), lazy `exportBetHistory` | — | Sport, dates, search, export |
| `BetProfitLoss` | `pages/Reports/BetProfitLoss.tsx` | `getProfitLoss` ×2 | — | Sport (incl. Casino), dates, two totals |
| `CasinoBetHistory` | `pages/Reports/CasinoBetHistory.tsx` | `getCasinoRoundHistory` | — | Dates, round table, client P/L |
| `DatePickerInput` | `components/common/DatePickerInput.tsx` | — | — | `DD/MM/YYYY HH:mm` text ↔ react-datepicker; shared by all four |
| `Pagination`, `PageSizeSelector` | `components/common/` | — | — | Paging and 25/50/100 size; shared |
| `ProtectedRoute` | `components/common/ProtectedRoute.tsx` | — | `auth` | Guards all four routes |
| `ProfileDrawer` | `components/ProfileDrawer.tsx` | `getUserReference`, `getSystemSettings` | `auth`, `user`, `wallet` | Menu entry point to the reports; hides them for demo users |

Not routed: `pages/Reports/OLDCasinoBetHistory.tsx`, `pages/Reports/Transactions.tsx`. `pages/Reports/components/FilterContainer.tsx` is imported by no file.

### rsplay deposit and withdraw (Module 9)

| Component / hook | File | API hooks | Redux | Role |
|---|---|---|---|---|
| `FeatureRoute` | `components/common/FeatureRoute.tsx` | `getSystemSettings` (30 s) | `user` (demo, master owner) | Access rule for `/deposit` and `/withdraw` |
| `DepositMethodSection` | `pages/Deposit/components/DepositMethodSection.tsx` | `getDepositAccounts`, `uploadFile`, `depositWithdrawRequest` | — | Method selector, UPI/bank views, deposit submit |
| `DepositForm` | `pages/Deposit/components/DepositForm.tsx` | — | — | UTR, proof, amount, agree (UPI/bank) |
| `CryptoDeposit` + `Form` | `pages/Deposit/components/CryptoDeposit.tsx`, `Form.tsx` | `createCryptoDepositWithdrawRequest`, `uploadFile` | `user` (demo) | Wallet picker, USDT→INR conversion, crypto deposit |
| `CryptoRateConvertor` | `pages/Deposit/components/CryptoRateConvertor.tsx` | — | — | USDT input, computed INR; shared with crypto withdraw |
| `DepositHistorySection`, `WithdrawHistorySection` | `pages/Deposit/components/`, `pages/Withdraw/components/` | `getDepositWithdraw` | — | Request history (`Credit` / `Debit`) |
| `WithdrawAccountsSection` | `pages/Withdraw/components/WithdrawAccountsSection.tsx` | `getBankAccount`, `getUpiAccount` | — | Saved account cards, Add account modal |
| `AccountCard` + `AmountInput` | `pages/Withdraw/components/` | `depositWithdrawRequest`, `deleteAccount` | `wallet` | Bank/UPI withdraw and delete |
| `AccountForm`, `UpiForm`, `CryptoAccountForm` | `pages/Withdraw/components/` | `addBankAccount`, `addUpiAccount`, `addCryptoAccount`, `uploadFile`, `getCryptoNetwork` | — | Add account tabs |
| `CryptoAccountList` + `CryptoWithdrawForm` | `pages/Withdraw/` | `getCryptoAccounts`, `createCryptoDepositWithdrawRequest`, `deleteCryptoAccount` | `wallet` | Crypto withdraw and delete |

Not imported anywhere: `pages/Withdraw/CryptoWalletModal.tsx`.

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

### vishnu7 casino (Module 8)

| Component / hook | File | API hooks | Redux | Role |
|---|---|---|---|---|
| `Casino` (lobby page) | `pages/Casino/index.tsx` | via `useCasinoLobby` | — | Provider and category tabs, grid, infinite scroll, entry consent |
| `useCasinoLobby` | `hooks/useCasinoLobby.ts` | `getCasinoGames`, `getCasinoCategories`, `getCasinoProviders` | reads `casino.gameUrl`; dispatches `closeGame` | All lobby state, URL params, paging, launch lock |
| `useCasinoGameLauncher` | `hooks/useCasinoGameLauncher.ts` | `createCasinoSession` | dispatches `launchGame`, `setLoginModalOpen` | Guest and demo checks, session, navigate to the player |
| `useCasinoGamePlay` | `hooks/useCasinoGamePlay.ts` | — | — | Consent + 3 s lock wrapper for Dashboard and Home grids |
| `useCasinoConsentGate` / `useCasinoRouteConsent` | `hooks/useCasinoConsentGate.ts` | — | — | "1 POINT = …" notice, controlled by env |
| `CasinoConsentModal` | `components/CasinoConsentModal.tsx` | — | — | The notice popup |
| `CasinoGameCard` | `components/casino/CasinoGameCard.tsx` | — | — | Game tile used by the lobby, Dashboard and Home |
| `CasinoPlayground` | `pages/CasinoPlayground/index.tsx` | — | reads `user.info.username` | Full-screen player page; URL from router state |
| `CasinoGamePlayer` | `components/casino/CasinoGamePlayer.tsx` | — | — | The game iframe with a loading spinner |
| `QTECHLobby` | `pages/QTECHLobby/index.tsx` | `getLobbyUrlById` | reads `user.info.id` | Provider lobby iframe; unlinked route |
| `CasinoLayout` | `layouts/CasinoLayout.tsx` | (Header polls) | — | Header, marquee and sidebar around casino routes |

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
