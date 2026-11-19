# API inventory (User Panel)

This is the central registry of every RTK Query endpoint defined in the two reference repos, with the files that call each one. Full per-API documentation (request, response, UI mapping, frequency) lives in each module's docs and is linked from here as modules are completed.

| Repo | Commit | Endpoints defined | Defined but never called |
|---|---|---|---|
| rsplay-user | `810884b` | 94 definitions, 83 unique names (11 duplicate names, explained below) | 17 |
| vishnu7user | `6f3b811` | 64 definitions, 64 unique names | 16 |

## Method (how this list was produced)

`OBSERVED`. A script read every `.ts`/`.tsx` file at `HEAD` (`git show HEAD:<file>`) and collected each `name: builder.query|mutation` or `build.query|mutation`. For each endpoint it captured `url`, `method`, `providesTags`/`invalidatesTags` and whether `transformResponse`/`onQueryStarted` is present. It then searched every other file for the generated hook names (`useXQuery`, `useLazyXQuery`, `useXMutation`, `useXQueryState`) and for `endpoints.X`.

These URLs are built in code and were filled in by hand:
- rsplay `getRaceDetails` → `/catalogue/${eventId}?t=${Date.now()}` (`src/store/api/eventsApi.ts:346`)
- rsplay `getBooksetCalc` → `/exposure/bookset/calculation` with `params: { ...params, t: Date.now() }` (`src/store/api/booksetApi.ts:36`)
- vishnu7 `getBookset` → `/exposure/bookset/calculation?eventId=${eventId}&t=${Date.now()}` (`src/store/api/betApi.ts:207`)
- vishnu7 `getMatcheDetails` and `getRaceDetails` → `/catalogue/${eventId}` (`src/store/api/sportsApi.ts:229,236`)

Limitations: "Consumers" means files that reference the hook. It does not tell you which of two duplicate definitions a file imports. That is covered in the next section. Query parameters, bodies and response shapes are **not** listed here; they are documented per module.

All URLs are relative to `import.meta.env.VITE_API_BASE_URL`, falling back to `'/api'`. The base URL is environment configuration and its value is not recorded here. A few URLs in source have no leading slash (`events/scorecard/…`, `users/me`, `sports-provider/casino`, `events/popular`, `activity-log?…`). `INFERRED`: `fetchBaseQuery` joins them with the base URL either way, so they resolve the same.

## rsplay: duplicate endpoint definitions

`OBSERVED`. All rsplay endpoint files inject into the **single** `apiSlice` in `src/store/api/apiSlice.ts`. The `src/apis/` folder also has its own `apiSlice.ts`, but **nothing imports it**, so it is dead code. The files `src/apis/authApi.ts`, `src/apis/catalogueApi.ts` and `src/apis/userApi.ts` import `@/store/api/apiSlice`, so they are part of the same cache.

Because the endpoints share one slice, the same endpoint name defined twice resolves to **one** cache entry:

| Endpoint name | Definition 1 | Definition 2 | Who imports which |
|---|---|---|---|
| `sendOtp`, `registerUser`, `login`, `logout`, `forgotPassword`, `resetPassword`, `changePassword`, `demoLogin` | `src/apis/authApi.ts` | `src/store/api/authApi.ts` | Only `store/api/authApi.ts` is imported (by `useLogin`, `useRegister`, `useForgotPassword`, `ProfileDrawer`, `ChangePasswordModal`, `pages/ChangePassword`). `src/apis/authApi.ts` is never imported, so its injection never runs. |
| `getUserProfile`, `getUserWallets` | `src/apis/userApi.ts` (tags `UserDetails`, `overrideExisting: false`) | `src/store/api/userApi.ts` (tag `User`) | `walletSlice` imports `@/apis/userApi`. `userSlice`, `Header` and `OneClickBettingSection` import `@/store/api/userApi`. |
| `getNotifications` | `src/store/api/contentApi.ts` (tag `Content`) | `src/store/api/notificationApi.ts` (no tags) | `NotificationBar` uses contentApi. `HomeLayout` and `AlertNotification` use notificationApi. |

`INFERRED` (RTK Query 1.9.7 behaviour): when a name is injected a second time without `overrideExisting: true`, the **first** injection is kept and a development-mode warning is logged. Which definition wins depends on module import order. The URLs are identical, so the HTTP traffic is the same either way. Only the cache tags differ, and that matters only if a mutation invalidates `UserDetails` or `Content`. Tracked in [open-questions.md](open-questions.md).

## Shared APIs (called from more than one component)

These are candidates for duplicate-request analysis. RTK Query deduplicates concurrent subscribers that use the **same arguments** into one cache entry. When several subscribers poll the same entry, it is polled at the **shortest** interval among them. `INFERRED` from RTK Query semantics; per-page verification will happen during module work.

| Repo | Endpoint | Consumers | Notes |
|---|---|---|---|
| rsplay | `getSystemSettings` (`GET /system`) | `Header`, `Sidebar`, `ProfileDrawer`, `FeatureRoute`, `pages/Home`, `RacingDetails` | 30 s in 5 places, 10 s in `RacingDetails`. See [polling inventory](polling-and-frequency-inventory.md) |
| rsplay | `getNotifications` (`GET /notifications`) | `HomeLayout`, `AlertNotification`, `NotificationBar` | `HomeLayout` and `AlertNotification` both send `{type:'Alert'}` every 30 s, which is one cache entry |
| rsplay | `getEvents` (`GET /fixture`) | `useFixtureData` (used by `Inplay`, `SportsListing`, `SportsListingLogin`), `useSidebar` | `useFixtureData` polls every 2 s |
| rsplay | `getRaces` (`GET /fixture/race`) | `SportsListing`, `SportsListingLogin`, `Inplay`, `Racing` | 10 s, with different args per page |
| rsplay | `getScorecard` (`GET events/scorecard/:id`) | `useCatalogData`, `RacingInside` | Not polled. Returns `liveTvUrl` and `scorecardUrl` |
| rsplay | `getBooksetCalc` | `useMarketExposureData`, `useCashOut`, `useInnerMarketRow` | |
| rsplay | `getBetHistory` | `CurrentBets`, `Reports/BetHistory`, `Reports/UnsettledBet` | |
| rsplay | `getBanners` | `MainBanner`, `SecondaryBanner`, `SportBanner`, `WelcomeBannerModal` | |
| rsplay | `getStakeSet` | `StakeModal`, `useBetSlip`, `StakeSettings` | |
| vishnu7 | `getMatcheDetails` (`GET /catalogue/:id`) | `pages/Markets`, `pages/MultiMarket` | 1 s on Markets |
| vishnu7 | `getMatchesGroupedByCompetition` | `useGroupedFixtures` (Home, Inplay, Sports), `SearchDropdown` | 3 s by default |
| vishnu7 | `getMatches` (`GET /fixture`) | `Sidebar`, `usePopularEvents` | |
| vishnu7 | `getPinnedMarkets` | `PinMarketButton`, `MultiMarket` | Same args (`{page:1,limit:100}`) on purpose, so they share one cache entry (comment in `MultiMarket/index.tsx`) |
| vishnu7 | `getContactSupport` | `Header`, `LoginModal`, `AuthLayout`, `LoginPage` | |
| vishnu7 | `getStakes` | `Betslip`, `SetButtonValueModal`, `StackSetting` | |

## Where each API is fully documented

This section grows as modules are completed. "Canonical" means the full request, response and UI mapping lives at the link.

| Repo | Endpoint | Canonical doc | Also used by (usage notes) |
|---|---|---|---|
| both | Home Page capability summary | [Common Home reference](../docs/01-user-panel/01-home-page/home-page-reference.md) | Banners, popular fixtures, counts, and casino content in one module map |
| common | Game Detail core paths | [Game Detail API inventory](../docs/01-user-panel/03-game-detail/api-inventory.md) | Catalogue, bet placement, bookset, session P&L, and stake paths grouped by backend route |
| rsplay | `getBanners` | [Module 1 › api-inventory R1–R4](../docs/01-user-panel/01-home-page/api-inventory.md#r1r4-getbanners-canonical) | [Module 2 SportBanner usage](../docs/01-user-panel/02-inplay/api-inventory.md#rsplay-810884b), `WelcomeBannerModal` |
| rsplay | `getEvents` | [Module 1 › R5](../docs/01-user-panel/01-home-page/api-inventory.md#r5-getevents-canonical-shared-with-module-2) | [Module 2 route arguments](../docs/01-user-panel/02-inplay/api-inventory.md#rsplay-810884b), `useSidebar` |
| rsplay | `getRaces` | [Module 1 › R6–R7](../docs/01-user-panel/01-home-page/api-inventory.md#r6r7-getraces-canonical) | [Module 2 In-Play and Racing usage](../docs/01-user-panel/02-inplay/api-inventory.md#rsplay-810884b) |
| rsplay | `getSystemSettings` | [Module 1 › R9](../docs/01-user-panel/01-home-page/api-inventory.md#r9-getsystemsettings-canonical) | Layout (Phase 4), `FeatureRoute`, `RacingDetails` |
| rsplay | `getCasinoGames` | Module 8 (pending) | [Module 1 usage R8](../docs/01-user-panel/01-home-page/api-inventory.md#r8-getcasinogames-home-usage) |
| vishnu7 | `getBanners` | [Module 1 › V1–V2](../docs/01-user-panel/01-home-page/api-inventory.md#v1v2-getbanners-canonical-vishnu7) | |
| vishnu7 | `getHomeCasinoGames`, `getHomeProviderGames` | [Module 1 › V3–V4](../docs/01-user-panel/01-home-page/api-inventory.md#v3v4-gethomecasinogames-gethomeprovidergames-canonical) | |
| vishnu7 | `getMatchesGroupedByCompetition` | [Module 1 › V6](../docs/01-user-panel/01-home-page/api-inventory.md#v6-getmatchesgroupedbycompetition-canonical-shared-with-module-2) | [Module 2 In-Play and sport-route arguments](../docs/01-user-panel/02-inplay/api-inventory.md#vishnu7-6f3b811), `SearchDropdown` |
| vishnu7 | `getPopularEvents` | [Module 1 › V7–V8](../docs/01-user-panel/01-home-page/api-inventory.md#v7v8-getpopularevents--getmatches) | |
| vishnu7 | `getMatches` | Module 2 (pending) | [Module 1 usage V8](../docs/01-user-panel/01-home-page/api-inventory.md#v7v8-getpopularevents--getmatches) |
| both | `sendOtp` (`POST /auth/send-code`) | [Login and Signup API inventory](../docs/01-user-panel/authentication/api-inventory.md) | OTP request before registration |
| both | `registerUser` / `register` (`POST /auth/register`) | [Login and Signup API inventory](../docs/01-user-panel/authentication/api-inventory.md) | Same path and method; request body shapes differ (Q-21) |
| both | `login` (`POST /auth/login`) | [Login and Signup API inventory](../docs/01-user-panel/authentication/api-inventory.md) | Same path and request fields; post-login behavior differs |

## Same backend URL, different endpoint names (rsplay ↔ vishnu7)

The two frontends call the same backend paths under different names.

**Backend relationship (team confirmation, 2026-11-18, Q-12):** each brand runs its own backend, built from the same backend template. Common modules (auth, fixtures, catalogue, betting, exposure, reports, casino) expose the same APIs; some brands add extra modules.

How the handbook applies this:
- **Backend contract** (path, method, response shape) for a common endpoint: a shape confirmed in one repo may be cited for the other, labelled `INFERRED (shared backend template)` until it is seen in that repo's code too.
- **Frontend behaviour** (which fields are sent, how the response is transformed, validated, polled and rendered) is still documented **separately per repo**, because the two frontends come from different template families.
- **Brand-specific endpoints** (e.g. vishnu7 `/pinned-market`, MFA; rsplay `/coin/config`, `/match-odds-commission`) are not assumed to exist on the other brand's backend.

| Backend path | rsplay name | vishnu7 name |
|---|---|---|
| `POST /bet/place` | `placeBet` | `betPlace` |
| `GET /catalogue/:eventId` | `getCatalogueByEventId`, `getRaceDetails` | `getMatcheDetails`, `getRaceDetails` |
| `GET /exposure/bookset/calculation` | `getBooksetCalc` | `getBookset` |
| `GET /exposure/profit-loss` | `getFancyProfitLoss` | `getSessionPL` |
| `GET events/scorecard/:eventId` | `getScorecard` | `getMediaUrls` |
| `GET /events/raw-scorecard/:eventId` | `getRawScorecard` **and** `getLiveScorecard` (same URL, two endpoints) | `getRawScore` |
| `GET /fixture` | `getEvents` | `getMatches` |
| `GET /competitions` | `getCompetitionById` | `getSportCompetitions` |
| `GET/PUT /stakeset` | `getStakeSet` / `updateStakeSet` | `getStakes` / `updateStakes` |
| `GET /users/me` | `getUserProfile` | `getUserInfo` |
| `POST /auth/register` | `registerUser` | `register` |
| `POST /auth/demo/login` | `demoLogin` | `loginDemoUser` |
| `GET /exports/report/me` | `getExportReports` | `getMyExports` |

---

## rsplay-user: all endpoints (`810884b`)

Paths are relative to the repo root. "L" is the line of the endpoint definition.

### `src/apis/authApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `sendOtp` (L6) | mutation | POST | `/auth/send-code` | — | `pages/Auth/hooks/useRegister.ts` | Dead definition: `src/apis/authApi.ts` is not imported anywhere, so this injection never runs. Consumers use `src/store/api/authApi.ts`. |
| `registerUser` (L16) | mutation | POST | `/auth/register` | — | `pages/Auth/hooks/useRegister.ts` | Dead definition: `src/apis/authApi.ts` is not imported anywhere, so this injection never runs. Consumers use `src/store/api/authApi.ts`. |
| `login` (L36) | mutation | POST | `/auth/login` | — | `pages/Auth/hooks/useLogin.ts` | Dead definition: `src/apis/authApi.ts` is not imported anywhere, so this injection never runs. Consumers use `src/store/api/authApi.ts`. |
| `logout` (L62) | mutation | POST | `/auth/logout` | — | `components/ProfileDrawer.tsx` | Dead definition: `src/apis/authApi.ts` is not imported anywhere, so this injection never runs. Consumers use `src/store/api/authApi.ts`. |
| `forgotPassword` (L70) | mutation | POST | `/auth/forgot-password` | — | `pages/Auth/hooks/useForgotPassword.ts` | Dead definition: `src/apis/authApi.ts` is not imported anywhere, so this injection never runs. Consumers use `src/store/api/authApi.ts`. |
| `resetPassword` (L79) | mutation | POST | `/auth/reset-password` | — | `pages/Auth/hooks/useForgotPassword.ts` | Dead definition: `src/apis/authApi.ts` is not imported anywhere, so this injection never runs. Consumers use `src/store/api/authApi.ts`. |
| `changePassword` (L91) | mutation | POST | `/users/me/change-password` | — | `components/modals/ChangePasswordModal.tsx`<br>`pages/ChangePassword.tsx` | Dead definition: `src/apis/authApi.ts` is not imported anywhere, so this injection never runs. Consumers use `src/store/api/authApi.ts`. |
| `demoLogin` (L99) | mutation | POST | `/auth/demo/login` | — | `pages/Auth/hooks/useLogin.ts` | Dead definition: `src/apis/authApi.ts` is not imported anywhere, so this injection never runs. Consumers use `src/store/api/authApi.ts`. |

### `src/apis/catalogueApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getCatalogueByEventId` (L44) | query | GET | `/catalogue/${eventId}` + optional query string | — | `pages/GameDetails/Hooks/useCatalogData.ts` |  |

### `src/apis/userApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getUserProfile` (L12) | query | GET | `/users/me` | P:['UserDetails'] | `components/Header.tsx`<br>`components/OneClickBettingSection.tsx`<br>`store/slices/userSlice.ts` | **Duplicate endpoint name** (see the duplicates section) |
| `updateUserInfo` (L20) | mutation | PATCH | `users/me` | I:['UserDetails'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `getUserWallets` (L44) | query | GET | `/users/me/wallets` | — | `components/Header.tsx`<br>`store/slices/walletSlice.ts` | **Duplicate endpoint name** (see the duplicates section) |
| `getContactSupport` (L51) | query | GET | `/contact-support` | — | `components/LoginModal.tsx`<br>`components/MobileFooterBar.tsx`<br>`components/SignupModal.tsx`<br>`utils/constants.ts` |  |
| `getContactSupportAccount` (L59) | query | GET | `/contact-support/show-account` | — | `components/MobileFooterBar.tsx`<br>`components/Sidebar.tsx` | transform |

### `src/store/api/accountApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `addBankAccount` (L21) | mutation | POST | `/bank` | I:['Account'] | `pages/Withdraw/components/AccountForm.tsx` |  |
| `addUpiAccount` (L29) | mutation | POST | `/upi` | I:['Account'] | `pages/Withdraw/components/UpiForm.tsx` |  |
| `depositWithdrawRequest` (L37) | mutation | POST | `/${method}/deposit-withdraw-request` | I:['Account', 'User'] | `pages/Deposit/components/DepositMethodSection.tsx`<br>`pages/Withdraw/components/AccountCard.tsx` |  |
| `deleteAccount` (L48) | mutation | DELETE | `/${type}/${id}` | I:['Account'] | `pages/Withdraw/components/AccountCard.tsx` |  |
| `getBankAccount` (L55) | query | GET | `/bank` | P:['Account'] | `pages/Withdraw/components/WithdrawAccountsSection.tsx` |  |
| `getUpiAccount` (L62) | query | GET | `/upi` | P:['Account'] | `pages/Withdraw/components/WithdrawAccountsSection.tsx` |  |
| `getDepositWithdraw` (L69) | query | GET | `/banker/my-deposit-withdraw` | P:['Account'] | `pages/Deposit/components/DepositHistorySection.tsx`<br>`pages/Withdraw/components/WithdrawHistorySection.tsx` |  |
| `uploadFile` (L77) | mutation | POST | `/upload` | I:['Account'] | `pages/Deposit/components/DepositMethodSection.tsx`<br>`pages/Deposit/components/Form.tsx`<br>`pages/Withdraw/CryptoWalletModal.tsx`<br>`pages/Withdraw/components/CryptoAccountForm.tsx` |  |
| `getDepositAccounts` (L90) | query | GET | `/banker/show-account` | P:['Account'] | `pages/Deposit/components/DepositMethodSection.tsx` |  |

### `src/store/api/authApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `sendOtp` (L5) | mutation | POST | `/auth/send-code` | — | `pages/Auth/hooks/useRegister.ts` | **Duplicate endpoint name** (see the duplicates section) |
| `registerUser` (L15) | mutation | POST | `/auth/register` | — | `pages/Auth/hooks/useRegister.ts` | **Duplicate endpoint name** (see the duplicates section) |
| `login` (L38) | mutation | POST | `/auth/login` | — | `pages/Auth/hooks/useLogin.ts` | **Duplicate endpoint name** (see the duplicates section) |
| `logout` (L61) | mutation | POST | `/auth/logout` | — | `components/ProfileDrawer.tsx` | **Duplicate endpoint name** (see the duplicates section) |
| `forgotPassword` (L69) | mutation | POST | `/auth/forgot-password` | — | `pages/Auth/hooks/useForgotPassword.ts` | **Duplicate endpoint name** (see the duplicates section) |
| `resetPassword` (L78) | mutation | POST | `/auth/reset-password` | — | `pages/Auth/hooks/useForgotPassword.ts` | **Duplicate endpoint name** (see the duplicates section) |
| `changePassword` (L90) | mutation | POST | `/users/me/change-password` | — | `components/modals/ChangePasswordModal.tsx`<br>`pages/ChangePassword.tsx` | **Duplicate endpoint name** (see the duplicates section) |
| `getCaptcha` (L99) | query | POST | `/captcha` | — | — | Defined but not called (`NOT FOUND` in consumers) |
| `demoLogin` (L106) | mutation | POST | `/auth/demo/login` | — | `pages/Auth/hooks/useLogin.ts` | **Duplicate endpoint name** (see the duplicates section) |

### `src/store/api/betPlaceApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `placeBet` (L13) | mutation | POST | `/bet/place` | I:['BooksetCalc', 'BetPlace'] | `hooks/useBetSlip.ts`<br>`hooks/useOneClickBet.ts` |  |

### `src/store/api/betReportApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getBetHistory` (L101) | query | GET | `/bet/history` | P:['BetPlace'] | `components/common/CurrentBets.tsx`<br>`pages/Reports/BetHistory.tsx`<br>`pages/Reports/UnsettledBet.tsx` |  |
| `getProfitLoss` (L109) | query | GET | `/bet/profit-loss` | P:['BetPlace'] | `pages/Reports/BetProfitLoss.tsx` |  |
| `exportBetHistory` (L118) | query | POST | `/bet/export-history` | — | `pages/Reports/BetHistory.tsx`<br>`pages/Reports/UnsettledBet.tsx` |  |

### `src/store/api/bonusApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getBonusApplicants` (L6) | query | GET | `/bonuses/applicants/list` | P:['BonusApplicants'] | `pages/BonusStatement/index.tsx` |  |

### `src/store/api/booksetApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getBooksetCalc` (L36) | query | GET | `/exposure/bookset/calculation?{...params}&t=${Date.now()}` | P:['BooksetCalc'] | `hooks/useMarketExposureData.ts`<br>`pages/GameDetails/Hooks/useCashOut.tsx`<br>`pages/GameDetails/Hooks/useInnerMarketRow.ts` |  |
| `getFancyProfitLoss` (L44) | query | GET | `/exposure/profit-loss` | — | `components/BookListModal.tsx` |  |

### `src/store/api/casinoApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getCasinoGames` (L15) | query | GET | `/casino/games` + optional query string | — | `pages/CasinoGames/hooks/useCasinoGames.ts`<br>`pages/Home/components/PopularGames.tsx` |  |
| `getCasinoCategories` (L34) | query | GET | `/casino/category` + optional query string | P:['CasinoCategories'] | `pages/CasinoGames/hooks/useCasinoGames.ts` |  |
| `getCasinoProviders` (L52) | query | GET | `/casino/providers` + optional query string | P:['CasinoProviders'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `getCasinoRoundHistory` (L73) | query | GET | `/casino/round/history?${params.toString()}` | P:['CasinoRoundHistory'] | `pages/Reports/CasinoBetHistory.tsx`<br>`pages/Reports/OLDCasinoBetHistory.tsx` |  |
| `createCasinoSession` (L97) | mutation | POST | `/casino/create-session/${id}` | I:['CasinoSession'] | `pages/CasinoGames/hooks/useCasinoGames.ts`<br>`pages/Game/hooks/useGame.ts` |  |

### `src/store/api/casinoHomePageApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getTrendingGames` (L89) | query | GET | `/casino/trending?status=${status}` | — | — | Defined but not called (`NOT FOUND` in consumers) |
| `getRecentGames` (L101) | query | GET | `/casino/recent` + optional query string | — | — | Defined but not called (`NOT FOUND` in consumers) |
| `addToFavorite` (L113) | mutation | PUT | `/casino/favorite/${id}` | — | `pages/CasinoGames/CasinoFavouriteGames.tsx`<br>`pages/CasinoGames/hooks/useCasinoGames.ts` |  |
| `getFavoriteGames` (L126) | query | GET | `/casino/favorite` + optional query string | — | `pages/CasinoGames/CasinoFavouriteGames.tsx` |  |
| `getMostPlayedGames` (L143) | query | GET | `/casino/most-played` | — | — | Defined but not called (`NOT FOUND` in consumers) |
| `getCasinoStaticGames` (L151) | query | GET | `/casino/static/games` | — | — | Defined but not called (`NOT FOUND` in consumers) |

### `src/store/api/coinApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getCoinConfig` (L17) | query | GET | `/coin/config` | P:['CoinConfig'] | `pages/Coins/index.tsx` |  |

### `src/store/api/commissionApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getMyCommissions` (L55) | query | GET | `/match-odds-commission/my-commissions` | — | `pages/Reports/Commission.tsx` |  |

### `src/store/api/contentApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getBanners` (L6) | query | GET | `/banners` | P:['Content'] | `components/WelcomeBannerModal.tsx`<br>`pages/Home/components/MainBanner.tsx`<br>`pages/Home/components/SecondaryBanner.tsx`<br>`pages/Sports/components/SportBanner.tsx` |  |
| `getNotifications` (L14) | query | GET | `/notifications` | P:['Content'] | `components/AlertNotification.tsx`<br>`layouts/HomeLayout.tsx`<br>`pages/Inplay/components/NotificationBar.tsx` | **Duplicate endpoint name** (see the duplicates section) |

### `src/store/api/depositApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getActiveBanker` (L13) | query | GET | `/banker/show-account` | — | — | Defined but not called (`NOT FOUND` in consumers) |
| `createDepositWithdrawRequest` (L22) | mutation | POST | `/payment/deposit-withdraw-request` | I:['DepositWithdraw'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `createAccountDepositRequest` (L30) | mutation | POST | `/bank/deposit-withdraw-request` | I:['DepositWithdraw'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `createCryptoDepositWithdrawRequest` (L41) | mutation | POST | `/crypto/deposit-withdraw-request` | I:['DepositWithdraw', 'Account'] | `pages/Deposit/components/CryptoDeposit.tsx`<br>`pages/Withdraw/CryptoWithdrawForm.tsx` |  |
| `getMyDepositWithdraw` (L51) | query | GET | `/banker/my-deposit-withdraw` + optional query string | P:['DepositWithdraw', 'Account'] | — | Defined but not called (`NOT FOUND` in consumers) |

### `src/store/api/eventsApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getFixtureCounts` (L291) | query | GET | `/fixture/counts` | P:['Events'] | `components/Header.tsx` |  |
| `getEvents` (L298) | query | GET | `/fixture` + optional query string | P:['Events'] | `hooks/useSidebar.ts`<br>`pages/Inplay/Hooks/useFixtureData.ts` |  |
| `getScorecard` (L317) | query | GET | `events/scorecard/${eventId}` | — | `pages/GameDetails/Hooks/useCatalogData.ts`<br>`pages/RacingInside/index.tsx` |  |
| `getRaces` (L324) | query | GET | `/fixture/race` | P:['Sports'] | `pages/Home/components/SportsListing.tsx`<br>`pages/Home/components/SportsListingLogin.tsx`<br>`pages/Inplay/index.tsx`<br>`pages/Racing/index.tsx` |  |
| `getRaceDetails` (L346) | query | GET | `/catalogue/${eventId}?t=${Date.now()}` | P:['Sports'] | `pages/RacingInside/index.tsx` |  |
| `getRawScorecard` (L353) | query | GET | `/events/raw-scorecard/${eventId}` | — | `pages/GameDetails/components/CricketScoreCard.tsx` | transform |
| `getLiveScorecard` (L360) | query | GET | `/events/raw-scorecard/${eventId}` | — | `pages/GameDetails/components/CustomLiveScoreCard.tsx` | transform |

### `src/store/api/exportReportApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getExportReports` (L33) | query | GET | `/exports/report/me` | — | `pages/Reports/ExportReportHistory.tsx` |  |

### `src/store/api/fcmApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `registerFcmDevice` (L5) | mutation | POST | `/firebase/firebase/devices` | — | `lib/pushNotifications.ts` |  |
| `deleteFcmDevice` (L12) | mutation | DELETE | `/firebase/firebase/devices/${encodeURIComponent(fid)}` | — | `lib/pushNotifications.ts` |  |

### `src/store/api/notificationApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getNotifications` (L30) | query | GET | `/notifications` | — | `components/AlertNotification.tsx`<br>`layouts/HomeLayout.tsx`<br>`pages/Inplay/components/NotificationBar.tsx` | **Duplicate endpoint name** (see the duplicates section) |

### `src/store/api/oneClickBettingApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getOneClickBetting` (L31) | query | GET | `/users/one-click-betting` | P:['OneClickBetting'] | `components/OneClickBettingSection.tsx`<br>`store/slices/oneClickBetSlice.ts` |  |
| `saveOneClickBetting` (L39) | mutation | POST | `/users/one-click-betting` | I:['OneClickBetting'] | `components/OneClickBettingSection.tsx`<br>`store/slices/oneClickBetSlice.ts` |  |

### `src/store/api/resultsApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getResults` (L27) | query | GET | `/results` | — | `pages/Results/index.tsx` |  |

### `src/store/api/sidebarApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getCompetitionById` (L25) | query | GET | `/competitions?sport=${sportName}` | P:['Competitions'] | `hooks/useSidebar.ts` |  |

### `src/store/api/stakesApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getStakeSet` (L25) | query | GET | `/stakeset` | P:['Stake'] | `components/StakeModal.tsx`<br>`hooks/useBetSlip.ts`<br>`pages/StakeSettings/index.tsx` |  |
| `updateStakeSet` (L33) | mutation | PUT | `/stakeset` | I:['Stake'] | `components/StakeModal.tsx`<br>`pages/StakeSettings/index.tsx` |  |

### `src/store/api/systemApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getSystemSettings` (L27) | query | GET | `/system` | P:['SystemSettings'] | `components/Header.tsx`<br>`components/ProfileDrawer.tsx`<br>`components/Sidebar.tsx`<br>`components/common/FeatureRoute.tsx`<br>`pages/Home/index.tsx`<br>`pages/RacingInside/component/RacingDetails.tsx` |  |

### `src/store/api/transactionApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getMyTransactions` (L62) | query | GET | `/users/me/transactions` | — | `pages/Reports/AccountStatement.tsx`<br>`pages/Reports/Transactions.tsx` |  |
| `exportGameTransactions` (L84) | query | POST | `/users/transactions/export-userTransaction` | — | `pages/Reports/AccountStatement.tsx` |  |

### `src/store/api/turnoverHistory.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getTurnover` (L6) | query | GET | `/turnover` | P:['Turnover'] | `pages/Reports/Turnover.tsx` |  |

### `src/store/api/userApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getUserProfile` (L39) | query | GET | `/users/me` | P:['User'] | `components/Header.tsx`<br>`components/OneClickBettingSection.tsx`<br>`store/slices/userSlice.ts` | **Duplicate endpoint name** (see the duplicates section) |
| `getUserWallets` (L46) | query | GET | `/users/me/wallets` | — | `components/Header.tsx`<br>`store/slices/walletSlice.ts` | **Duplicate endpoint name** (see the duplicates section) |
| `getUserReference` (L53) | query | GET | `/users/reference/user` | — | `components/ProfileDrawer.tsx` |  |
| `getIsMasterOwner` (L60) | query | GET | `/users/is/master-owner/user` | — | `components/Header.tsx`<br>`store/slices/userSlice.ts` |  |

### `src/store/api/withdrawApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `createEwallet` (L21) | mutation | POST | `/payment/ewallet` | I:['WithdrawAccount'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `createBankAccount` (L38) | mutation | POST | `/bank` | I:['WithdrawAccount'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `getUserPaymentAccounts` (L58) | query | GET | `/payment` | P:['WithdrawAccount'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `deletePaymentAccount` (L68) | mutation | DELETE | `/payment/${id}` | I:['WithdrawAccount'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `getUserBankAccounts` (L76) | query | GET | `/bank` | P:['WithdrawAccount'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `deleteBankAccount` (L85) | mutation | DELETE | `/bank/${id}` | I:['WithdrawAccount'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `getCryptoAccounts` (L93) | query | GET | `/crypto` | P:['CryptoWithdrawWallet'] | `pages/Withdraw/CryptoAccountList.tsx` |  |
| `getCryptoNetwork` (L101) | query | GET | `/crypto/networks` | P:['CryptoWithdrawWallet'] | `pages/Withdraw/CryptoNetworkSelector.tsx` |  |
| `addCryptoAccount` (L110) | mutation | POST | `/crypto` | I:['CryptoWithdrawWallet'] | `pages/Withdraw/CryptoWalletModal.tsx`<br>`pages/Withdraw/components/CryptoAccountForm.tsx` |  |
| `deleteCryptoAccount` (L119) | mutation | DELETE | `/crypto/${id}` | I:['CryptoWithdrawWallet', 'DepositWithdraw'] | `pages/Withdraw/CryptoWithdrawForm.tsx` |  |

---

## vishnu7user: all endpoints (`6f3b811`)

### `src/store/api/authApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `login` (L70) | mutation | POST | `/auth/login` | I:['Auth', 'Support', 'User'] | `components/modals/LoginModal.tsx`<br>`pages/auth/LoginPage.tsx` |  |
| `loginDemoUser` (L78) | mutation | POST | `/auth/demo/login` | I:['Auth', 'Support', 'User'] | `pages/auth/LoginPage.tsx` |  |
| `register` (L85) | mutation | POST | `/auth/register` | I:['Auth', 'User'] | `pages/auth/SignupPage.tsx` |  |
| `sendOtp` (L93) | mutation | POST | `/auth/send-code` | I:['Auth'] | `pages/auth/SignupPage.tsx` |  |
| `forgotPassword` (L101) | mutation | POST | `/auth/forgot-password` | I:['Auth'] | `components/ForgotPasswordModal.tsx` |  |
| `resetPassword` (L109) | mutation | POST | `/auth/reset-password` | I:['Auth'] | `components/ForgotPasswordModal.tsx` |  |
| `logout` (L117) | mutation | POST | `/auth/logout` | I:['Auth'] | `components/UserDropdown.tsx` | onQueryStarted |

### `src/store/api/betApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getBookset` (L207) | query | GET | `/exposure/bookset/calculation?eventId=${eventId}&t=${Date.now()}` | P:['Bets'] | `hooks/useMarketExposureData.ts` |  |
| `betPlace` (L213) | mutation | POST | `/bet/place` | I:['Bets'] | `components/Betslip.tsx` | onQueryStarted |
| `getStakes` (L232) | query | GET | `/stakeset` | P:['Bets'] | `components/Betslip.tsx`<br>`components/SetButtonValueModal.tsx`<br>`pages/StackSetting/index.tsx` |  |
| `updateStakes` (L241) | mutation | PUT | `/stakeset` | I:['Bets'] | `components/SetButtonValueModal.tsx`<br>`pages/StackSetting/index.tsx` | onQueryStarted |
| `getOpenBetsSummary` (L262) | query | GET | `/bet/open-bets/summary` | P:['Bets'] | `components/ExposureSummaryModal.tsx` |  |
| `getSessionPL` (L270) | query | GET | `/exposure/profit-loss` | P:['Bets'] | `pages/Markets/components/Fancy.tsx` |  |
| `getBetHistory` (L285) | query | GET | `/bet/history` | P:['Bets'] | `components/MyBets.tsx`<br>`pages/BetHistory/index.tsx` |  |
| `getProfitLossSummary` (L304) | query | GET | `/bet/profit-loss/summary` | — | `pages/ProfitLoss/index.tsx` |  |
| `getEventProfitLossBets` (L319) | query | GET | `/bet/profit-loss/event/${eventId}` | — | `pages/AccountStatment/components/StatementBets.tsx` |  |

### `src/store/api/casinoApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getCasinoGames` (L206) | query | GET | `/casino/games` + optional query string | — | `hooks/useCasinoLobby.ts` |  |
| `getHomePageCasinoGames` (L226) | query | GET | `/casino/static/games` | — | — | Defined but not called (`NOT FOUND` in consumers) |
| `getHomeCasinoSidebarGames` (L237) | query | GET | `/casino/home-section/games` | — | — | Defined but not called (`NOT FOUND` in consumers) |
| `getHomeFavouriteCasinoTables` (L245) | query | GET | `/casino/recent-tables` | — | `pages/Home/components/CasinoGames.tsx` |  |
| `getCasinoCategories` (L253) | query | GET | `/casino/category` + optional query string | P:['CasinoCategories'] | `hooks/useCasinoLobby.ts` |  |
| `getCasinoGameProviders` (L272) | query | GET | `sports-provider/casino` | P:['CasinoProviders'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `getCasinoProviders` (L283) | query | GET | `/casino/providers` + optional query string | P:['CasinoProviders'] | `hooks/useCasinoLobby.ts` |  |
| `getCasinoRoundHistory` (L304) | query | GET | `/casino/round/history?${params.toString()}` | P:['CasinoRoundHistory'] | `pages/CasinoBetHistory/index.tsx` |  |
| `createCasinoSession` (L325) | mutation | POST | `/casino/create-session/${id}` | I:['CasinoSession'] | `hooks/useCasinoGameLauncher.ts` |  |
| `getLobbyUrlById` (L334) | query | GET | `/casino/lobby/${userId}` | I:['CasinoSession'] | `pages/QTECHLobby/index.tsx` |  |
| `launchGame` (L341) | mutation | POST | `/casino/gamelauncher/${id}` | I:['CasinoSession'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `getHomeCasinoGames` (L349) | query | GET | `/casino/home/games` | — | `pages/Dashboard/index.tsx`<br>`pages/Home/components/CasinoGames.tsx` |  |
| `getHomeProviderGames` (L356) | query | GET | `/casino/home/provider` | — | `pages/Dashboard/index.tsx` |  |

### `src/store/api/contentApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getBanners` (L6) | query | GET | `/banners` | P:['Content'] | `pages/Dashboard/index.tsx`<br>`pages/Home/components/WelcomePopup.tsx` |  |
| `getNotifications` (L14) | query | GET | `/notifications` | P:['Content'] | `components/Marquee.tsx` |  |

### `src/store/api/mfaApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `telegramSetup` (L16) | mutation | POST | `/telegram/setup` | I:['Auth'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `mobileSetup` (L27) | mutation | POST | `/mfa/setup` | I:['Auth'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `verifyTelegram` (L38) | mutation | POST | `/auth/telegram/verifytelegram` | I:['Auth'] | `components/OTPModal.tsx` |  |
| `verifyNumber` (L46) | mutation | POST | `/auth/mfa/verifymfa` | I:['Auth'] | `components/OTPModal.tsx` |  |
| `enableMfa` (L54) | mutation | POST | `/mfa/verify-enable-mfa` | I:['Auth'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `disableMfa` (L62) | mutation | POST | `/mfa/verify-disable-mfa` | I:['Auth'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `disableTelegramMfa` (L70) | mutation | POST | `/telegram/verify-disable-telegram` | I:['Auth'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `disableTelegramMfaOtp` (L78) | mutation | POST | `/telegram/disable` | I:['Auth'] | — | Defined but not called (`NOT FOUND` in consumers) |

### `src/store/api/reportsApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getMyTransactions` (L204) | query | GET | `/users/me/transactions` | — | — | Defined but not called (`NOT FOUND` in consumers) |
| `getAccountStatement` (L226) | query | GET | `/users/transactions/statement` | — | `pages/AccountStatment/index.tsx` |  |
| `exportAccountStatement` (L244) | mutation | POST | `/users/transactions/statement/export` | — | `pages/AccountStatment/index.tsx` |  |
| `getMyExports` (L258) | query | GET | `/exports/report/me` | — | `pages/AccountStatment/index.tsx` |  |
| `getStatementMarketBets` (L274) | query | GET | `/users/transactions/statement/market-bets` | — | `pages/AccountStatment/components/StatementBets.tsx` |  |
| `getActivityLog` (L287) | query | GET | `activity-log?${params.toString()}` | — | `pages/ActivityLog/index.tsx` |  |

### `src/store/api/sportsApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getSportCompetitions` (L161) | query | GET | `/competitions?` | P:['Sports'] | `components/common/Sidebar.tsx` |  |
| `getPopularEvents` (L169) | query | GET | `events/popular` | P:['Sports'] | `hooks/usePopularEvents.ts` |  |
| `getMatches` (L176) | query | GET | `/fixture` | P:['Sports'] | `components/common/Sidebar.tsx`<br>`hooks/usePopularEvents.ts` |  |
| `getMatchesGroupedByCompetition` (L198) | query | GET | `/fixture/groupByCompetition` | P:['Sports'] | `components/common/SearchDropdown.tsx`<br>`hooks/useGroupedFixtures.ts` |  |
| `getRaces` (L213) | query | GET | `/fixture/race` | P:['Sports'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `getMatcheDetails` (L229) | query | GET | `/catalogue/${eventId}` | P:['Sports'] | `pages/Markets/index.tsx`<br>`pages/MultiMarket/index.tsx` |  |
| `getRaceDetails` (L236) | query | GET | `/catalogue/${eventId}` | P:['Sports'] | — | Defined but not called (`NOT FOUND` in consumers) |
| `getMediaUrls` (L243) | query | GET | `events/scorecard/${eventId}` | P:['Sports'] | `pages/Markets/components/Media.tsx` |  |
| `getRawScore` (L249) | query | GET | `/events/raw-scorecard/${eventId}` | — | `pages/Markets/components/Media.tsx` |  |
| `getPinnedMarkets` (L254) | query | GET | `/pinned-market` | P:['PinnedMarkets'] | `pages/Markets/components/PinMarketButton.tsx`<br>`pages/MultiMarket/index.tsx` |  |
| `pinMarket` (L265) | mutation | POST | `/pinned-market` | I:['PinnedMarkets'] | `pages/Markets/components/PinMarketButton.tsx` |  |
| `unpinMarket` (L273) | mutation | DELETE | `/pinned-market/${eventId}` | I:['PinnedMarkets'] | `pages/Markets/components/PinMarketButton.tsx` |  |

### `src/store/api/userApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getUserInfo` (L18) | query | GET | `/users/me` | P:['User'] | `components/Header.tsx` | onQueryStarted |
| `updateUserInfo` (L40) | mutation | PATCH | `/users/me` | I:(result, error) => (error ? [] : ['User']) | — | Defined but not called (`NOT FOUND` in consumers); onQueryStarted |
| `changePassword` (L56) | mutation | POST | `/users/me/change-password` | I:(result, error) => (error ? [] : ['User']) | `components/ChangePasswordModal.tsx`<br>`pages/ChangePassword/index.tsx` |  |
| `getUserWallets` (L66) | query | GET | `/users/me/wallets` | P:['Bets', 'User'] | `components/Header.tsx` | onQueryStarted |
| `getContactSupport` (L82) | query | GET | `/contact-support` | P:['Support'] | `components/Header.tsx`<br>`components/modals/LoginModal.tsx`<br>`layouts/AuthLayout.tsx`<br>`pages/auth/LoginPage.tsx` | onQueryStarted |
| `getStakeDetails` (L101) | query | GET | `/user/get-usermeta-details` | — | — | Defined but not called (`NOT FOUND` in consumers); onQueryStarted |
| `updateStakeDetails` (L116) | mutation | PUT | `/user/update-chipssetting` | — | — | Defined but not called (`NOT FOUND` in consumers); onQueryStarted |
