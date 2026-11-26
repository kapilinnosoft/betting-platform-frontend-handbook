# Admin Module A8: Casino Control

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. User-side references are `rsplay/rsplay-user@7a89e53`, or the second user app where marked.

Casino Control decides which casino games and providers players can open, and how games are named, grouped and pictured. **Changes here reach the User Panel**, so each control below states its user-side effect. The admin code shows the requests. The effect comes from the user apps' code (`OBSERVED`), from the team (team, 2026-11-26), or is deduced (`INFERRED`).

| Page | Route | Detail |
|---|---|---|
| Casino Control, three tabs: **Category Level** (index), **Provider Level** (`/provider`), **Game Control** (`/game`) | `/casino-management`, `/casino-management/provider`, `/casino-management/game` | [below](#casino-control-page) |
| Games of one category or provider | `/casino-management/games?category=…` or `?provider=…` | [below](#games-of-a-category-or-provider) |

APIs: [api-inventory.md](api-inventory.md). Request timing: [polling-and-frequency.md](polling-and-frequency.md). The player side of the casino is in [User Panel Module 8](../../01-user-panel/08-casino/overview.md).

## Who can open it

| Rule | Detail | Source |
|---|---|---|
| Intended | **Owner only** (team, 2026-11-26) | — |
| Route | Both routes sit under `ModuleRoute moduleName="CasinoControl"` and `ownerOnly(...)`, which also admits role users (same as [A7 F1](../07-event-management/overview.md#findings), Q-67) | `App.tsx:92-96 (ownerOnly)`, `:251-259` |
| Menu | Single item "Casino Control" → `/casino-management`, `permissionKey: 'CasinoControl'`. Not in the agents' menu | `components/common/EnhancedSidebar.tsx:363-371` |
| Switches and Edit | Disabled unless `hasModuleAccess('CasinoControl', 'update')` (always true for the Owner) | `pages/CasinoManagement/ProviderControl.tsx:15`; `GameControl.tsx:34`; `FilteredGames.tsx:18` |
| Opening a category's or provider's games | The link icon works only with `hasModuleAccess('CasinoControl', 'detailedView')` | `CategoryControl.tsx:13,29-35`; `ProviderControl.tsx:14,80-87` |

## What each control does on the User Panel

| Admin control | Request | Effect on the User Panel | Label |
|---|---|---|---|
| Game **Status** switch Off (Game Control or a category/provider grid) | `PATCH casino/status/:id` `{ status: "INACTIVE" }` | The game is left out of **every** user list. Both user apps ask for games with `status=ACTIVE`: the lobby and the home "popular games" row in the primary user app, and the lobby in the second user app | Team; request `OBSERVED` (`rsplay-user:src/pages/CasinoGames/hooks/useCasinoGames.ts:79-90`, `src/pages/Home/components/PopularGames.tsx:32-37`; second app `src/hooks/useCasinoLobby.ts:52-61`) |
| Provider switch Off | `PATCH /casino/provider/status` `{ provider, status: "INACTIVE" }` | That provider's games **stop launching**. In the primary user app each casino page has a fixed provider list in code, so the provider still appears as a filter option there | Team; fixed list `OBSERVED` (`useCasinoGames.ts:43-49`; `src/utils/casinoProviders.ts`) |
| Edit Game ▸ Category | `PATCH casino/:id` | The game moves to the new category in the user lobby | Team |
| Edit Game ▸ Game Name, Thumbnail | `PATCH casino/:id` | Users see the new name and image. The lobby shows `name` and `gameImage` | `INFERRED` from the fields the user app renders (`rsplay-user:src/pages/CasinoGames/index.tsx:204`) |
| Edit Game ▸ Priority | `PATCH casino/:id` `priority` | **Not in use yet.** Intended for a quick-play or popular section on the user side. The backend orders that section with a `displayOrder` key; 0 means "no priority, not shown in the section". No user app reads `priority` or `displayOrder` at these commits | Team; `OBSERVED` (no reader) |
| Trending | `PATCH casino/trending/:id` | **Dropped feature.** The admin switch is commented out, and the user app's `GET /casino/trending` query is never called | Team; `OBSERVED` (`Modal/EditGame.tsx:152-159`; `rsplay-user:src/store/api/casinoHomePageApi.ts:89-95`) |

## Casino Control page

`pages/CasinoManagement/CasinoControl.tsx`. Header "Casino Control" with a Refresh button and three tabs (`utils/constent.ts:132-145 (CasinoTabs)`; labels shorten to Category / Provider / Game on mobile). The tab is taken from the last part of the path (`CasinoControl.tsx:16-24`).

The page itself mounts three queries whatever the tab: categories, providers, and games page 1 with 10 per page (`CasinoControl.tsx:26-31`). **Refresh**, after 500 ms, refetches the one matching the tab. On Game Control it refetches that fixed page-1 query, **not** the list on screen when filters or paging differ ([F3](#findings)).

### Category Level

`CategoryControl.tsx`. A grid of category names from `GET /casino/category` (`games: string[]`). Read-only: there is no switch. The link icon opens [the category's games](#games-of-a-category-or-provider). Whether a whole category should be switchable is not confirmed (Q-70).

### Provider Level

`ProviderControl.tsx`. A grid of providers from `GET /casino/providers`, each with an On/Off switch (on when `status === 'Active'`) and a link icon.

| Step | Detail | Source |
|---|---|---|
| Switch | Sends `PATCH /casino/provider/status` with `{ provider: <name>, status: "ACTIVE" \| "INACTIVE" }` | `ProviderControl.tsx:27-32` |
| Success (`res.success`) | Updates that card on screen only (optimistic, no refetch), "Status Update Successfully" | `:33-45` |
| `success: false` | "Failed To Update" | `:46-48` |
| Error | "Failed to update provider status" | `:49-51` |

Game lists are not reloaded after a provider switch. The team says this is intended (optimistic update).

### Game Control

`GameControl.tsx`. Table from `GET /casino/games`, server-side paging (10 by default; 10, 25, 50, 100).

| Filter | Values | Sent | Source |
|---|---|---|---|
| Search Game | free text, 500 ms debounce, trimmed | `search` | `GameControl.tsx:36-40,176-181` |
| Category | All + categories from `GET /casino/category` | `category` (not sent for All) | `:41,184-190` |
| Status | All, Active, InActive | `status=ACTIVE` or `INACTIVE` (upper-cased) | `:43,192-198` |
| Provider | All + provider names from `GET /casino/providers` | `provider` | `:42,200-206` |

Changing a filter does **not** go back to page 1 ([F2](#findings)).

| Column | Shows | Source |
|---|---|---|
| S. No. | Running number | `GameControl.tsx:81-88` |
| Game Id | `id` | `:89-101` |
| Game Code | `code` | `:103-107` |
| Game Name | `name` | `:109-115` |
| Category | `category` pill | `:117-125` |
| Provider | `gameProviderName` | `:127-133` |
| Status | Switch, on when `status === 'Active'`. Sends `PATCH casino/status/:id` with `ACTIVE`/`INACTIVE`, then "Successfully Changed!". The `Casino` tag refetches the list. A failure is only logged to the console ([F1](#findings)) | `:56-66,134-149` |
| Actions | Pencil → [Edit Game](#edit-game) | `:150-168` |

### Edit Game

`Modal/EditGame.tsx`, modal "Edit Game". It loads the game with `GET casino/:id` and fills the form (`EditGame.tsx:23-62`).

| Field | Editable | Rule (`utils/validation.tsx:469-496 (UpdateGameSchema)`) | Sent as |
|---|---|---|---|
| Game Code | No (greyed) | No spaces, at least 3 characters. Checked although read-only ([F4](#findings)) | `gameCode` |
| Game Name | Yes | At least 3 characters after trimming | `gameName` |
| Category | Yes, dropdown of existing categories | Required | `category` |
| Provider | No (greyed) | Required | `provider` |
| Thumbnail Image | Yes, file upload | — | `thumbnailImage` |
| Priority | Yes | Whole number 0-9999, required | `priority` |

- **Thumbnail:** choosing a file uploads it at once with `POST /upload` (multipart `file`). The returned `url` becomes the thumbnail ("Image uploaded successfully!" or "Upload failed"). Without a new file, the current image URL is sent again (`EditGame.tsx:45,60,65-79,89`).
- **Update** sends `PATCH casino/:id` with `{ gameCode, gameName, category, provider, priority, thumbnailImage }`. Then "Game updated successfully!" and the modal closes, and the `Casino` tag refetches the list. Failure: "Failed to update" (`EditGame.tsx:82-99`).
- **Trending Status** switch: commented out (`EditGame.tsx:152-159`). Trending is a dropped feature (team).

## Games of a category or provider

`FilteredGames.tsx`, opened from the link icons. Header shows the category or provider name, with Back and Refresh. It requests `GET /casino/games` with `category` or `provider` from the URL, page 1 and 10 per page (`FilteredGames.tsx:13-28`).

- A two-column grid of game names, each with a Status switch. Switching works as on Game Control: "Successfully Changed!", failure only logged ([F1](#findings)) (`:41-51,64-83`).
- "No Game found..." when empty. Paging 10, 25, 50, 100.
- No status filter, so active and inactive games are both listed.

## Findings

| # | Finding | Where |
|---|---|---|
| F1 | **A failed game On/Off shows no message.** The error is only written to the console, so the switch looks unchanged with no explanation. Team: **to fix** | `GameControl.tsx:63-65`; `FilteredGames.tsx:48-50` |
| F2 | **Game Control filters keep the page number.** Changing search, category, status or provider on page 3 asks for page 3 of the new result. Team: **to fix** | `GameControl.tsx:37-44,176-206` |
| F3 | **Refresh on Game Control does not refresh the list on screen.** It refetches the page-1, 10-row query mounted by the parent page. Team: **to fix** | `CasinoControl.tsx:28-31,44-48` |
| F4 | **Some games cannot be edited at all.** Game Code is read-only but still checked (no spaces, at least 3 characters), so a game whose code breaks the rule can never be saved. Team: **to fix** | `Modal/EditGame.tsx:116`; `utils/validation.tsx:470-474` |
| F5 | **Provider switch is optimistic.** Only the card changes and game lists are not reloaded. Team: intended | `ProviderControl.tsx:33-45` |
| F6 | **Category Level is read-only.** There is no switch for a whole category (Q-70) | `CategoryControl.tsx` |
| F7 | **Unused code.** `gameTrending` (Trending dropped); `FilteredGames` reads `detailedView` but never uses it; the provider list's pagination is commented out | `GameControl.tsx:46,67-78`; `FilteredGames.tsx:17`; `ProviderControl.tsx:18-20,93-103` |
| F8 | **Priority is saved but not used yet.** The team describes a future quick-play or popular section ordered by `displayOrder`, with 0 meaning "not shown". The admin sends `priority`; how it maps to `displayOrder` is not confirmed (Q-70) | `EditGame.tsx:88`; [summary](#what-each-control-does-on-the-user-panel) |
