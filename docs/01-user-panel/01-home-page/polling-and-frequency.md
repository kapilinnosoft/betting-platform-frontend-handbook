# Module 1: Home Page (polling and frequency)

This page covers what repeats on the home pages, why, and what starts and stops it. The rules that apply to the whole app (no sockets, no focus/reconnect refetch, polling continues in hidden tabs on RTK 1.9.7) are in [polling-and-frequency-inventory.md](../../../inventory/polling-and-frequency-inventory.md#global-facts-both-repos).

Team confirmation (2026-11-18): the 1 s and 2 s polling rates are **intentional**, to keep live data current, and `t=Date.now()` is a deliberate cache-buster.

---

## rsplay (`810884b`)

### Requests on the home page over time

| Endpoint | Guest | Logged in | Class | Source |
|---|---|---|---|---|
| `GET /fixture?status=ACTIVE` | every 2 s | every 2 s | `POLLING` | `useFixtureData.ts:55-57` |
| `GET /fixture/counts` (layout) | every 2 s | every 2 s | `POLLING` | `Header.tsx:67-69` |
| `GET /users/me/wallets` (layout) | — | every 5 s | `POLLING` | `Header.tsx:57-60` |
| `GET /fixture/race?sport=HorseRacing&status=ACTIVE` | every 10 s while its tab is active | every 10 s | `POLLING` | `SportsListing.tsx:74-77` / `SportsListingLogin.tsx:31-34` |
| `GET /fixture/race?sport=Greyhound&status=ACTIVE` | every 10 s while its tab is active | every 10 s | `POLLING` | `SportsListing.tsx:79-82` / `SportsListingLogin.tsx:35-38` |
| `GET /system` | every 30 s (one shared entry) | every 30 s | `POLLING` | `Home`, `Header`, `Sidebar` (+ `ProfileDrawer` when open) |
| `GET /notifications?type=Alert` | every 30 s | every 30 s | `POLLING` | `HomeLayout`, `AlertNotification` (one entry) |
| `GET /banners` ×4 | once | once (+2 more on login) | `ON_MOUNT` / `ON_STATE_CHANGE` | `MainBanner`, `SecondaryBanner` |
| `GET /casino/games?category=card…` | once | once | `ON_MOUNT` | `PopularGames` |
| `GET /users/me`, `/users/is/master-owner/user` | — | once | `ON_MOUNT` | `Header` |
| `GET /contact-support[/show-account]` | once | once | `ON_MOUNT` | `MobileFooterBar`, `Sidebar` |

**Steady state, logged in, after the first load:** about **1 request/s** from the two 2 s polls, plus 0.2/s (wallets), plus 0.2/s (two race lists at 10 s), plus about 0.07/s (system and alerts at 30 s). That is roughly **1.5 requests per second** per open tab. `INFERRED` arithmetic from the intervals above.

### The 12 frequency questions: `getEvents` (2 s)

| # | Question | Answer | Label |
|---|---|---|---|
| 1 | How often? | Every 2000 ms | `OBSERVED` |
| 2 | What starts it? | `SportsListing` or `SportsListingLogin` mounting (through `useFixtureData`) | `OBSERVED` |
| 3 | What stops it? | Those components unmounting (leaving `/`, or the login state switching which one renders: the old one unmounts, the new one subscribes) | `INFERRED` (RTK semantics) |
| 4 | Does it run on tab switch? | The **sport tabs** in `SportsListing` do not change the query; they only pick which group to display, so there is no new request. Racing tabs start or stop `getRaces` instead | `OBSERVED` |
| 5 | Does it continue when the page is hidden? | Yes. RTK 1.9.7 has no `skipPollingIfUnfocused`; the browser may throttle timers | `INFERRED` |
| 6 | Can multiple components trigger it? | Yes: `pages/Inplay` and `useSidebar` also use `getEvents`, but with **different arguments**, so separate entries. On `/` only one listing is mounted, so there is one subscriber | `OBSERVED` |
| 7 | Can duplicates occur? | Not on `/`. On another page with the same arguments, RTK would share the entry | `INFERRED` |
| 8 | Does it re-run on re-render? | No. `queryParams` is memoised (`useMemo`), so re-renders keep the same cache key | `OBSERVED` |
| 9 | Caching / dedup? | RTK cache keyed by the serialised args. Kept 60 s after the last unsubscribe (default `keepUnusedDataFor`) | `INFERRED` (no override found) |
| 10 | Why this frequency? | Live prices and in-play status change constantly. Intentional (team, Q-03) | Team-confirmed |
| 11 | What goes stale if it stops? | LIVE badges, the 1/X/2 back/lay prices, and which matches appear at all | `OBSERVED` |
| 12 | Dependent on another API or socket? | No | `OBSERVED` |

### `getRaces` (10 s)

- **Guest:** each race query has `skip: activeId !== 4|5`, so only the selected racing tab polls. Switching to a racing tab triggers `ON_INTERACTION` plus an immediate fetch. Switching away stops it, and the data stays cached for 60 s.
- **Logged in:** both race queries poll continuously while the home page is open, even though only 5 cards each are shown.
- **Stale if stopped:** which races are upcoming or live and their start times. Note that the LIVE state is also computed from the client clock on every render (`isLiveRace`), so the badge can change between polls.

### `getSystemSettings` (30 s, shared)

`Home`, `Header` and `Sidebar` subscribe to the **same** entry (no args), so RTK polls it once every 30 s. Each subscriber sets `refetchOnMountOrArgChange: true`, so **every mount of any of these components triggers an immediate refetch**: navigating to `/` re-fetches `/system` even if it was fetched a moment ago. `INFERRED` from RTK semantics; the source is `OBSERVED`.

### One-shot requests and the 60 s cache

The banners and popular games are fetched once. Returning to `/` within 60 s reuses the cached data with no request. After 60 s, or on a full page reload, they are fetched again. `INFERRED` (default `keepUnusedDataFor`).

---

## vishnu7

### `/dashboard`

| Endpoint | Frequency | Class | Notes |
|---|---|---|---|
| `GET /users/me`, `GET /users/me/wallets` (layout) | every 5 s, logged in | `POLLING` | `Header.tsx:46-47` |
| `GET /contact-support` (layout) | once | `ON_MOUNT` | `Header.tsx:48` |
| `GET /banners?platform=…&type=MainBanner` | once per platform value | `ON_MOUNT`, `ON_STATE_CHANGE` | See "Platform flip" below |
| `GET /banners?platform=…&type=WellcomeBanner` | once per platform value | `ON_MOUNT`, `ON_STATE_CHANGE` | Requested for guests too |
| `GET /notifications?type=Alert` | once | `ON_MOUNT` | `Marquee` |
| `GET /casino/home/games?t=…` | once | `ON_MOUNT` | Same entry as `/home`'s `CasinoGames` |
| `GET /casino/home/provider?t=…` | once | `ON_MOUNT` | |

The Dashboard has **no page-level polling**.

### `/home`

| Endpoint | Frequency | Class | Notes |
|---|---|---|---|
| `GET /fixture/groupByCompetition?sport=Cricket&sortBy=time` | **every 3 s** | `POLLING` | `useGroupedFixtures.ts:25-30` (hook default) |
| `GET /events/popular` | once | `ON_MOUNT` | Runs even when `TopGames` is CSS-hidden (below `xl`) |
| `GET /fixture` (no params) | once | `ON_MOUNT` | Full fixture list, used only for start times. Team-confirmed: to be removed (Q-19) |
| `GET /casino/home/games` | once | `ON_MOUNT` | |
| layout (`/users/me`, wallets, contact support, alerts) | as above | | |

### 12 questions, condensed for `getMatchesGroupedByCompetition` (3 s)

1. Every 3000 ms. 2. Started by `pages/Home` mounting `useGroupedFixtures`. 3. Stopped by unmount; no `skip` on `/home`. 4. The view-mode switch (time or competitions) only changes rendering, not the request. 5. Continues in hidden tabs (`INFERRED`). 6. `pages/Inplay` and `pages/Sports` use the same hook with different args (separate entries); `SearchDropdown` also uses the endpoint. 7. No duplicate on `/home`. 8. Re-renders don't re-request (args are plain values; RTK serialises them). 9. RTK cache, 60 s default. 10. Live prices (intentional; the 3 s rate is the hook default). 11. The 1/X/2 prices, the in-play dot and TV icon, and match ordering. 12. No dependency.

### Platform flip (`useBannerPlatform`): extra request on narrow screens

`useBannerPlatform` initialises `isMobile = false` and only measures `window.innerWidth` inside `useEffect` (`hooks/useBannerPlatform.ts:4-11`). The first render therefore subscribes to `platform: 'WebBanner'`. On screens narrower than 1080 px the effect then flips it to `AppBanner`, which is a new cache key and a second request. `INFERRED`: on mobile, each of the `MainBanner` and `WellcomeBanner` queries is likely requested **twice** (Web, then App), and the Web response is discarded. The team confirmed this as a defect to be fixed (Q-17).

Resizing across 1080 px also triggers new requests (`ON_STATE_CHANGE`), but each platform is fetched only once within the 60 s cache window.

---

## Comparison

| | rsplay `/` | vishnu7 `/dashboard` | vishnu7 `/home` |
|---|---|---|---|
| Fastest page poll | 2 s (`/fixture`) | none | 3 s (`/fixture/groupByCompetition`) |
| Layout polls | 2 s, 5 s, 30 s, 30 s | 5 s ×2 | 5 s ×2 |
| Polls racing on home | yes (10 s) | no | no |
