# Polling and frequency inventory (User Panel)

This lists every repeating API call found in the two reference repos at their documented commits, plus the global rules that govern them. Per-module docs explain *why* each refresh exists and what goes stale without it. This file is the cross-reference.

Search performed at HEAD for: `pollingInterval`, `setInterval(`, `refetchOnFocus`, `refetchOnReconnect`, `refetchOnMountOrArgChange`, `skipPollingIfUnfocused`, `visibilitychange`, `keepUnusedDataFor`, `new WebSocket`, `EventSource`. Socket libraries were also checked in `package.json`.

## Global facts (both repos)

| Fact | rsplay | vishnu7 | Label |
|---|---|---|---|
| Real-time transport | RTK Query `pollingInterval` only | RTK Query `pollingInterval` only | `OBSERVED` |
| WebSocket / Socket.IO / SSE | none (`NOT FOUND`) | none (`NOT FOUND`) | `OBSERVED` |
| `setInterval`-based API polling | none at HEAD | none at HEAD | `OBSERVED` |
| RTK Query version | 1.9.7 | 1.9.7 | `OBSERVED` (package-lock) |
| `refetchOnFocus` / `refetchOnReconnect` | not set anywhere | not set anywhere | `OBSERVED` |
| `setupListeners(store.dispatch)` | called in `src/store/index.ts:37` | called in `src/store/index.ts:34` | `OBSERVED` |
| `refetchOnMountOrArgChange` | set per-hook on the 30 s polls (see below) | set on `getCasinoGames` in `useCasinoLobby.ts:61` | `OBSERVED` |

What these facts mean in practice:

- **Focus and reconnect.** `setupListeners` only enables focus/reconnect refetching for queries that opt in with `refetchOnFocus`/`refetchOnReconnect`. Neither repo sets those flags, so no API call is triggered by window focus or network reconnect. `INFERRED` from RTK Query semantics.
- **Hidden tabs.** RTK Query 1.9.7 has no `skipPollingIfUnfocused` option (it was added in 2.x). Polling therefore keeps running while the tab is hidden or in the background. The browser may still throttle the underlying timers. `INFERRED`.
- **When polling stops.** A poll stops when the last component subscribed to that cache entry (endpoint + exact arguments) unmounts, or when the hook's `skip` becomes `true`. `INFERRED` from RTK Query semantics.
- **Shared entries.** When several mounted components subscribe to the same entry with different intervals, RTK Query polls once, at the **shortest** interval. `INFERRED`.

---

## rsplay-user (`810884b`)

For a project-neutral view of Game Detail refreshes, see [Module 3 polling](../docs/01-user-panel/03-game-detail/polling-and-frequency.md). The catalogue path is shared; source polling intervals are live-aware or fixed-rate.

### Always-on polling (every page under `HomeLayout`)

`HomeLayout` (`src/layouts/HomeLayout.tsx`) wraps every route except 404 and maintenance. It renders `Header`, `Sidebar` and `AlertNotification`, so these polls run on **every page**.

| Endpoint | Interval | Called from | Skip condition | Notes |
|---|---|---|---|---|
| `getFixtureCounts` `GET /fixture/counts` | **2 s** | `components/Header.tsx:68` | none, so guests poll it too | Feeds in-play sport counts in the header |
| `getUserWallets` `GET /users/me/wallets` | **5 s** | `components/Header.tsx:59` | `!isAuthenticated` | Balance shown = `amount − |exposureAmount|` (`Header.tsx:62-65`). Also feeds `walletSlice` |
| `getSystemSettings` `GET /system` | **30 s** | `Header.tsx:50`, `Sidebar.tsx:52`, `ProfileDrawer.tsx:61`, `FeatureRoute.tsx:15`, `pages/Home/index.tsx:24` | none | One shared cache entry, each with `refetchOnMountOrArgChange: true`. `RacingDetails.tsx:21` subscribes at 10 s, so while a race page is open the shared entry polls every 10 s (`INFERRED`) |
| `getNotifications({type:'Alert'})` `GET /notifications` | **30 s** | `layouts/HomeLayout.tsx:14`, `components/AlertNotification.tsx:8` | none | Both use the same arguments, so they share one entry |
| `getUserProfile` `GET /users/me` | once per mount (no polling) | `Header.tsx:54` | `!isAuthenticated` | Feeds `userSlice` |
| `getIsMasterOwner` | once per mount | `Header.tsx:55` | `!isAuthenticated` | Feeds `userSlice` |

Result: a logged-in user on any page triggers at least one request every 2 s plus one every 5 s, before any page-specific polling.

### Page-specific polling

| Page / route | Endpoint | Interval | Called from | Skip / condition |
|---|---|---|---|---|
| Home `/` | `getEvents` `GET /fixture` | **2 s** | `pages/Inplay/Hooks/useFixtureData.ts:56` (used by `SportsListing` / `SportsListingLogin`) | args change with tab, search or sport |
| Home `/` | `getRaces` (HorseRacing, Greyhound) | 10 s | `pages/Home/components/SportsListing.tsx:76,81` | Only while that racing tab is active (`activeId 4/5`) |
| Home `/` | `getRaces` (HorseRacing, Greyhound) | 10 s | `pages/Home/components/SportsListingLogin.tsx:33,37` | Always, but only **logged-in** users see this listing (guests get `SportsListing`). See [Module 1](../docs/01-user-panel/01-home-page/polling-and-frequency.md) |
| In-play `/inplay`, `/sports/:sport[/:competitionId]` | `getEvents` | **2 s** | `useFixtureData.ts:55-57` | `/inplay` sends `inplay=true`; sport routes send `sport` and optional competition without `inplay` |
| In-play `/inplay` | `getRaces` (inplay, two sports) | 10 s | `pages/Inplay/index.tsx:38-46` | Only when no `sportName` (i.e. `/inplay`); sends `inplay=true`, no `status` |
| Game detail `/sports/:sport/market-details/:eventId` | `getCatalogueByEventId` `GET /catalogue/:eventId` | **1 s in-play / 2 s otherwise** | `pages/GameDetails/Hooks/useCatalogData.ts:23,32,112` | Interval held in state: starts at 1000, then `setPollingInterval(inplay ? 1000 : 2000)` |
| Game detail | `getLiveScorecard` `GET /events/raw-scorecard/:eventId` | **1 s** | `pages/GameDetails/components/CustomLiveScoreCard.tsx:37` | `!eventId \|\| !isAuthenticated`. Different endpoint name from `getRawScorecard`, so a separate cache entry. Cricket only, not for demo users; stops after a "no data" response. The desktop and mobile copies share one cache entry and one timer. See [Modules 5–7 polling](../docs/01-user-panel/05-scorecard-live-tv/polling-and-frequency.md) |
| Game detail | `getScorecard` `GET events/scorecard/:eventId` | once (no polling) | `useCatalogData.ts:27` | `!eventId \|\| isDemoUser \|\| !isAuthenticated`. Returns `liveTvUrl` / `scorecardUrl` |
| Racing list `/racing/:sportName[/:competitionId]` | `getRaces` | 10 s | `pages/Racing/index.tsx:38-44` | Sends `sportName` and optional `competitionId`; no `inplay` or `status`. See [Module 2](../docs/01-user-panel/02-inplay/polling-and-frequency.md#rsplay-810884b) |
| Race detail `/details/:game/:eventId[/:gameId]` | `getRaceDetails` `GET /catalogue/:eventId?t=<now>` | **1 s** | `pages/RacingInside/index.tsx:26` | `!game \|\| !eventId`. The URL changes every call (`t=Date.now()`), which defeats any HTTP caching |
| Race detail | `getSystemSettings` | 10 s | `pages/RacingInside/component/RacingDetails.tsx:21` | Lowers the shared `/system` poll from 30 s to 10 s while mounted |

### Non-polling timers that affect navigation
- `useCatalogData.ts:118-124`: when the catalogue `status` becomes `closed`, it waits `setTimeout(…, 1000)` and then runs `navigate('/bet-history')`. `OBSERVED`. Full behaviour is covered in Module 3.

---

## vishnu7user (`6f3b811`)

The same [Module 3 polling reference](../docs/01-user-panel/03-game-detail/polling-and-frequency.md) summarizes catalogue, bookset, stake and bet-mutation timing without duplicating endpoint details.

### Always-on polling

`Header` is rendered by all four layouts (`MainLayout`, `GameLayout`, `CasinoLayout`, `DashboardLayout`), so these polls run on every page.

| Endpoint | Interval | Called from | Skip condition | Notes |
|---|---|---|---|---|
| `getUserInfo` `GET /users/me` | **5 s** | `components/Header.tsx:46` | `!isAuthenticated` | `onQueryStarted` dispatches `setUserInfo`. It opens the change-password modal if `!passwordChanged`, and on a 401 opens the login modal and removes the cookie (`store/api/userApi.ts:18-38`) |
| `getUserWallets` `GET /users/me/wallets` | **5 s** | `components/Header.tsx:47` | `!isAuthenticated` | |
| `getContactSupport` | once per mount | `components/Header.tsx:48` | none | |
| `getNotifications({type:'Alert'})` | once per mount (no polling) | `components/Marquee.tsx:9` | none | rsplay polls the equivalent every 30 s |

### Page-specific polling

| Page / route | Endpoint | Interval | Called from | Skip / condition |
|---|---|---|---|---|
| Home `/home` (cricket only), In-play `/inplay`, Sports `/all-sports/:sportName` | `getMatchesGroupedByCompetition` `GET /fixture/groupByCompetition` | **3 s** (hook default) | `hooks/useGroupedFixtures.ts:25-29` | `/inplay` sends `inplay=true`; sport pages send `sport` without `inplay`; upcoming routes skip. See [Module 2](../docs/01-user-panel/02-inplay/polling-and-frequency.md#vishnu7-6f3b811) |
| Game detail `/game-details/:sportName/:eventId` | `getMatcheDetails` `GET /catalogue/:eventId` | **1 s** | `pages/Markets/index.tsx:21-26` | none |
| Game detail | `getRawScore` `GET /events/raw-scorecard/:id` | **1 s** | `pages/Markets/components/Media.tsx:37-40` | Skipped unless cricket, `externalId` present, not demo, not guest, and not in TV view |
| Multi-market `/multi-market` | `getPinnedMarkets` `GET /pinned-market` | **1 s** | `pages/MultiMarket/index.tsx:221-224` | `isGuest` |
| Multi-market (per event card) | `getMatcheDetails` | once (no polling) | `pages/MultiMarket/index.tsx:64-67` | Only when runner names are missing (`needsNames`) |
| Casino lobby `/casino` | `getCasinoGames` | on mount and on every argument change (no polling) | `hooks/useCasinoLobby.ts:52-61` | `refetchOnMountOrArgChange: true` |

### Not polled in vishnu7 (polled in rsplay)
`/system`, `/fixture/counts` and alert notifications (`NOT FOUND` as polled calls in vishnu7).

---

## Team confirmations (2026-11-18)
- **The 1 s and 2 s polling rates are intentional** (Q-03, Q-05). They keep in-play data current, because odds, status and scores change frequently in live matches. Module docs record these rates as design intent, not as defects.
- **`t: Date.now()` is a deliberate cache-buster** used on most APIs (Q-06).
- Polling continues in hidden tabs. This is recorded as current behaviour only.

Q-04 (two raw-scorecard timers) was resolved in Modules 5–7: only one runs. See [open-questions.md](open-questions.md).

## Module 13: Push notifications (rsplay `7a89e53`)

No polling: notifications are pushed by Firebase. `POST /firebase/firebase/devices` is sent once per app load while logged in with notification permission granted (and after Allow on the fallback card); `DELETE /firebase/firebase/devices/:fid` once at logout from the profile drawer, capped at 3 s. A session ended by a failed token refresh sends no DELETE. Details: [Module 13 polling](../docs/01-user-panel/13-push-notifications/polling-and-frequency.md).

## Modules 10-11: Referrals and Bonuses (rsplay `7a89e53`)

Neither module polls. The Referral page makes no request: it reads `referralCode` from the profile the header loads (`GET /users/me`), and the referral link only opens the register modal once per app load. The Bonus Statement requests `GET /bonuses/applicants/list` on mount (after the profile id exists) and on each filter, search (500 ms), page or size change; it has no Refresh button and no `t` cache-buster. The bonus balance in the profile drawer follows the header's 5 s `GET /users/me/wallets` poll. Details: [Module 10 polling](../docs/01-user-panel/10-referrals/polling-and-frequency.md), [Module 11 polling](../docs/01-user-panel/11-bonuses/polling-and-frequency.md).

## Module 9: Deposit and Withdraw (rsplay)

No deposit or withdraw API polls. Lists and history load on mount and on filter or page changes; mutations refresh them through the `Account` and `CryptoWithdrawWallet` tags. The withdrawable balance follows the layout's 5 s `GET /users/me/wallets` poll, and `FeatureRoute` subscribes to the 30 s `GET /system` poll. See [Module 9 polling](../docs/01-user-panel/09-wallet/polling-and-frequency.md).

## Module 8: Casino (vishnu7)

No casino API polls. The lobby fetches games on mount, on filter changes and on infinite scroll; categories per provider; providers once. Game sessions are created on click (locked ≥ 3 s), and the QTech lobby URL is fetched on mount. During gameplay, the layout `Header` stays mounted under the player overlay, so the 5 s `/users/me` and wallet polls continue. Details: [Module 8 polling and frequency](../docs/01-user-panel/08-casino/polling-and-frequency.md).

## Modules 5–7: Scorecard, Live TV, Raw scorecard (rsplay)

`GET events/scorecard/:eventId` (scorecard and Live TV URLs) runs once per game or race detail visit for logged-in, non-demo users. `GET /events/raw-scorecard/:eventId` polls every 1 s on cricket game detail pages for logged-in, non-demo users, from before the match until the user leaves, unless the API reports no data. Details: [Modules 5–7 polling and frequency](../docs/01-user-panel/05-scorecard-live-tv/polling-and-frequency.md).

## Module 4: Reports (rsplay)

No report API polls. Account statement, bet history and casino bet history make one request per argument set (mount, Go, Reset, search after 500 ms, page or size change; the account statement context filter applies immediately). Profit & loss makes two requests per visit (table + all-sports total). Exports are single POSTs on click. `placeBet` invalidates the `BetPlace` tag, so bet history and P&L entries refetch or are dropped after a bet. The always-on `HomeLayout` polls (2 s, 5 s, 30 s) continue on these pages. Details: [Module 4 polling and frequency](../docs/01-user-panel/04-reports/polling-and-frequency.md).

## Supplemental Login and Signup module

Signup OTP, registration, and login are user-triggered POST mutations; none is configured with `pollingInterval` (`rsplay:src/pages/Auth/hooks/useRegister.ts:65-99 (useRegister)`, `rsplay:src/pages/Auth/hooks/useLogin.ts:32-42 (useLoginPage)`, `vishnu7:src/pages/auth/SignupPage.tsx:87-128 (SignupPage)`, `vishnu7:src/pages/auth/LoginPage.tsx:47-55 (LoginPage)`). See the [API inventory](../docs/01-user-panel/authentication/api-inventory.md).

## Admin Panel (Phase 2): rsplay-admin `12f0054`, Modules A1-A8

Global facts for the admin app: RTK Query `^1.9.7`, `pollingInterval` only (no WebSocket in these modules); `refetchOnMountOrArgChange: true` and `keepUnusedDataFor: 0` on the whole `apiSlice`, so every mount refetches (`store/api/apiSlice.ts:40-41`); most queries add `ts: Date.now()` (design intent, as Q-06); a 401 signs the user out after 2 s with no refresh call.

| Request | Repeats | Where | Reason (from code) | Detail |
|---|---|---|---|---|
| `GET /push-notification/unread` | 10 s | layout, every page after sign-in | new deposit/withdraw notification badge, sound and banner | [A1 polling](../docs/02-admin-panel/01-login-and-layout/polling-and-frequency.md) |
| `GET /users/me` | 20 s | layout | role, `passwordChanged`, status (inactive or suspended accounts are signed out) | same |
| `GET /users/me/wallets` | 20 s | layout | header balance | same |
| `GET /dashboard/live-games` | 60 s | Dashboard | live-event odds and platform position | [A2 polling](../docs/02-admin-panel/02-dashboard/polling-and-frequency.md) |

Downline (A3), Account Statement (A4), Export Report History (A5) and Change Password / Activity Log (A6) have no polling; see [A3](../docs/02-admin-panel/03-downline/polling-and-frequency.md), [A4](../docs/02-admin-panel/04-account-statement/polling-and-frequency.md), [A5](../docs/02-admin-panel/05-export-history/polling-and-frequency.md) and [A6](../docs/02-admin-panel/06-settings-and-activity-log/polling-and-frequency.md). Event Management (A7) has no polling either; its list, market and bet-config queries refetch on every mount and after each change, and players pick up the changes through the User Panel's own 1 s / 2 s polls ([A7](../docs/02-admin-panel/07-event-management/polling-and-frequency.md)). Casino Control (A8) has no polling; the user lobbies pick up changes when their list next loads ([A8](../docs/02-admin-panel/08-casino-control/polling-and-frequency.md)). Export Report History also has no Refresh button, so a `Pending` export does not update on screen (Q-57). The Dashboard header clock uses a 1 s `setInterval` that makes no API call (`components/common/Header.tsx:65-71`).
