# Module 1: Home Page (API inventory)

This is every API call that runs on the home pages, with its trigger, frequency, reason, request and the response fields the UI uses.

**Common capability map:** [Home Page API and feature reference](home-page-reference.md) groups banners, popular fixtures, fixture counts, and casino content into one Home module entry point.

- **Canonical** means this page holds the full documentation for that API, and later modules link here.
- **Usage** means the full documentation lives in another module and only the home-page usage is described here.

Response shapes come from the TypeScript types **and** the fields the code actually reads. They are not verified backend contracts: no live responses were captured. Because the backends share one template (Q-12), field lists for the shared endpoints apply to both brands as `INFERRED (shared backend template)`.

Frequency classes: `INITIAL`, `ON_MOUNT`, `ON_INTERACTION`, `ON_STATE_CHANGE`, `POLLING`, `SOCKET`, `ON_FOCUS`, `ON_ROUTE_CHANGE`, `MANUAL`, `UNKNOWN`.

---

## rsplay (`810884b`)

### Execution summary

| # | API (endpoint name) | Endpoint | Method | Trigger | Frequency | Condition | Reason | Consumer | State | Doc |
|---|---|---|---|---|---|---|---|---|---|---|
| R1 | `getBanners` | `/banners?platform=WebBanner&type=HomeBanner\|HomeBannerLogin` | GET | `ON_MOUNT`, `ON_STATE_CHANGE` (login flips `type`) | Once per argument set (cached 60 s after unmount) | always | Desktop main carousel images | `MainBanner` | RTK cache only | Canonical |
| R2 | `getBanners` | `/banners?platform=AppBanner&type=HomeBanner\|HomeBannerLogin` | GET | same | same | always, even on desktop | Mobile main carousel images | `MainBanner` | RTK cache | Canonical |
| R3 | `getBanners` | `/banners?platform=WebBanner&type=SecondaryBanner` | GET | `ON_MOUNT` | once | always | Desktop 3-up promo grid | `SecondaryBanner` | RTK cache | Canonical |
| R4 | `getBanners` | `/banners?platform=AppBanner&type=SecondaryBanner` | GET | `ON_MOUNT` | once | always | Mobile promo slider | `SecondaryBanner` | RTK cache | Canonical |
| R5 | `getEvents` | `/fixture?status=ACTIVE` | GET | `ON_MOUNT` then `POLLING` | **every 2 s** | always (guest and logged in) | Live odds and status of the top matches | `useFixtureData` → `SportsListing` / `SportsListingLogin` | RTK cache. Derived lists live in `useMemo` | Canonical |
| R6 | `getRaces` | `/fixture/race?sport=HorseRacing&status=ACTIVE` | GET | `ON_MOUNT` / `ON_INTERACTION` (tab), then `POLLING` | every 10 s | guest: only while the Horse Racing tab is active. Logged in: always | Upcoming race cards | `SportsListing` / `SportsListingLogin` | RTK cache | Canonical |
| R7 | `getRaces` | `/fixture/race?sport=Greyhound&status=ACTIVE` | GET | same | every 10 s | guest: Greyhound tab active. Logged in: always | same | same | RTK cache | Canonical |
| R8 | `getCasinoGames` | `/casino/games?category=card&page=1&limit=10&status=ACTIVE&t=<now>` | GET | `ON_MOUNT` | once (cached 60 s) | always | "Popular games" slider | `PopularGames` | RTK cache | Usage (canonical: Module 8) |
| R9 | `getSystemSettings` | `/system?t=<now>` | GET | `ON_MOUNT` (+ `refetchOnMountOrArgChange`), then `POLLING` | every 30 s (shared with the layout) | always | Whether master-owner users may deposit or withdraw | `Home` | RTK cache | Canonical |

`t=<now>` is a deliberate cache-buster (team confirmation, Q-06). It is added inside the query function, so it is **not** part of the RTK cache key: every poll or refetch gets a new `t`, and the cache entry stays the same. `OBSERVED` (`casinoApi.ts:30`, `systemApi.ts:31`).

### Layout calls that also run on the home page

These are fired by `HomeLayout` children on every page. They are listed here because they make up the home page's real network profile. Full documentation is deferred to Phase 4 (shared modules).

| API | Endpoint | Frequency | Condition | Caller |
|---|---|---|---|---|
| `getFixtureCounts` | `GET /fixture/counts` | 2 s | always | `components/Header.tsx:67-69` |
| `getUserWallets` | `GET /users/me/wallets` | 5 s | logged in | `Header.tsx:57-60` |
| `getUserProfile` | `GET /users/me` | once | logged in | `Header.tsx:54` |
| `getIsMasterOwner` | `GET /users/is/master-owner/user` | once | logged in | `Header.tsx:55` |
| `getSystemSettings` | `GET /system` | 30 s | always | `Header`, `Sidebar` (same entry as R9) |
| `getNotifications` | `GET /notifications?type=Alert` | 30 s | always | `HomeLayout.tsx:12-15`, `AlertNotification.tsx:6-9` |
| `getContactSupportAccount` | `GET /contact-support/show-account` | once | logged in and not demo (MobileFooterBar); logged in (Sidebar) | `MobileFooterBar.tsx:33`, `Sidebar.tsx:55` |
| `getContactSupport` | `GET /contact-support` | once | guest or demo | `MobileFooterBar.tsx:36` |

`MobileFooterBar` is hidden with `md:hidden` but **always mounted**, so its support query also runs on desktop. `OBSERVED`.

---

### R1–R4 `getBanners`: canonical

| Item | Value |
|---|---|
| Business purpose | Admin-managed banner images per placement (`type`) and device family (`platform`) |
| Definition | `store/api/contentApi.ts:6-13` (`contentApi.getBanners`) |
| Hook | `useGetBannersQuery(params)` |
| Auth | Bearer token if present (global `prepareHeaders`). Also called by guests. Whether the backend filters by login is `BACKEND CONFIRMATION REQUIRED` |
| Cache tag | `provides: ['Content']`. No mutation in the user panel invalidates it |

**Request.** Query string built from `params` by `fetchBaseQuery` (undefined values are dropped):

| Param | Type (`types/Content.ts:86-91`) | Values used on home |
|---|---|---|
| `platform` | `'WebBanner' \| 'AppBanner'` | both |
| `type` | `BannerType` | `HomeBanner` (guest), `HomeBannerLogin` (logged in), `SecondaryBanner` |
| `page`, `limit` | number | not sent |

**Response.** The type is `BannerResponse` (`types/Content.ts:81-84`). The fields read by the code are confirmed by usage:

```text
{
  count: number,
  data: {
    WebBanner?: { [type]: Banner[] },
    AppBanner?: { [type]: Banner[] }
  }
}
Banner = { id, name, heading, description, size, image, type, platform, isPubliced, createdAt, updatedAt }
```

**UI mapping**

| Response field | Transformation | Variable | Component | UI |
|---|---|---|---|---|
| `data.WebBanner[bannerType][]` | `?? []`. Uses the static fallback when empty | `desktopBanners` | `MainBanner` | Desktop slides (`md:block`), aspect 1664/260 (logged in) or 1664/540 (guest) |
| `data.AppBanner[bannerType][]` | same | `mobileBanners` | `MainBanner` | Mobile slides, aspect 400/156 or 400/210 |
| `…[].image` | `getBannerImage()` (`image` for API data, `img` for fallback) | — | `MainBanner` | `<img src>` |
| `…[].id` | — | — | both | React `key`, `alt="Banner {id}"` |
| `data.WebBanner.SecondaryBanner[]` | `.slice(0, 3)` | `webBanners` | `SecondaryBanner` | 3-column grid, aspect 545/285 |
| `data.AppBanner.SecondaryBanner[]` | `.slice(0, 3)` | `appBanners` | `SecondaryBanner` | Swiper (1 slide below 640 px, 2 at 640 px and up) |
| `…[].name` | — | — | `SecondaryBanner` | `alt` |

Not used on home: `heading`, `description`, `size`, `isPubliced` (rsplay does **not** filter on `isPubliced`; vishnu7's Dashboard does). Whether the backend already excludes unpublished banners is `BACKEND CONFIRMATION REQUIRED`.

---

### R5 `getEvents`: canonical (shared with Module 2)

| Item | Value |
|---|---|
| Business purpose | List of active fixtures (matches) with top-of-book prices for each runner |
| Definition | `store/api/eventsApi.ts:298-315` |
| Hook path | `useGetEventsQuery(queryParams, { pollingInterval: 2000 })` in `pages/Inplay/Hooks/useFixtureData.ts:55-57` |
| Other callers | `hooks/useSidebar.ts:57-60` (`{competitionId}`, skipped until a competition is opened); `pages/Inplay` (Module 2) |
| Cache tag | `provides: ['Events']` |

**Request.** Built by `useFixtureData.ts:41-53`, then `eventsApi.ts:300-314`. A param is appended only when **truthy**:

| Hook field | Value on `/` | Sent? | Query param |
|---|---|---|---|
| `sportName` | `''` (no sport prop) | no | `sport` |
| `competitionId` | `Number(undefined)` = `NaN` | no (falsy) | `competitionId` |
| `inplay` | `false` (path is not `/inplay`) | no | `inplay` |
| `matchTime` | `''` (default tab `In-Play`) | no | `matchTime` |
| `status` | `'ACTIVE'` | **yes** | `status` |
| `search` | `''` | no | `search` |

→ **`GET /fixture?status=ACTIVE`** (`OBSERVED` by tracing). The home page always requests every active fixture of every sport. Module 2 documents the other parameter combinations.

**Response.** `useFixtureData` reads the following fields. The declared TS type `EventItem` (`eventsApi.ts:43-60`) **does not match**: it declares `runner?: Runner[]`, while the code reads `runners`, `marketId` and `isPremiumFancy` (Q-14).

```text
{ success, message, fixture: [
  { id, name, sport, startTime, inplay, marketId, isFancy, isBookmaker, isPremiumFancy,
    competition: { name },
    runners: [ { runnerName, backPrice1, backSize1, layPrice1, laySize1 } ] } ] }
```

**Transformation** (`useFixtureData.ts:61-119`, `transformEvents` + `groupedEvents`):

| Response field | Becomes | Notes |
|---|---|---|
| `id` | `eventId = Number(id)` | Used in the navigation URL |
| `name` | `eventName` | |
| `competition.name` | `competitionName` (`?? ''`) | |
| `inplay` | `inplay` | Drives the LIVE badge |
| `startTime` | `time` | `formatMatchDateTime(time)` when not live |
| `marketId`, `isFancy`, `isBookmaker`, `isPremiumFancy` | same names | Flags drive the BM, Fancy and Premium icons |
| flags + `inplay` | `tags[]` | `fancy`, `bookmaker`, `premium`, `streaming`. Not rendered on home |
| `runners[i].{runnerName, backPrice1, backSize1, layPrice1, laySize1}` | `runners[i] = {runnerName, odds:[{price,size,type:'back'},{price,size,type:'lay'}]}` | |
| `runners[0], [2], [1]` back/lay | `odds[]` (6 entries) | Legacy shape; `InplayRow` re-derives it from `runners` |
| `sport` | grouping key | `cricket` → cricket, `soccer` → **football**, `tennis` → tennis. Other sports are discarded |

**UI mapping** (`InplayRow.tsx`):

| Field | UI |
|---|---|
| `inplay` | Red "LIVE" badge (`racing.live`); otherwise date/time plus `|` (desktop) |
| `eventName` | Bold, truncated title |
| `time`, `competitionName` | Mobile sub-line: watch icon, date, competition |
| `isBookmaker`, `isFancy`, `isPremiumFancy` | Icons `bm-icon1.svg`, `fancy-icon1.svg`, `premium-icon1.png` |
| *(none)* | TV icon `tv-icon1.svg`, **always shown** |
| `runners[0]`, `runners[2]`, `runners[1]` → back/lay `price` | Six `OddButton`s in "1 / X / 2" order. All hidden when `competitionName === eventName` |
| missing runner | Fallback `{price:null}` pair (`oddsFallback`) |

---

### R6–R7 `getRaces`: canonical

| Item | Value |
|---|---|
| Purpose | Racing fixtures (meetings) with their race markets |
| Definition | `store/api/eventsApi.ts:324-344` |
| Request | `GET /fixture/race` with `params: { sport, competitionId: seriesId, search, inplay, status }`. Undefined values are dropped, so on home: `?sport=HorseRacing|Greyhound&status=ACTIVE` |
| Cache tag | `provides: ['Sports']` |

**Response.** TS type `RaceFixtureResponse` / `RaceFixture` (`eventsApi.ts:76-115`). Fields read on home:

| Field | Use |
|---|---|
| `fixture[].markets[]` | Kept only if `length > 0`. The guest view also drops fixtures with any market named `forecast` |
| `fixture[].id`, `.sport`, `.name` | Card title (`name`); navigation URL (`sport`, `id`) |
| `markets[].name` | Markets whose name includes "to be placed" are excluded |
| `markets[].startTime` | Sorted ascending. A race counts as **upcoming** while `startTime + 10 min ≥ now`; if none are upcoming, the last 4 are shown. LIVE when `now ≥ startTime` (`utils/index.ts:253-259`) |
| `markets[].externalId` | Third segment of `/details/{sport}/{id}/{externalId}` |

Display limits: 3 fixtures (guest) or 5 (logged in); 4 race buttons on mobile (`innerWidth < 668`) or 8 on desktop (`RaceRow.tsx:45-47`).

---

### R8 `getCasinoGames`: home usage

| Item | Value |
|---|---|
| Definition | `store/api/casinoApi.ts:15-32` |
| Args from home | `{ category: 'card', limit: 10, page: 1, status: 'ACTIVE' }` (`PopularGames.tsx:18-19,32-37`) |
| Wire request | `GET /casino/games?category=card&page=1&limit=10&status=ACTIVE&t=<now>` |
| Fields used | `games[].id`, `.name`, `.gameProviderName` (navigation), `.gameImage` (`<img>`; on error `/images/casino/casinofallback.png`) |
| TS type | `GetCasinoGamesResponse` (`types/casino.ts:26-36`): `{ success, message, games: CasinoGame[], pagination }` |

Canonical documentation, including how `/GAME/:id` launches the game, belongs to Module 8.

---

### R9 `getSystemSettings`: canonical

| Item | Value |
|---|---|
| Purpose | Feature switches configured by the operator |
| Definition | `store/api/systemApi.ts:27-34` |
| Request | `GET /system?t=<now>`, no other params |
| Response (TS) | `SystemSettingsResponse` (`systemApi.ts:17-23`): `{ registration, deposit, withdrawal, masteranalytics?, LayMarket? }`, each a `SystemSetting { id, mappedTo, text, description, type, context, default, isDefinedOptions, parentId, options[], selection: boolean \| null }` |
| Used on home | `deposit.selection`, `withdrawal.selection`, **only when the user is a master owner** (`index.tsx:28-31`) |
| Used elsewhere | `LayMarket.selection` hides lay buttons in racing (`RacingDetails.tsx:23`). Header, Sidebar, ProfileDrawer and FeatureRoute (Phase 4) |

---

## vishnu7 (`6f3b811`)

### Execution summary

| # | API | Endpoint | Method | Page | Trigger | Frequency | Condition | Reason | Consumer | State | Doc |
|---|---|---|---|---|---|---|---|---|---|---|---|
| V1 | `getBanners` | `/banners?platform=<P>&type=MainBanner` | GET | `/dashboard` | `ON_MOUNT`, `ON_STATE_CHANGE` (platform flip on resize) | once per platform (cached 60 s) | always | Hero carousel | `Dashboard` | RTK cache | Canonical |
| V2 | `getBanners` | `/banners?platform=<P>&type=WellcomeBanner` | GET | `/dashboard` | same | same | always (guests too) | Post-login welcome popup | `WelcomePopup` | RTK cache | Canonical |
| V3 | `getHomeCasinoGames` | `/casino/home/games?t=<now>` | GET | `/dashboard`, `/home` | `ON_MOUNT` | once (cached 60 s; shared entry) | always | Popular casino grid | `Dashboard` (16), `Home/CasinoGames` (24) | RTK cache | Canonical |
| V4 | `getHomeProviderGames` | `/casino/home/provider?t=<now>` | GET | `/dashboard` | `ON_MOUNT` | once | always | "Indian card games" per provider | `Dashboard` | RTK cache | Canonical |
| V5 | `getNotifications` | `/notifications?type=Alert` | GET | both (via `Marquee`) | `ON_MOUNT` | once (no polling) | always | Scrolling alert text | `components/Marquee.tsx:9` | RTK cache | Usage (Phase 4) |
| V6 | `getMatchesGroupedByCompetition` | `/fixture/groupByCompetition?sport=Cricket&sortBy=time` | GET | `/home` | `ON_MOUNT` then `POLLING` | **every 3 s** | always | Cricket match table with live prices | `useGroupedFixtures` → `BettingTable` / `GroupedBettingTable` | RTK cache. Derived values recomputed each render | Canonical |
| V7 | `getPopularEvents` | `/events/popular` | GET | `/home` | `ON_MOUNT` | once | always (even below `xl`, where it is hidden) | Popular-events slider | `usePopularEvents` → `TopGames` | RTK cache | Canonical |
| V8 | `getMatches` | `/fixture` (no params) | GET | `/home` | `ON_MOUNT` | once | always | Start time for each popular event | `usePopularEvents` | RTK cache | Usage (canonical: Module 2) |

Layout calls on both pages (Phase 4): `getUserInfo` and `getUserWallets` every 5 s when logged in, and `getContactSupport` once (`components/Header.tsx:46-48`). `Sidebar` fetches nothing until a node is expanded.

---

### V1–V2 `getBanners`: canonical (vishnu7)

| Item | Value |
|---|---|
| Definition | `store/api/contentApi.ts:6` (same shape as rsplay's: `{ url: '/banners', params }`) |
| `platform` | From `useBannerPlatform()`: `'AppBanner'` if `innerWidth < 1080`, else `'WebBanner'` |
| Dashboard mapping | `data[platform].MainBanner[]` → filter `isPubliced && image` → `{id, image, title: heading \|\| name}`. Falls back to `heroSlides` when empty (`Dashboard/index.tsx:26-38`) |
| WelcomePopup mapping | `data[platform].WellcomeBanner[]` → slides (`image`), aspect 902/644 |
| Note | The backend type name is spelled `WellcomeBanner` (double "l") in both repos' types. It must be sent exactly like that |

### V3–V4 `getHomeCasinoGames`, `getHomeProviderGames`: canonical

| Item | `getHomeCasinoGames` | `getHomeProviderGames` |
|---|---|---|
| Definition | `store/api/casinoApi.ts:349-355` | `casinoApi.ts:356-362` |
| Request | `GET /casino/home/games?t=<now>` | `GET /casino/home/provider?t=<now>` |
| Response (TS) | `{ success, message, data: HomeCasinoGameItem[] }` | `{ success, message, data: { providerName, games: HomeCasinoGameItem[] }[] }` |
| Item fields (TS, `casinoApi.ts:176-186`) | `id, externalId, code, name, gameProviderName, category, gameImage, minBet, maxBet` | same |
| Fields used | `id`, `name`, `gameImage` (through `CasinoGameCard`) | `providerName` (heading; lower-cased and passed to `playGame`), `games[].id`, `.name`, `.gameImage` |
| Image rule | — | `staticGameImages[name]` → `gameImage` → `/images/casino/casino-fallback.webp` |
| Click | `playGame(game.id)`, provider defaults to `'mac88'` (`useCasinoGamePlay.ts:17`) | `playGame(game.id, providerName.toLowerCase())` |

### V6 `getMatchesGroupedByCompetition`: canonical (shared with Module 2)

| Item | Value |
|---|---|
| Definition | `store/api/sportsApi.ts:198-212` |
| Hook path | `useGroupedFixtures({ sportName })` → `useGetMatchesGroupedByCompetitionQuery({ sportName, sortBy:'time', inplay, search }, { skip, pollingInterval: 3000 })` |
| Request on `/home` | `sport: sportName === 'football' ? 'Soccer' : sportName` → `Cricket`. `sortBy=time`. `inplay` is omitted when undefined, `search` when empty → **`GET /fixture/groupByCompetition?sport=Cricket&sortBy=time`** |
| Response (TS) | `GroupedFixtureResponse = { success, message, fixture: Record<sport, Record<competition, Fixture[]>> }` (`sportsApi.ts:63-67`) |
| `Fixture` fields (TS, `sportsApi.ts:74-114`) | `id, competitionId, providerId, externalId, name, sport, startTime, status, isFancy, isBookmaker, isPremiumFancy, isPopular, inplay, competition{id,externalId,name}, lay[], back[], runners[{runnerName, backPrice1..3, layPrice1..3, backSize1..3, laySize1..3, …}]` |

**Transformation** (`useGroupedFixtures.ts:32-36`, `utils/index.ts:16-45`):
1. `getSportFixtureGroups(fixture, 'Cricket')` keeps only the sport key that matches case-insensitively (`football` is normalised to `soccer`).
2. `flattenFixtureGroups` flattens to `Fixture[]`.
3. `sortFixturesByStartTime` sorts ascending by `startTime`.
4. `sortFixturesWithTopLeaguesFirst` puts fixtures where `id === competitionId` ("league entries") first, otherwise keeping the order.

**UI mapping** (`components/common/BettingTable.tsx`):

| Field | UI |
|---|---|
| `inplay` | Green dot and TV icon (`/icons/new/tv.png`). Unlike rsplay, the TV icon is shown **only** when `inplay` |
| `runners[0]`, `[2]`, `[1]` `.backPrice1` / `.layPrice1` | Three `OddsColumn`s (1 / X / 2). `'-'` when missing; "locked" when both are undefined |
| `sport`, `id` | Click → `/game-details/{sport}/{id}` |
| groups (competitions view) | `GroupedBettingTable` renders one block per competition |

### V7–V8 `getPopularEvents` + `getMatches`

| Item | `getPopularEvents` | `getMatches` (home usage) |
|---|---|---|
| Definition | `sportsApi.ts:169-175` | `sportsApi.ts:177-197` |
| Request | `GET events/popular` (no leading slash; resolves against the base URL) | `GET /fixture` with **no** params (`{}`) |
| Response (TS) | `PopularEventsResponse { success, message, events: PopularEvent[] }` (`types/MatchData.ts:498-502`) | `FixtureResponse { success, message, fixture: Fixture[] }` |
| Fields used | `events[].id`, `.name`, `.sport` | `fixture[].id`, `.startTime` → `Map<String(id), startTime>` |
| UI | `PopularEventCard` (name, sport, start time). Click → `/game-details/{sport}/{id}` | Only feeds the start time to the cards |

`INFERRED`: if `/events/popular` returned `startTime` itself, the extra request for the whole `/fixture` list would be unnecessary. Q-19.
