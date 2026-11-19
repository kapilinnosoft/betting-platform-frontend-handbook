# Module 8: Casino (API inventory)

These are the casino APIs used by the lobby and the launch flow. vishnu7 `@6f3b811`; all definitions are in `store/api/casinoApi.ts` and inject into the shared RTK Query `apiSlice`, which adds `authorization: Bearer <access-token cookie>`.

Response shapes come from the TypeScript types and the fields the code reads. They are not captured backend responses.

## Summary

| # | Endpoint name | Request | Trigger | Frequency | Consumer | Doc |
|---|---|---|---|---|---|---|
| C1 | `getCasinoGames` | `GET /casino/games?{filters}&t=<now>` | `ON_MOUNT`, `ON_STATE_CHANGE` (provider, category, debounced search), `ON_INTERACTION` (scroll → next page) | Once per argument set; `refetchOnMountOrArgChange: true` | `useCasinoLobby` | Canonical |
| C2 | `getCasinoCategories` | `GET /casino/category?provider=…&t=<now>` | `ON_MOUNT`, provider change | Once per provider value | `useCasinoLobby` | Canonical |
| C3 | `getCasinoProviders` | `GET /casino/providers?page=1&limit=50&t=<now>` | `ON_MOUNT` | Once (cached 60 s) | `useCasinoLobby` | Canonical |
| C4 | `createCasinoSession` | `POST /casino/create-session/:id` body `{ platform }` | `ON_INTERACTION` (game click) | Once per launch; locked for ≥ 3 s except from the Aviator tile | `useCasinoGameLauncher` | Canonical |
| C5 | `getLobbyUrlById` | `GET /casino/lobby/:userId` | `ON_MOUNT` of `/casino-qtech` | Once (cached 60 s) | `pages/QTECHLobby` | Canonical |
| C6 | `getHomeCasinoGames`, `getHomeProviderGames` | `GET /casino/home/games`, `/casino/home/provider` | Home and Dashboard mount | Once | Dashboard, Home `CasinoGames` | [Module 1 › V3–V4](../01-home-page/api-inventory.md#v3v4-gethomecasinogames-gethomeprovidergames-canonical) |
| — | `getCasinoRoundHistory` | `GET /casino/round/history` | — | — | Casino bet history report | [Module 4 › S6](../04-reports/api-inventory.md#s6-getcasinoroundhistory) (documented from the other implementation; response confirmed by the team, Q-26) |

`t=<now>` is the deliberate cache-buster (Q-06). It is added in the query function, so it is not part of the RTK cache key.

Defined but **not called** at HEAD: `getHomePageCasinoGames` (`/casino/static/games`), `getHomeCasinoSidebarGames` (`/casino/home-section/games`), `getHomeFavouriteCasinoTables` (`/casino/recent-tables`; its only use is commented out in `Home/components/CasinoGames.tsx:16`), `getCasinoGameProviders` (`sports-provider/casino`) and `launchGame` (`POST /casino/gamelauncher/:id`, which has the same body shape as `createCasinoSession`). Do not confuse the `launchGame` **endpoint** with the Redux action of the same name.

---

## C1 `getCasinoGames`

| Item | Value |
|---|---|
| Definition | `casinoApi.ts:206-225` |
| Call | `useCasinoLobby.ts:52-62` |

**Request.** Only truthy values are appended (`casinoApi.ts:208-217`):

| Param | Value from the lobby | Notes |
|---|---|---|
| `provider` | `selectedProvider`, omitted when `'all'` | Lower-cased (Q-25) |
| `category` | `selectedCategory`, omitted when `'all'` | Lower-cased (Q-25) |
| `status` | `'ACTIVE'` | always |
| `limit` | `20` | `LIMIT` constant |
| `page` | `1, 2, 3 …` | infinite scroll |
| `search` | debounced search text, omitted when empty | 500 ms debounce |
| `userId`, `ProviderId` | not sent by the lobby | supported by the query builder |

Example on first open: `GET /casino/games?status=ACTIVE&page=1&limit=20&t=…`.

**Response** (TS `GetCasinoGamesResponse`, `casinoApi.ts:50-60`): `{ success, message, games: CasinoGame[], pagination: { currentPage, limit, total, totalPage } }`, where `CasinoGame = { id, casinoProviderId, category, code, createdAt, externalId, gameImage, gameProviderName, isTrending, name, priority, status }`.

**UI mapping**

| Field | Use |
|---|---|
| `games[]` | Appended to the lobby list; a page shorter than 20 ends paging |
| `games[].id` | `onPlay(id)` → launch (C4) |
| `games[].name` | Card title and `alt`; button `aria-label` |
| `games[].gameImage` | Card image (fallback `casino-fallback.webp`) |
| `pagination` | **Not used** |

## C2 `getCasinoCategories`

| Item | Value |
|---|---|
| Definition | `casinoApi.ts:254-271` |
| Call | `useCasinoLobby.ts:66-68`: `{ provider: selectedProvider === 'all' ? undefined : selectedProvider }` |
| Request | `GET /casino/category?provider={provider}&t=…` (no `provider` for "all"). `search` and `providerId` are supported but not sent |
| Response (TS) | `{ games: string[] }`, a list of category names. The field is called `games` even though it holds categories |
| UI | `['all', ...games]` → category tabs; icon from `categoryIconMap[name]` |

## C3 `getCasinoProviders`

| Item | Value |
|---|---|
| Definition | `casinoApi.ts:283-303` |
| Call | `useCasinoLobby.ts:70-73`: `{ limit: 50, page: 1 }` |
| Request | `GET /casino/providers?page=1&limit=50&t=…` |
| Response (TS) | `{ providers: { provider, aggregator, status }[], success, pagination }` (`casinoApi.ts:165-175`) |
| UI | `['all', ...providers.map(p => p.provider)]` → provider tabs. `aggregator` and `status` are not used; the lobby does not filter out inactive providers on the client |
| Limit | Only the first 50 providers are ever shown; there is no paging for this list |

## C4 `createCasinoSession`

| Item | Value |
|---|---|
| Definition | `casinoApi.ts:326-333` (mutation) |
| Call | `useCasinoGameLauncher.ts:14,32-36` |
| Request | `POST /casino/create-session/{gameId}`, body `{ platform: 'Mobile' \| 'Desktop' }` (`CreateCasinoSessionRequest`, `casinoApi.ts:124-127`) |
| Auth | Bearer token from the cookie. The frontend refuses to call it for guests |
| Response (TS) | `{ success: boolean, status: string, message: string, url?: string }` (`casinoApi.ts:129-134`) |

| Response case | Frontend behaviour |
|---|---|
| `url` present | Redux `launchGame(url)`, then navigate to `/casino-playground` with `state.gameUrl = url` |
| `success === false` | Error toast with `message`, or "Failed to get game URL" |
| HTTP error | Error toast with `error.data.message`, or "Failed to create session" |
| no `url`, `success` not `false` | No feedback (overview F3) |

What the URL contains (a provider launch link with a session token, for example) is not visible in the frontend: `BACKEND CONFIRMATION REQUIRED`. Do not copy real URLs into documentation.

## C5 `getLobbyUrlById`

| Item | Value |
|---|---|
| Definition | `casinoApi.ts:334-340` |
| Call | `pages/QTECHLobby/index.tsx:7`: `{ userId: Number(state.user.info?.id) }`, with no `skip` |
| Request | `GET /casino/lobby/{userId}`. This can be `/casino/lobby/NaN` before the profile loads (overview F7; Q-24, team-confirmed defect, deferred) |
| Response (TS) | `{ sessionId: string, url: string }` |
| UI | `<iframe src={url}>`. `sessionId` is not used. No error state |
