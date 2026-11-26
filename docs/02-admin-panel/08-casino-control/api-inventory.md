# Admin Module A8: Casino Control (API inventory)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. The casino endpoints are defined in `store/api/casinoApi.ts`, and the upload in `store/api/commonApi.ts`. Both inject into the shared `apiSlice` (bearer token, `refetchOnMountOrArgChange: true`, `keepUnusedDataFor: 0`; `store/api/apiSlice.ts:40-41`). Response shapes come from TypeScript types (`types/index.ts:581-626,1785-1792`) and the fields the pages read, not from captured responses. Examples are sanitised.

Several paths have no leading slash (`casino/status/:id`, `casino/:id`); they resolve against the base URL.

## Summary

| # | Name | Request | Parameters sent | When it runs | Repeats | Consumer |
|---|---|---|---|---|---|---|
| CC1 | `getAllCategory` | `GET /casino/category` | `ts` | Casino Control opens (any tab); Category Level, Game Control and Edit Game mount; Refresh on Category Level | once per mount | [Category Level](overview.md#category-level) |
| CC2 | `getProviders` | `GET /casino/providers` | `ts` | Casino Control opens; Provider Level and Game Control mount; Refresh on Provider Level | once per mount | [Provider Level](overview.md#provider-level) |
| CC3 | `getAllGames` | `GET /casino/games` | `ts`, and when set: `page`, `limit`, `search`, `category`, `provider`, `status` | Casino Control opens (page 1, 10); Game Control filters and paging; category or provider grid; after CC4 or CC7 | once per argument set | [Game Control](overview.md#game-control) |
| CC4 | `gameStatusChange` | `PATCH casino/status/:id` | body `{ status: "ACTIVE" \| "INACTIVE" }` | Game Status switch (Game Control or grid) | once per click | [Game Control](overview.md#game-control) |
| CC5 | `updateProviderStatus` | `PATCH /casino/provider/status` | body `{ provider, status: "ACTIVE" \| "INACTIVE" }` | Provider switch | once per click | [Provider Level](overview.md#provider-level) |
| CC6 | `getGames` | `GET casino/:id` | `ts` | Edit Game opens | once per opening | [Edit Game](overview.md#edit-game) |
| CC7 | `updateGames` | `PATCH casino/:id` | body `{ gameCode, gameName, category, provider, priority, thumbnailImage }` | Edit Game ▸ Update | once per submit | [Edit Game](overview.md#edit-game) |
| CC8 | `uploadFile` | `POST /upload` | multipart `file` | Thumbnail file chosen in Edit Game | once per file | [Edit Game](overview.md#edit-game) |
| CC9 | `gameTrending` | `PATCH casino/trending/:id` | body `{ status }` | Not called: the switch is commented out (Trending dropped) | — | none |

---

## CC1 `getAllCategory`

`store/api/casinoApi.ts:40-46`. No cache tags.

`GET /casino/category?ts=<ms>`

Response (`CasinoCategoryResponse`): `{ games: string[], total }`. `games` holds the category names; the field name is the backend's.

The user apps call the same path with optional `search` and `provider` ([Module 8](../../01-user-panel/08-casino/api-inventory.md)).

## CC2 `getProviders`

`casinoApi.ts:47-53`. No cache tags.

`GET /casino/providers?ts=<ms>`

Response (`CasinoProviderResponse`): `{ success, message, providers: [{ provider, aggregator, status }], pagination }`. The admin reads `provider` and `status` (`"Active"` / `"Inactive"`).

## CC3 `getAllGames`

`casinoApi.ts:12-39`. Provides `Casino`. Each parameter is sent only when truthy.

| Caller | Parameters |
|---|---|
| `CasinoControl.tsx:28-31` (parent page, every tab) | `page=1`, `limit=10` |
| `GameControl.tsx:37-44` | `page`, `limit`, `search`, `category`, `provider`, `status` (`ACTIVE` / `INACTIVE`) |
| `FilteredGames.tsx:23-28` | `page`, `limit`, and `category` or `provider` from the URL |

`userId` is supported by the definition but not sent by the admin.

Example: `GET /casino/games?page=1&limit=10&category=<category>&status=ACTIVE&ts=<ms>`

Response (`CasinoGamesResponse`): `{ success, message, games: CasinoGameItem[], pagination }`, with total from `pagination.total`. `CasinoGameItem` has `id`, `casinoProviderId`, `externalId`, `name`, `code`, `gameProviderName`, `category`, `isTrending`, `priority`, `gameImage`, `status`, `createdAt`, `isFavorite`.

This is the path the user lobbies call with `status=ACTIVE` ([Module 8 C1](../../01-user-panel/08-casino/api-inventory.md)).

## CC4 `gameStatusChange`

`casinoApi.ts:54-61`; `GameControl.tsx:56-66`; `FilteredGames.tsx:41-51`. Invalidates `Casino`.

```
PATCH casino/status/<game-id>
{ "status": "INACTIVE" }
```

Effect (team): an inactive game is left out of every user list.

## CC5 `updateProviderStatus`

`casinoApi.ts:97-107`; `ProviderControl.tsx:27-52`. No cache tags (`invalidatesTags` is commented out); the page updates the card itself.

```
PATCH /casino/provider/status
{ "provider": "<provider name>", "status": "INACTIVE" }
```

Response (`ProviderStatusResponse`): `{ success, message, provider: { name, status } }`. The page checks `success` only. Effect (team): the provider's games stop launching.

## CC6 `getGames`

`casinoApi.ts:90-96`; `Modal/EditGame.tsx:23`. No cache tags.

`GET casino/<game-id>?ts=<ms>`. Response (`GameResponse`): `{ success, message, game: CasinoGameItem }`. The form reads `code`, `name`, `category`, `gameProviderName`, `priority`, `isTrending`, `gameImage`, `id`.

## CC7 `updateGames`

`casinoApi.ts:69-89`; `EditGame.tsx:82-99`. Invalidates `Casino`.

```
PATCH casino/<game-id>
{
  "gameCode": "<code>",
  "gameName": "<name>",
  "category": "<category>",
  "provider": "<provider name>",
  "priority": 0,
  "thumbnailImage": "<image url>"
}
```

`gameCode` and `provider` are read-only in the form but always sent. `thumbnailImage` is the newly uploaded URL, or the current image URL when no file was chosen. `priority` is not in use on the user side yet (team).

## CC8 `uploadFile`

`store/api/commonApi.ts:50-60`; `EditGame.tsx:65-79`. Shared with the banking pages (`pages/Banker-management/Modal/AddCrypto.tsx`, `AddQR.tsx`, `ApproveModal.tsx`).

`POST /upload` with `multipart/form-data`, field `file`. Response: `{ url, meta }`; the page uses `url`.

## CC9 `gameTrending`

`casinoApi.ts:62-68`. `PATCH casino/trending/<game-id>` with `{ status: "ACTIVE" | "INACTIVE" }`, no tags. Called from `handleTranding` in `GameControl.tsx:67-78` and `handleTrending` in `EditGame.tsx:102-113`, but neither function is wired to a control: the Edit Game switch is commented out (`EditGame.tsx:152-159`). Trending is a dropped feature (team, 2026-11-26).
