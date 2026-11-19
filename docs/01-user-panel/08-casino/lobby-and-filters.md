# Module 8: Casino (lobby and filters)

This page covers the `/casino` lobby: how providers, categories, search and paging work, and how they map to API calls and the URL. vishnu7 `@6f3b811`; paths relative to `src/`.

**Files:** `pages/Casino/index.tsx` (UI), `hooks/useCasinoLobby.ts` (all state and logic), `pages/Casino/components/HeadingBar.tsx` (title and search box), `pages/Casino/components/CasinoLobbySkeleton.tsx`, `components/casino/CasinoGameCard.tsx`.

## What the lobby shows

| Area | Content | Data source |
|---|---|---|
| Heading bar | "CASINO" and a search box ("Search Game...") | local state |
| Provider tabs (horizontal scroll) | `all` + every provider name | `getCasinoProviders({ limit: 50, page: 1 })` → `providers[].provider` |
| Category tabs (horizontal scroll, with icon) | `all` + every category | `getCasinoCategories({ provider })` → `games[]` (a list of category **names**) |
| Game grid | 2 to 6 columns depending on width, with image and name per card | `getCasinoGames(…)`, pages appended as the user scrolls |

Category icons come from the static `categoryIconMap` in `utils/constants.ts` (e.g. "Slot Games", "Crash Games", "Live"). A category without an icon gets a trophy icon (`Casino/index.tsx:125-141`).

## State and URL parameters

| State (`useCasinoLobby`) | Initial value | Set from the URL? | Written to the URL? | Source |
|---|---|---|---|---|
| `selectedProvider` | `'all'` | Yes: `?provider=`, lower-cased | Yes, on provider click (`replace: true`) | `useCasinoLobby.ts:18-19,34-42,141-154` |
| `selectedCategory` | `'all'` | Yes: `?category=`, lower-cased | Yes, on category click (`replace: true`) | `useCasinoLobby.ts:156-171` |
| `search` | `''` | Yes: `?search=` | **No**: typing does not update the URL | `useCasinoLobby.ts:37,41`; `HeadingBar.tsx:18-21` |
| `page` | `1` | No | No | `useCasinoLobby.ts:21` |
| `games` (accumulated list) | `[]` | — | — | `useCasinoLobby.ts:22,86-98` |
| `hasMore` | `true` | — | — | `useCasinoLobby.ts:23` |

Because the filters use `replace: true`, changing provider or category does **not** add browser-history entries: Back leaves the lobby rather than undoing a filter. A shared or reloaded lobby URL keeps the provider and category, but not the search text.

## What happens on each interaction

| User action | State change | API calls triggered | Source |
|---|---|---|---|
| Open `/casino` | read URL params | `getCasinoGames` page 1, `getCasinoCategories`, `getCasinoProviders` | `useCasinoLobby.ts:34-73` |
| Click a provider tab | provider = tab; **category reset to `all`**; URL `?provider=` set, `?category=` removed | `getCasinoGames` page 1 (new filter); `getCasinoCategories({ provider })` | `useCasinoLobby.ts:141-154` |
| Click a category tab | category = tab; URL `?category=` set (provider kept) | `getCasinoGames` page 1 | `useCasinoLobby.ts:156-171` |
| Type in search | `search` updates instantly, debounced 500 ms | `getCasinoGames` page 1 with `search=`, 500 ms after the last keystroke | `useCasinoLobby.ts:30,59` |
| Scroll near the bottom | `page + 1` (IntersectionObserver, 200 px early) | `getCasinoGames` next page | `useCasinoLobby.ts:100-120` |
| Click a game | lock, spinner | `POST /casino/create-session/:id` (see [game-launch-flow.md](game-launch-flow.md)) | `useCasinoLobby.ts:123-139` |

**Filter change resets paging.** When provider, category or the debounced search changes, `page` returns to 1, `games` is emptied and `hasMore` resets (`useCasinoLobby.ts:44-49`).

**Paging rule.** Each response's `games` are appended to the list. When a page returns fewer than `LIMIT = 20` games, `hasMore` becomes `false` and the scroll sentinel is removed (`useCasinoLobby.ts:13,86-94`). The API's `pagination` object is **not** used.

**Search is server-side.** The search text is sent as `?search=` to `/casino/games`; nothing filters on the client.

**Providers and categories are separate lists.** The provider tabs always show all providers, up to 50. The category tabs are re-fetched for the selected provider.

## Loading, empty and error states

| State | What the user sees | Source |
|---|---|---|
| First load (no games yet) | `CasinoLobbySkeleton` | `Casino/index.tsx:47,69-76` |
| Loading the next page | Spinner under the grid | `Casino/index.tsx:168-172` |
| Request failed (any page) | The whole lobby is replaced by "Unable to load games. Please try again." There is no retry button | `Casino/index.tsx:78-83` |
| No results | "No Games Available" | `Casino/index.tsx:177-179` |
| Broken game image | `/images/casino/casino-fallback.webp` | `CasinoGameCard.tsx:35` |
| Launch in progress | All cards disabled (`cursor-wait`), spinner on the clicked card | `Casino/index.tsx:157-163`, `CasinoGameCard.tsx:27-43` |

## Notes

- **Active-tab scrolling.** The active provider and category tabs are scrolled to the centre whenever the selection changes, including when it arrives from a URL parameter (`Casino/index.tsx:12-20,53-67`).
- **Provider tab highlight is disabled.** The active-provider style is commented out, so all provider tabs look the same; only the category tab shows as active (`Casino/index.tsx:100-111`).
- **The data effect closes the game.** The effect that appends games also dispatches `closeGame()` in its cleanup, which runs on every new response and on unmount (`useCasinoLobby.ts:95-97`). It clears the Redux casino state, which the player does not use (overview F4).
- **Case of filter values.** Provider and category values are lower-cased before being sent. This is intended: the backend filters are case-sensitive and match lower-case values (overview F8, Q-25).
