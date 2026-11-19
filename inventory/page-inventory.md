# Page and route inventory (User Panel)

All routes are declared in `src/App.tsx` in both repos. Page components are lazy-loaded through `loadable()` wrappers in `src/routes/index.tsx` (React `lazy` + `Suspense`). Both apps use `BrowserRouter` (react-router-dom 6.30.3). `OBSERVED`.

Module numbers refer to [docs/01-user-panel/overview.md](../docs/01-user-panel/overview.md). "—" means outside the eight Phase 1 modules (account, wallet or auth features).

## rsplay-user (`810884b`): `src/App.tsx`

Maintenance switch: if `VITE_MAINTENANCE_MODE === 'true'`, every path renders `MaintenancePage` (`App.tsx:38,45-51`).

Every route below sits inside `<Route element={<HomeLayout />}>` (`App.tsx:59`).

### Public routes (no login needed)

| Path | Component (`src/…`) | Props / params | Module |
|---|---|---|---|
| `/` | `pages/Home` | — | 1 Home |
| `/inplay` | `pages/Inplay` | — | 2 In-play |
| `/sports/cricket`, `/sports/football`, `/sports/tennis` | `pages/Inplay` | `sportName` = `Cricket` / `Football` / `Tennis` (generated from `sportsRoutes`, `App.tsx:36,71-86`) | 2 In-play |
| `/sports/{sport}/:competitionId` | `pages/Inplay` | `sportName`, `competitionId` | 2 In-play |
| `/sports/{sport}/market-details/:eventId` | `pages/GameDetails` | `sportName`, `eventId` | 3 Game detail (+5, 6, 7 embedded) |
| `/racing/:sportName`, `/racing/:sportName/:competitionId` | `pages/Racing` | — | 2 In-play (racing) |
| `/details/:game/:eventId`, `/details/:game/:eventId/:gameId` | `pages/RacingInside` | — | 3 Game detail (racing variant) |
| `/LIVECASINO`, `/INDIANPOKER`, `/AURACASINO`, `/FANTASY11`, `/AVIATOR`, `/CHICKENROAD`, `/INTCASINO`, `/SLOT` | `pages/CasinoGames` | `pageType` = the path name | 8 Casino |

### Protected routes (`<ProtectedRoute>`, `App.tsx:92-124`)

| Path | Component | Module |
|---|---|---|
| `/account-statement` | `pages/Reports/AccountStatement` | 4 Reports |
| `/bet-history` | `pages/Reports/BetHistory` | 4 Reports |
| `/unsettled-bet` | `pages/Reports/UnsettledBet` | 4 Reports |
| `/profit-loss` | `pages/Reports/BetProfitLoss` | 4 Reports |
| `/casino-bet-history` | `pages/Reports/CasinoBetHistory` | 4 Reports / 8 Casino |
| `/commission` | `pages/Reports/Commission` | 4 Reports |
| `/export-report-history` | `pages/Reports/ExportReportHistory` | 4 Reports |
| `/bonus-statement` | `pages/BonusStatement` | 4 Reports |
| `/results` | `pages/Results` | 4 Reports (`INFERRED`: user-facing results list) |
| `/GAME/:id` | `pages/Game` | 8 Casino (game launch) |
| `/stake-settings` | `pages/StakeSettings` | 3 (stake buttons used by the bet slip) |
| `/change-password` | `pages/ChangePassword` | — |
| `/rules` | `pages/Rules` | — |
| `/referral` | `pages/Referral` | — |
| `/coins` | `pages/Coins` | — |
| `/deposit` | `pages/Deposit`, wrapped in `<FeatureRoute feature="deposit">` | 9 Deposit and Withdraw |
| `/withdraw` | `pages/Withdraw`, wrapped in `<FeatureRoute feature="withdrawal">` | 9 Deposit and Withdraw |
| `*` | `NotFoundPage` (outside `HomeLayout`) | — |

Notes:
- **What `ProtectedRoute` does** (`src/components/common/ProtectedRoute.tsx`): if `isLoading`, it shows a spinner. If not authenticated, it dispatches `openModal({name:'login'})` and redirects to `/` with `state.from`. `OBSERVED`.
- **What `FeatureRoute` does** (`src/components/common/FeatureRoute.tsx`): it polls `/system` every 30 s and redirects demo users away from deposit and withdrawal. The checks after line 30 are documented with the wallet features (outside Phase 1 scope).
- **Login is a modal, not a route.** `pages/Auth/Login` is exported from `routes/index.tsx` but has no route; login, signup and forgot-password open through `ModalManager` and Redux `modalSlice`. `OBSERVED` (`App.tsx:131-132`).
- **Pages that are routed elsewhere or dead.** `src/routes/index.tsx:29-41` comments out exports for `Markets`, `Casino`, `CasinoPlayground`, `QTECHLobby`, `ActivityLog`, `CasinoResults` and similar. These are template leftovers and are **not routed** in rsplay.
- **Unrouted report pages.** `pages/Reports/Transactions.tsx`, `Turnover.tsx` and `OLDCasinoBetHistory.tsx` exist but have no route in `App.tsx`. Menu entries for `/wallet`, `/transactions`, `/turnover-history`, `/commission-report` and `/my-profile` appear only in **commented-out** config (`src/utils/constants.ts:263-274`). `/support` is still linked live, from `components/Sidebar.tsx:87` and `pages/NotFoundPage.tsx:59`, but **no `/support` route exists**, so it falls through to `NotFoundPage` (`OBSERVED`; Q-07, team-confirmed defect).
- **App-level hooks** (run on every route): `useBfcacheAuthGuard` (bfcache restore without a token → `window.location.replace('/')`), `useReferralRegisterModal`, `useFcmNotifications` (`App.tsx:41-43`).

## vishnu7user (`6f3b811`): `src/App.tsx` at HEAD

The maintenance switch is the same as rsplay's (`App.tsx:36-42`).

| Path | Layout | Guard | Component (`src/…`) | Module |
|---|---|---|---|---|
| `/dashboard` | `DashboardLayout` | — | `pages/Dashboard` | 1 Home (landing page) |
| `/` | `MainLayout` | — | redirect to `/dashboard` | 1 |
| `/home` | `MainLayout` | — | `pages/Home` | 1 Home |
| `/inplay` | `MainLayout` | — | `pages/Inplay` | 2 In-play |
| `/all-sports/:sportName` | `MainLayout` | — | `pages/Sports` | 2 In-play |
| `/user/account-statement` | `MainLayout` | `ProtectedRoute` | `pages/AccountStatment` | 4 Reports |
| `/user/bet-history` | `MainLayout` | `ProtectedRoute` | `pages/BetHistory` | 4 Reports |
| `/user/profit-loss` | `MainLayout` | `ProtectedRoute` | `pages/ProfitLoss` | 4 Reports. **Declared twice** (`App.tsx:71` and `:75`, both the same module) |
| `/user/activity-logs` | `MainLayout` | `ProtectedRoute` | `pages/ActivityLog` | 4 Reports |
| `/user/casino-bet-history` | `MainLayout` | `ProtectedRoute` | `pages/CasinoBetHistory` | 4 / 8 |
| `/user/profile` | `MainLayout` | `ProtectedRoute` | `pages/Profile` | — |
| `/user/stack-setting` | `MainLayout` | `ProtectedRoute` | `pages/StackSetting` | 3 (stake buttons) |
| `/user/change-password` | `MainLayout` | `ProtectedRoute` | `pages/ChangePassword` | — |
| `/referral` | `MainLayout` | `ProtectedRoute` + `SelfRegisteredRoute` | `pages/Referral` | — |
| `/casino` | `CasinoLayout` | — | `pages/Casino` | 8 Casino |
| `/casino-playground` | `CasinoLayout` | — | `pages/CasinoPlayground` | 8 Casino (game player) |
| `/casino-qtech` | `CasinoLayout` | — | `pages/QTECHLobby` (iframe of `getLobbyUrlById().url`) | 8 Casino |
| `/game-details/:sportName/:eventId` | `GameLayout` | — | `pages/Markets` | 3 Game detail (+5, 6, 7 embedded in `Media`) |
| `/multi-market` | `GameLayout` | — | `pages/MultiMarket` | 3 Game detail (pinned markets) |
| `/terms-and-conditions` | none | — | `pages/TermsAndConditions` | — |
| `*` | none | — | `NotFoundPage` | — |

Notes:
- **What `ProtectedRoute` does** (`src/components/common/ProtectedRoute.tsx`): guest status comes from `isGuestUser()`, which checks whether the `access-token` cookie is missing (`src/utils/index.ts:11`). Guests **and demo users** get `setLoginModalOpen(true)` and are redirected to `/home`. `OBSERVED`. The dispatch happens during render rather than in an effect (Q-08, team-confirmed defect; to be fixed).
- **What `SelfRegisteredRoute` does**: it redirects to `/dashboard` unless `useIsSelfRegistered()` is true.
- **Unrouted pages.** `/login` and `/signup` (`AuthLayout`) are commented out (`App.tsx:50-53`). `/user/casino-results` and `/user/live-casino-bets` are also commented out (`App.tsx:63-64`). Their page folders exist but are not reachable.
- **Uncommitted changes, out of scope.** The working tree also edits `App.tsx` and `routes/index.tsx` and adds a `FaviconDemo` page.
