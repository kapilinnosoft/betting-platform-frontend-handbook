# API inventory (User Panel)

This is the central registry of every RTK Query endpoint defined in the two reference repos, with the files that call each one. Full per-API documentation (request, response, UI mapping, frequency) lives in each module's docs and is linked from here as modules are completed.

| Repo | Commit | Endpoints defined | Defined but never called |
|---|---|---|---|
| rsplay-user | `810884b` | 94 definitions, 83 unique names (11 duplicate names, explained below) | 17 |
| vishnu7user | `6f3b811` | 64 definitions, 64 unique names | 16 |

rsplay-user has moved to `7a89e53` (10 commits). Modules 10 onward are documented at `7a89e53`. Those commits change `store/api/eventsApi.ts` and `store/api/betReportApi.ts`, so the rsplay rows below for those two files may be out of date until the registry is regenerated (Modules 1-4 re-check, pending).

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
| `getUserProfile`, `getUserWallets` | `src/apis/userApi.ts` (no tags: `providesTags: ['UserDetails']` is commented out at `:18`; `getUserProfile` adds `t=<now>`; `overrideExisting: false`) | **`src/store/api/userApi.ts`** (tag `User` on `getUserProfile`; **in use**) | `userSlice`, `Header` and `OneClickBettingSection` import `@/store/api/userApi`. `walletSlice` imports `@/apis/userApi` only for the `getUserWallets.matchFulfilled` matcher, which matches by endpoint name either way. `apis/userApi.ts` stays in use for its other endpoints (`getContactSupport`, `getContactSupportAccount`). |
| `getNotifications` | `src/store/api/contentApi.ts` (tag `Content`) | **`src/store/api/notificationApi.ts`** (no tags; sends `type` and `t=<now>`; **in use**) | `HomeLayout` and `AlertNotification` use notificationApi. `NotificationBar` imports the contentApi hook, but the request runs through the notificationApi definition; it passes only `{ type: 'Alert' }`, so nothing is lost. |

`INFERRED` (RTK Query 1.9.7 behaviour): when a name is injected a second time without `overrideExisting: true`, the **first** injection is kept and a development-mode warning is logged, so module import order decides. A static trace of the import graph from `src/main.tsx` at HEAD (no lazy routes) evaluates `store/api/userApi.ts` before `apis/userApi.ts`, and `store/api/notificationApi.ts` before `store/api/contentApi.ts`. The definitions marked **in use** above are therefore the live ones, and the handbook documents only those (team decision, Q-01).

Consequence: `getUserProfile` provides `User`, which the deposit/withdraw request mutation invalidates (`store/api/accountApi.ts:46`), so the profile refetches after such a request. `Content` is provided but never invalidated, and `UserDetails` is not used.

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
| rsplay | `getCasinoGames` | Not covered (Module 8 is documented from vishnu7 only) | [Module 1 usage R8](../docs/01-user-panel/01-home-page/api-inventory.md#r8-getcasinogames-home-usage) |
| vishnu7 | `getCasinoGames`, `getCasinoCategories`, `getCasinoProviders` | [Module 8 › C1–C3](../docs/01-user-panel/08-casino/api-inventory.md) | Lobby `/casino` |
| vishnu7 | `createCasinoSession` | [Module 8 › C4](../docs/01-user-panel/08-casino/api-inventory.md#c4-createcasinosession) | Every game launch (lobby, Dashboard, Home, In-play, Sports) |
| vishnu7 | `getLobbyUrlById` | [Module 8 › C5](../docs/01-user-panel/08-casino/api-inventory.md#c5-getlobbyurlbyid) | `/casino-qtech` |
| rsplay | `getScorecard` | [Modules 5–7 › M1](../docs/01-user-panel/05-scorecard-live-tv/api-inventory.md#m1-getscorecard) | Game detail (scorecard + Live TV URLs), race detail (Live TV URL) |
| rsplay | `getLiveScorecard` | [Modules 5–7 › M2](../docs/01-user-panel/05-scorecard-live-tv/api-inventory.md#m2-getlivescorecard) | Cricket game detail, 1 s |
| rsplay | `getMyTransactions` | [Module 4 › S1](../docs/01-user-panel/04-reports/api-inventory.md#s1-getmytransactions) | Account statement; also the unrouted `Reports/Transactions.tsx` |
| rsplay | `exportGameTransactions` | [Module 4 › S2](../docs/01-user-panel/04-reports/api-inventory.md#s2-exportgametransactions) | Account statement CSV/PDF |
| rsplay | `getBetHistory` | [Module 4 › S3](../docs/01-user-panel/04-reports/api-inventory.md#s3-getbethistory) | `CurrentBets` (game detail, `betTime: CURRENT`), Unsettled bets (deferred) |
| rsplay | `exportBetHistory` | [Module 4 › S4](../docs/01-user-panel/04-reports/api-inventory.md#s4-exportbethistory) | Bet history CSV/PDF; also Unsettled bets (deferred) |
| rsplay | `getProfitLoss` | [Module 4 › S5](../docs/01-user-panel/04-reports/api-inventory.md#s5-getprofitloss) | Profit & loss (two calls) |
| rsplay | `getCasinoRoundHistory` | [Module 4 › S6](../docs/01-user-panel/04-reports/api-inventory.md#s6-getcasinoroundhistory) | Casino bet history |
| rsplay | `getDepositAccounts` | [Module 9 › W1](../docs/01-user-panel/09-wallet/api-inventory.md#w1-getdepositaccounts) | Deposit method selection (admin receiving accounts) |
| rsplay | `getDepositWithdraw` | [Module 9 › W2](../docs/01-user-panel/09-wallet/api-inventory.md#w2-getdepositwithdraw) | Deposit history (`Credit`), withdraw history (`Debit`) |
| rsplay | `depositWithdrawRequest` | [Module 9 › W3](../docs/01-user-panel/09-wallet/api-inventory.md#w3-depositwithdrawrequest) | UPI/bank deposit and bank/UPI withdraw |
| rsplay | `uploadFile` | [Module 9 › W4](../docs/01-user-panel/09-wallet/api-inventory.md#w4-uploadfile) | Deposit proof, crypto wallet QR |
| rsplay | `getBankAccount`, `getUpiAccount` | [Module 9 › W5–W6](../docs/01-user-panel/09-wallet/api-inventory.md#w5-getbankaccount) | Withdraw saved accounts |
| rsplay | `addBankAccount`, `addUpiAccount`, `deleteAccount` | [Module 9 › W7–W9](../docs/01-user-panel/09-wallet/api-inventory.md#w7-addbankaccount) | Add account modal, delete icon |
| rsplay | `getUserWallets` | [Module 9 › W10](../docs/01-user-panel/09-wallet/api-inventory.md#w10-getuserwallets) | Header balance (5 s); withdrawable balance |
| rsplay | `getIsMasterOwner` | [Module 9 › W11](../docs/01-user-panel/09-wallet/api-inventory.md#w11-getismasterowner) | Deposit/withdraw access rule |
| rsplay | `createCryptoDepositWithdrawRequest` | [Module 9 › W12](../docs/01-user-panel/09-wallet/api-inventory.md#w12-createcryptodepositwithdrawrequest) | Crypto deposit (USDT) and withdraw (INR) |
| rsplay | `getCryptoAccounts`, `getCryptoNetwork`, `addCryptoAccount`, `deleteCryptoAccount` | [Module 9 › W13–W16](../docs/01-user-panel/09-wallet/api-inventory.md#w13-getcryptoaccounts) | Saved crypto wallets |
| rsplay | `getBonusApplicants` | [Module 11 › B1](../docs/01-user-panel/11-bonuses/api-inventory.md#b1-getbonusapplicants) | Bonus Statement (`/bonus-statement`); documented at `7a89e53` |
| rsplay | `registerFcmDevice` | [Module 13 › P1](../docs/01-user-panel/13-push-notifications/api-inventory.md#p1-registerfcmdevice) | Push device registration after login; documented at `7a89e53` |
| rsplay | `deleteFcmDevice` | [Module 13 › P2](../docs/01-user-panel/13-push-notifications/api-inventory.md#p2-deletefcmdevice) | Push device removal at logout |
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
| `GET /events/raw-scorecard/:eventId` | `getLiveScorecard` (an unused duplicate, `getRawScorecard`, is also defined) | `getRawScore` |
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
| `getUserProfile` (L12) | query | GET | `/users/me` | — (`UserDetails` commented out) | `components/Header.tsx`<br>`components/OneClickBettingSection.tsx`<br>`store/slices/userSlice.ts` | **Duplicate, not in use**: the other definition loads first and is the live one (Q-01; see the duplicates section) |
| `updateUserInfo` (L20) | mutation | PATCH | `users/me` | — (`UserDetails` commented out) | — | Defined but not called (`NOT FOUND` in consumers) |
| `getUserWallets` (L44) | query | GET | `/users/me/wallets` | — | `components/Header.tsx`<br>`store/slices/walletSlice.ts` | **Duplicate, not in use**: the other definition loads first and is the live one (Q-01; see the duplicates section) |
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
| `getBonusApplicants` (L6) | query | GET | `/bonuses/applicants/list` | — | `pages/BonusStatement/index.tsx` | `providesTags: ['BonusApplicants']` is commented out (`bonusApi.ts:12`, checked at `7a89e53`). See [Module 11 › B1](../docs/01-user-panel/11-bonuses/api-inventory.md#b1-getbonusapplicants) |

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
| `getCasinoRoundHistory` (L73) | query | GET | `/casino/round/history?${params.toString()}` | — (`providesTags` is commented out, `casinoApi.ts:95`) | `pages/Reports/CasinoBetHistory.tsx`<br>`pages/Reports/OLDCasinoBetHistory.tsx` (unrouted) |  |
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
| `getNotifications` (L14) | query | GET | `/notifications` | P:['Content'] | `components/AlertNotification.tsx`<br>`layouts/HomeLayout.tsx`<br>`pages/Inplay/components/NotificationBar.tsx` | **Duplicate, not in use**: the other definition loads first and is the live one (Q-01; see the duplicates section) |

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
| `getRawScorecard` (L353) | query | GET | `/events/raw-scorecard/${eventId}` | — | `pages/GameDetails/components/CricketScoreCard.tsx` | transform. Unused (its only consumer is imported by no file); not documented in Modules 5–7 |
| `getLiveScorecard` (L360) | query | GET | `/events/raw-scorecard/${eventId}` | — | `pages/GameDetails/components/CustomLiveScoreCard.tsx` | transform |

### `src/store/api/exportReportApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `getExportReports` (L33) | query | GET | `/exports/report/me` | — | `pages/Reports/ExportReportHistory.tsx` |  |

### `src/store/api/fcmApi.ts`

| Endpoint | Type | Method | URL (as written in source) | Cache tags | Consumers (files calling the hook) | Notes |
|---|---|---|---|---|---|---|
| `registerFcmDevice` (L5) | mutation | POST | `/firebase/firebase/devices` | — | `lib/pushNotifications.ts` | Dispatched with `initiate`, not the hook. Body `{ fid: <FCM token> }`. See [Module 13 › P1](../docs/01-user-panel/13-push-notifications/api-inventory.md#p1-registerfcmdevice) |
| `deleteFcmDevice` (L12) | mutation | DELETE | `/firebase/firebase/devices/${encodeURIComponent(fid)}` | — | `lib/pushNotifications.ts` | Dispatched with `initiate` at logout (3 s cap). See [Module 13 › P2](../docs/01-user-panel/13-push-notifications/api-inventory.md#p2-deletefcmdevice) |

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
| `getTurnover` (L6) | query | GET | `/turnover` | — | `pages/Reports/Turnover.tsx` | `providesTags: ['Turnover']` is commented out (`turnoverHistory.ts:18`, checked at `7a89e53`). `Turnover.tsx` has no route |

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
| `getCryptoNetwork` (L101) | query | GET | `/crypto/networks` | — (`providesTags` commented out) | `pages/Withdraw/CryptoNetworkSelector.tsx` |  |
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

---

## Admin Panel (Phase 2): rsplay-admin `12f0054`

Scope: Modules A1-A3 (Login and layout, Dashboard, Downline, approved 2026-11-24) A4-A6 (Account Statement, Export Report History, Change Password / Activity Log / Logout, approved 2026-11-25) A7 (Event Management) and A8 (Casino Control), 2026-11-26. This is **not** a full registry of rsplay-admin endpoints. Other admin modules will be added when approved. Full request, response and UI detail is in each module's API inventory, linked below. The admin app has one `apiSlice` with `refetchOnMountOrArgChange: true` and `keepUnusedDataFor: 0`, and it signs the user out on 401 with no refresh call ([phase overview](../docs/02-admin-panel/overview.md#how-the-admin-app-talks-to-the-backend)).

These tables use the column names "Name" and "Request" on purpose, so the portal's User Panel parser (tables headed Endpoint / Method / URL) skips them. The API Explorer builds its Admin Panel entries from the **Summary table of each admin module's `api-inventory.md`** (one entry per method and path, panel "Admin Panel"), never from this table. Admin entries never merge with User Panel entries that share a path. Grouped rows without a single path (A3 DL26 exports, A5 EX2 export registry) are not listed in the Explorer; see their module pages.

| Name | Request | Documented in | Notes |
|---|---|---|---|
| `login` | `POST /auth/login` | [A1 L1](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l1-login) | Same path as the User Panel login; admin body is `{ username, password }` only |
| `setupMfa`, `confirmMfaSetup`, `verifyMfa`, `getMfaStatus` | `POST /mfa/setup`, `POST /mfa/setup/confirm`, `POST /auth/mfa/verify`, `GET /mfa/status` | [A1 L2-L5](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l2-setupmfa) | Google Authenticator only; Telegram commented out |
| `getUser` | `GET /users/me` | [A1 L6](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l6-getuser) | polled every 20 s by the layout |
| `availbleRoles` | `GET /role/available` | [A1 L7](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l7-availbleroles) | role ids for links |
| `changePassword`, `OwnerChangePassword` | `POST /users/me/change-password`, `POST /admin/change-password` | [A1 L8](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l8-changepassword--ownerchangepassword) | |
| `logout` | `POST /auth/logout` | [A1 L9](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l9-logout) | |
| `getWallet` | `GET /users/me/wallets` | [A1 L10](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l10-getwallet) | polled every 20 s by the layout |
| `getLoginAsToken`, `verifyLoginToken` | `GET /auth/gettoken/{userId}`, `GET /auth/verify-token/{code}` | [A1 L11-L12](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l11-getloginastoken) | Owner "Login as" hand-off to the agent panel |
| `getUserRolesDetails` | `GET /privileges/subadmin/detail` | [A1 L13](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l13-getuserrolesdetails) | role-user permissions |
| `getUnreadNotifications`, `getNotifications`, `markAllRead` | `GET /push-notification/unread`, `GET /push-notification`, `POST /push-notification/read` | [A1 L14-L16](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l14-getunreadnotifications) | unread polled every 10 s |
| `getIsMasterOwner` | `GET /users/is/master-owner/user` | [A1 L17](../docs/02-admin-panel/01-login-and-layout/api-inventory.md#l17-getismasterowner) | sidebar and Dashboard |
| `getBalanceSummary` … `getBonusAnalytics` (11 queries) | `GET /dashboard/{balance-summary, user-management, game-analytics, casino-analytics, business-analytics, top-users, top-pl-users, top-categories, device-breakdown, bonus-analytics, login-summary}` | [A2 D1-D12](../docs/02-admin-panel/02-dashboard/api-inventory.md) | no `ts`; each has its own tag |
| `getLiveGames` | `GET /dashboard/live-games` | [A2 D2](../docs/02-admin-panel/02-dashboard/api-inventory.md#d2-getlivegames) | polled every 60 s |
| `getSystemSettings` | `GET /system` | [A2 D14](../docs/02-admin-panel/02-dashboard/api-inventory.md#d14-getsystemsettings) | reads `masteranalytics.selection` |
| `getMembers` | `GET users/me/sub-users` | [A3 DL1](../docs/02-admin-panel/03-downline/api-inventory.md#dl1-getmembers) | level lists and Settlement |
| `getSummary` | `GET /users/summary` | [A3 DL2](../docs/02-admin-panel/03-downline/api-inventory.md#dl2-getsummary) | balance strip |
| `getSubMembers` | `GET /users/sub-users/{id}` | [A3 DL3](../docs/02-admin-panel/03-downline/api-inventory.md#dl3-getsubmembers) | drill-down |
| `addMember` | `POST /users/sub-user` | [A3 DL4](../docs/02-admin-panel/03-downline/api-inventory.md#dl4-addmember) | partnership rule |
| `deposit`, `withdraw` | `POST users/{id}/wallets/deposit`, `POST users/{id}/wallets/withdraw` | [A3 DL5/DL6](../docs/02-admin-panel/03-downline/api-inventory.md#dl5-deposit--dl6-withdraw) | |
| `getSportPermission`, `updateSportPermission` | `GET` / `PUT /sports-permission/{id}` | [A3 DL9/DL10](../docs/02-admin-panel/03-downline/api-inventory.md#dl9-getsportpermission--dl10-updatesportpermission) | |
| `changeStatus`, `changeUserAccess` | `PATCH /users/change-status/{id}`, `PATCH /users/change/{id}` | [A3 DL11/DL12](../docs/02-admin-panel/03-downline/api-inventory.md#dl11-changestatus) | |
| `getAccountSummary`, `membersChangePassword` | `GET /users/account/summary/{id}/{path}`, `PATCH /admin/users/password/{id}` | [A3 DL14/DL15](../docs/02-admin-panel/03-downline/api-inventory.md#dl14-getaccountsummary) | |
| account-details reports | `GET users/transactions/deposit-withdraw/{id}`, `/users/transactions/all`, `/reports/bet`, `reports/casino-bet`, `/reports/event/profitloss`, `reports/market/profitloss/{eventId}/{id}`, `activity-log/{id}`, `/competitions`, `/events` | [A3 DL16-DL24](../docs/02-admin-panel/03-downline/api-inventory.md#dl16-gettransactionhistory) | |
| `settlement` | `POST /users/{id}/wallets/settlement` | [A3 DL25](../docs/02-admin-panel/03-downline/api-inventory.md#dl25-settlement) | |
| exports | six `POST` export endpoints | [A3 DL26](../docs/02-admin-panel/03-downline/api-inventory.md#dl26-exports-from-account-details) | |
| `getMyTransactions` | `GET /users/me/transactions` | [A4 AS1](../docs/02-admin-panel/04-account-statement/api-inventory.md#as1-getmytransactions) | Account Statement › Deposit/Withdraw; same path as User Panel S1, different parameters |
| `getGameTransactions` | `GET /users/transactions/game-transactions` | [A4 AS2](../docs/02-admin-panel/04-account-statement/api-inventory.md#as2-getgametransactions) | Account Statement › Game Transaction |
| `exportAccountStatement` | `POST /users/transactions/export-userTransaction` | [A4 AS3](../docs/02-admin-panel/04-account-statement/api-inventory.md#as3-exportaccountstatement) | used by both Account Statement tabs, as intended (Q-55) and Downline |
| `getAllExports` | `GET /exports/report/me` | [A5 EX1](../docs/02-admin-panel/05-export-history/api-inventory.md#ex1-getallexports) | Export Report History; no polling (Q-57) |
| export requests (registry) | 19 `POST` export endpoints in use in `ExportApi.ts` (2 more defined, unused) | [A5 EX2](../docs/02-admin-panel/05-export-history/api-inventory.md#ex2-export-requests-that-feed-this-list) | names, URLs and calling pages; parameters documented with each owning module |
| `getActivityLogs` | `GET activity-log` | [A6 ST4](../docs/02-admin-panel/06-settings-and-activity-log/api-inventory.md#st4-getactivitylogs) | own login history |
| `exportActivityLog` | `POST /activity-log/export` | [A6 ST3](../docs/02-admin-panel/06-settings-and-activity-log/api-inventory.md#st3-exportactivitylog) | also Downline; `searchByUserId` from local storage (Q-54) |
| `getEvents` | `GET /events` | [A7 EM1](../docs/02-admin-panel/07-event-management/api-inventory.md#em1-getevents) | Events list; `status` INACTIVE / ACTIVE / UPCOMING. Same path as `getEventByCompetitionId` (reports) |
| `updateStatus`, `updateInplay`, `betSuspended`, `multipleStatusChange` | `PATCH /events/:id`, `PATCH /events/inplay/:id`, `PATCH /events/bet-suspended/:id`, `PATCH /events/multiple/status` | [A7 EM2-EM5](../docs/02-admin-panel/07-event-management/api-inventory.md#em2-updatestatus) | change what players see or can bet on ([user-side effects](../docs/02-admin-panel/07-event-management/overview.md#what-each-control-does-on-the-user-panel)) |
| `getEventMarket`, `updateMarketStatus` | `GET /market`, `PATCH /market/status/:id` | [A7 EM6-EM7](../docs/02-admin-panel/07-event-management/api-inventory.md#em6-geteventmarket) | market off: backend stops sending it to players |
| `getFixtures`, `updateFixtureStatus` | `GET /fixture`, `PATCH /fixture/status` | [A7 EM8-EM9](../docs/02-admin-panel/07-event-management/api-inventory.md#em8-getfixtures) | `GET /fixture` is also the User Panel fixture list (other parameters); Close cannot be undone |
| `getDynamicBetConfig`, `updateDynamicBetConfig`, `resetDynamicBetConfigStake` | `GET /betconfig/dynamic`, `PUT /betconfig/dynamic`, `PATCH /betconfig/dynamic/reset-stake` | [A7 EM10-EM12](../docs/02-admin-panel/07-event-management/api-inventory.md#em10-getdynamicbetconfig) | stake, odds, profit, exposure and delay limits; event level wins over sport default |
| `getAllCategory`, `getProviders`, `getAllGames` | `GET /casino/category`, `GET /casino/providers`, `GET /casino/games` | [A8 CC1-CC3](../docs/02-admin-panel/08-casino-control/api-inventory.md#cc1-getallcategory) | same paths as the User Panel casino lobby, which sends `status=ACTIVE` |
| `gameStatusChange`, `updateProviderStatus` | `PATCH casino/status/:id`, `PATCH /casino/provider/status` | [A8 CC4-CC5](../docs/02-admin-panel/08-casino-control/api-inventory.md#cc4-gamestatuschange) | game off: out of every user list; provider off: its games stop launching |
| `getGames`, `updateGames`, `uploadFile` | `GET casino/:id`, `PATCH casino/:id`, `POST /upload` | [A8 CC6-CC8](../docs/02-admin-panel/08-casino-control/api-inventory.md#cc6-getgames) | Edit Game; `priority` not in use yet; `/upload` shared with banking |

Defined but not reachable from A1-A8 at this commit: `gameTrending` ([A8 CC9](../docs/02-admin-panel/08-casino-control/api-inventory.md#cc9-gametrending), Trending dropped), `updatePopular` and `updateMarket` ([A7 EM13-EM14](../docs/02-admin-panel/07-event-management/api-inventory.md#em13-updatepopular)), `exportGameAccountStatement`, `exportAffiliateList`, `getCaptcha`, `roleUserChangePassword`, `getCasinoDetail`, `updateTransactionCode` ([A3 list](../docs/02-admin-panel/03-downline/api-inventory.md#defined-for-downline-but-not-reachable)).

Downline Coin (`depositCoin`, `withdrawCoin`), Credit Reference edit (`addCreditRefrence`) and Owner MFA Status (`getOwnerMfaStatus`, `disableOwnerMfa`) are platform-specific and hidden from the handbook until they are offered (team, 2026-11-25). Their detail is kept as comments in the A3 files.
