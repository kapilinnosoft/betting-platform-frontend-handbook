# Module 1: Home Page (overview)

**Repos:** rsplay = `rsplay/rsplay-user@810884b` (primary) · vishnu7 = `vishnu7/vishnu7user@6f3b811` (secondary). Paths are relative to each repo's `src/`.

**Common Home reference:** [Home Page API and feature map](home-page-reference.md) · [visual-guide.html](visual-guide.html). Detailed source evidence follows this common entry point.

**Files in this module**

| File | What it covers |
|---|---|
| this page | What the home page shows, for whom, and where clicks go |
| [component-flow.md](component-flow.md) | Component trees and which component calls which API |
| [api-inventory.md](api-inventory.md) | Every API on the page: trigger, frequency, request, response fields, UI mapping |
| [api-data-flow.md](api-data-flow.md) | End-to-end traces from route to pixels for the main APIs |
| [polling-and-frequency.md](polling-and-frequency.md) | What repeats, how often, what starts and stops it, and duplicate-request analysis |

Calls made by the **layout** (header, sidebar, alerts) also run on the home page. They are listed here for completeness, but their canonical home is the Phase 4 shared-modules docs. The always-on set is already summarised in [polling-and-frequency-inventory.md](../../../inventory/polling-and-frequency-inventory.md).

---

## rsplay: `/` → `pages/Home/index.tsx`

### What the user sees

The page has **two variants**, selected by `useIsAuthenticated()` (`state.auth.isAuthenticated`) in `pages/Home/index.tsx:60-68`. `OBSERVED`.

| # | Section | Guest | Logged in | Data source |
|---|---|---|---|---|
| 1 | Deposit / Withdraw buttons (mobile only, `sm:hidden`) | — | Shown if not demo. For master-owner users, shown only when `/system` `deposit.selection` / `withdrawal.selection` is true (`index.tsx:28-31`) | `getSystemSettings` + `state.user` |
| 2 | Main banner carousel (`MainBanner`) | `HomeBanner` type | `HomeBannerLogin` type | `getBanners` ×2 (Web + App), with fallback to static images |
| 3 | Secondary banners (`SecondaryBanner`) | yes | yes | `getBanners` ×2, max 3 each. The section is hidden if both are empty |
| 4 | Sport picture slider (`SportsSection`) | yes | — | Static (no API, not clickable) |
| 5 | Sport tabs + top-3 list (`SportsListing`) | yes | — | `getEvents` (2 s) and `getRaces` (10 s, only the active racing tab) |
| 6 | Casino bonus slider (`CasinoBanner`) | yes. A click opens the login modal | — | Static images |
| 5' | Five sections of up to 5 rows each (`SportsListingLogin`) | — | yes | `getEvents` (2 s) and `getRaces` ×2 (10 s, always) |
| 7 | Popular games slider (`PopularGames`) | yes | yes | `getCasinoGames({category:'card', limit:10, page:1, status:'ACTIVE'})` |

Imported but not rendered: `SportsTab` and `EventsTable` (`index.tsx:7,10`). `OBSERVED`.

### Sport tabs and limits

| Component | Sports shown | Rows per sport | Race filter |
|---|---|---|---|
| `SportsListing` (guest) | One tab at a time: Cricket (default), Soccer, Tennis, Horse Racing, Greyhound | **3** | Fixtures with ≥1 market and **no** market named "forecast" |
| `SportsListingLogin` (logged in) | Cricket, Soccer, Tennis, Greyhound, Horse Racing, all stacked | **5** | Fixtures with ≥1 market (forecast **not** excluded) |

`OBSERVED`: `SportsListing.tsx:90-103`, `SportsListingLogin.tsx:40-74`. The forecast filter differs between the two (Q-16).

Matches come from a single `/fixture?status=ACTIVE` request. The frontend splits it into cricket, soccer (shown as "football") and tennis. **Fixtures of any other sport in the response are dropped** (`useFixtureData.ts:101-119`). `OBSERVED`.

### Where clicks go

| Click | Condition | Result | Source |
|---|---|---|---|
| Match row | anyone (the login check is commented out) | `navigate('/sports/{cricket\|football\|tennis}/market-details/{eventId}')` → Module 3 | `pages/Inplay/components/InplayRow.tsx:71-77` |
| Odds button in a row | — | No own handler; the click bubbles to the row, so same as above | `InplayRow.tsx:174-179` (no `onClick` passed to `OddButton`) |
| Race time button | guest | `openModal({name:'login'})` | `pages/Racing/components/RaceRow.tsx:67-71` |
| Race time button | logged in | `navigate('/details/{fixture.sport}/{fixture.id}/{market.externalId}')` → racing detail | `RaceRow.tsx:72` |
| Popular game | demo user | `toast.error(t('casino.demoNotAllowedToast'))` | `PopularGames.tsx:49-52` |
| Popular game | guest | login modal | `PopularGames.tsx:53-56` |
| Popular game | logged in | `navigate('/GAME/{id}?name={name}&provider={gameProviderName}')` → Module 8 | `PopularGames.tsx:41-46,58` |
| Casino bonus banner | (guests only see it) | login modal | `CasinoBanner.tsx:11-13` |
| Deposit / Withdraw | — | `<Link to="/deposit">` / `"/withdraw"` | `index.tsx:38-53` |

### Loading, empty and error states

| Section | Loading | Empty | Error |
|---|---|---|---|
| Main banner | none (shows fallback images immediately) | static fallback images from `utils/constants.ts` (`mainBanners`, `mainBannersMobile`, `mainBannersLogin`) | same as empty: `data` is undefined, so the fallback shows |
| Secondary banner | none | section not rendered (`return null`) | same as empty |
| Sport listings | spinner + `home.loadingEvents` | `home.noActiveEvents` | **No error UI.** On failure `data` is undefined, so the "no active events" text shows (`isError` is not read) |
| Popular games | 5 skeleton tiles | empty slider, no message | empty slider |

All `OBSERVED` from the component code.

### Notable implementation details
- **Loader on tab switch:** `useFixtureData` shows the spinner on the first load and on user-triggered refetches (tab or sport change), but not on the 2 s background polls (`useFixtureData.ts:153-164`).
- **When a row shows LIVE:** the badge is driven by the API's `inplay` flag. A `badges` list computed from the start time is never rendered, and the **TV icon is drawn on every row** regardless of stream availability (`InplayRow.tsx:92-99,165`). `OBSERVED`; tracked as Q-15.
- **Odds hidden for outrights:** odds are hidden when `competitionName === eventName`, i.e. outright or league-level entries (`InplayRow.tsx:100`).
- **Re-render guard:** rows are wrapped in `React.memo` with a deep compare on ids, tags, odds and runner prices, so 2 s polls only re-render rows whose prices changed (`InplayRow.tsx:207-219`).

---

## vishnu7: `/` → `/dashboard`, plus `/home`

vishnu7 has **two** home-like pages. `/` redirects to `/dashboard` (`App.tsx:58`). `/home` is a separate sports-first page. It is reached from the "Home" item in `Navbar` (`components/Navbar.tsx:13`) and `MobileNavbar` (`components/MobileNavbar.tsx:11`), after MFA OTP verification (`components/OTPModal.tsx:78`), and when `ProtectedRoute` bounces a guest or demo user (`components/common/ProtectedRoute.tsx:24`). Neither page branches on login state; the differences come from child components.

### `/dashboard` → `pages/Dashboard/index.tsx` (inside `DashboardLayout`)

| # | Section | Data source |
|---|---|---|
| 1 | Welcome popup (`WelcomePopup`) | `getBanners({platform, type:'WellcomeBanner'})`. Shown only when Redux `auth.isAuthenticated` is true, `localStorage.hasSeenWelcomePopup === 'false'`, there are banners, and `user.info.passwordChanged` is true |
| 2 | Hero carousel | `getBanners({platform, type:'MainBanner'})`. Keeps items with `isPubliced && image`, falling back to static `heroSlides` |
| 3 | Alert marquee (`<Marquee type="mobile"/>`) | `getNotifications({type:'Alert'})` |
| 4 | "GAMES" tiles | Static `sportsGames` → `/all-sports/Cricket`, `/Soccer`, `/Tennis`, `/Politics` (election) |
| 5 | "POPULAR GAMES" (first 16) | `getHomeCasinoGames` |
| 6 | "INDIAN CARD GAMES", grouped by provider | `getHomeProviderGames` (groups with ≥1 game) |
| 7 | "CASINO PROVIDERS" (12 static cards) | Static `newProviderCards` → `/casino?provider=…` |

`platform` comes from `useBannerPlatform()`: `AppBanner` when `window.innerWidth < 1080`, otherwise `WebBanner`. It is re-evaluated on resize (`hooks/useBannerPlatform.ts`).

### `/home` → `pages/Home/index.tsx` (inside `MainLayout`)

| # | Section | Data source |
|---|---|---|
| 1 | Popular-events slider (`TopGames`, CSS-visible only at `xl` and up) | `getPopularEvents` + `getMatches({})` (start times) |
| 2 | Two casino tiles | "Live Casino" → `window.open('/casino?provider=aura%20gaming', '_blank')`. "Aviator" → `launchCasinoGame(49, 'Aviator')` |
| 3 | View switch (`MatchListControls`: by time / by competition) | local state |
| 4 | Match table (`BettingTable` or `GroupedBettingTable`) | `getMatchesGroupedByCompetition({sportName:'Cricket', sortBy:'time'})` every 3 s |
| 5 | Side promotions (`HomePromotions`, `md` and up) | Static → `/casino?category=casino\|baccarat\|poker` |
| 6 | "Popular Casino" (24) and "Casino Providers" (12) (`CasinoGames`) | `getHomeCasinoGames` + static `newProviderCards` |

**Only cricket is ever listed.** `const [activeTab] = useState('Cricket')` has no setter (`pages/Home/index.tsx:14`). `OBSERVED`; Q-18.

### Where clicks go (vishnu7)

| Click | Result | Source |
|---|---|---|
| Match row | `navigate('/game-details/{row.sport}/{row.id}')` → Module 3 | `components/common/BettingTable.tsx:62-63` |
| Popular event card | `navigate('/game-details/{event.sport}/{event.id}')` | `pages/Home/components/TopGames.tsx:20` |
| Casino game card / provider-group game | `playGame(id, provider)` → consent modal → `launchCasinoGame` → `/casino-playground` (Module 8) | `hooks/useCasinoGamePlay.ts` |
| Provider card / promotion | `/casino?provider=…` or `/casino?category=…` | `Dashboard/index.tsx:218-221`, `HomePromotions.tsx:26-34` |
| Dashboard "GAMES" tile | `navigate(game.path)` unless `isDisabled` | `Dashboard/index.tsx:96-100` |

**Double-click protection on game launch:** `useCasinoGamePlay` keeps a ref lock and `launchingGameId`. The lock is held for at least **3 s** after a launch starts (`useCasinoGamePlay.ts:18-33`), and all game cards are disabled while it is held. `OBSERVED`.

### Loading, empty and error states (vishnu7)

| Section | Behaviour |
|---|---|
| Hero carousel | No loader. Static `heroSlides` until API banners arrive. A broken image falls back to an **external** `via.placeholder.com` URL (`Dashboard/index.tsx:67-70`) |
| Casino grids | No loader. Sections render nothing until data arrives. Image errors fall back to the static image, then the API image, then `/images/casino/casino-fallback.webp` |
| Match table | `NoMatchesFallback`: "No matches available" (`BettingTable.tsx:44-48`). No separate loading or error UI |
| Welcome popup | Hidden unless every condition above holds. Closing it sets `hasSeenWelcomePopup = 'true'` |

`Dashboard/index.tsx:157` logs to the console (`console.log('getGameImage', …)`) once per provider game on every render. `OBSERVED`.

---

## Differences at a glance

| Aspect | rsplay | vishnu7 |
|---|---|---|
| Landing route | `/` | `/` → `/dashboard` (casino-first), plus `/home` (sports-first) |
| Guest vs logged-in layout | Different components | Same components |
| Fixture API on home | `GET /fixture?status=ACTIVE` every 2 s, split by sport on the client | `GET /fixture/groupByCompetition?sport=Cricket&sortBy=time` every 3 s, grouped by the server |
| Sports listed | Cricket, soccer, tennis, horse racing, greyhound | Cricket only (on `/home`) |
| Racing on home | Yes (`/fixture/race`, 10 s) | No |
| Banners | 4 requests (main + secondary × web + app), both platforms always | 1–2 per banner type, platform chosen by width (1080 px) |
| Casino on home | `/casino/games?category=card` (10) | `/casino/home/games`, `/casino/home/provider` |
| Game launch from home | Navigate to `/GAME/:id` | Consent modal, then session, then `/casino-playground` |
