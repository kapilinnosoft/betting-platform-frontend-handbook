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
| Game detail | `getRawScorecard` `GET /events/raw-scorecard/:eventId` | 2 s | `pages/GameDetails/components/CricketScoreCard.tsx:22` | `!eventId` |
| Game detail | `getLiveScorecard` (**same URL**) | **1 s** | `pages/GameDetails/components/CustomLiveScoreCard.tsx:37` | `!eventId \|\| !isAuthenticated`. Different endpoint name from `getRawScorecard`, so a separate cache entry. If both components mount, the URL is requested twice on separate timers (`INFERRED`; whether both mount is checked in Module 5) |
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

Remaining frequency question: Q-04, whether two raw-scorecard timers can run at once. That will be answered from source in Module 5/7. See [open-questions.md](open-questions.md).

## Supplemental Login and Signup module

Signup OTP, registration, and login are user-triggered POST mutations; none is configured with `pollingInterval` (`rsplay:src/pages/Auth/hooks/useRegister.ts:65-99 (useRegister)`, `rsplay:src/pages/Auth/hooks/useLogin.ts:32-42 (useLoginPage)`, `vishnu7:src/pages/auth/SignupPage.tsx:87-128 (SignupPage)`, `vishnu7:src/pages/auth/LoginPage.tsx:47-55 (LoginPage)`). See the [API inventory](../docs/01-user-panel/authentication/api-inventory.md).
