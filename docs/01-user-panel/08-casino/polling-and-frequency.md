# Module 8: Casino (polling and frequency)

vishnu7 `@6f3b811`; paths relative to `src/`.

**There is no polling in the casino module.** No casino query sets `pollingInterval`, and there is no `setInterval` or socket (`OBSERVED`, search at HEAD). Every request is triggered by a mount, a filter change, scrolling or a click. The always-on layout calls (`/users/me` and `/users/me/wallets` every 5 s when logged in) still run on casino pages, because `CasinoLayout` renders `Header`. See [polling-and-frequency-inventory.md](../../../inventory/polling-and-frequency-inventory.md#vishnu7user-6f3b811).

## When each casino request runs

| Request | Class | Runs when | Repeats? | Source |
|---|---|---|---|---|
| `GET /casino/games` page 1 | `ON_MOUNT`, `ON_STATE_CHANGE` | Lobby opens; provider, category or debounced search changes | Once per argument set. `refetchOnMountOrArgChange: true` refetches on **every** lobby visit, even when cached | `useCasinoLobby.ts:52-62` |
| `GET /casino/games` page N | `ON_INTERACTION` | The scroll sentinel comes within 200 px of view and `hasMore` is true | Once per page | `useCasinoLobby.ts:100-120` |
| `GET /casino/category` | `ON_MOUNT`, `ON_STATE_CHANGE` | Lobby opens; provider changes | Cached per provider for 60 s after unmount | `useCasinoLobby.ts:66-68` |
| `GET /casino/providers` | `ON_MOUNT` | Lobby opens | Cached 60 s | `useCasinoLobby.ts:70-73` |
| `POST /casino/create-session/:id` | `ON_INTERACTION` | Game click (after the guest, demo and consent checks) | Once per launch. Locked for ≥ 3 s from the lobby and from `useCasinoGamePlay` callers; the Home Aviator tile has no lock | `useCasinoGameLauncher.ts:36` |
| `GET /casino/lobby/:userId` | `ON_MOUNT` | `/casino-qtech` opens | Cached 60 s | `pages/QTECHLobby/index.tsx:7` |

## Request patterns worth knowing

- **Search typing.** The search box updates on every keystroke, but the request waits 500 ms after the last keystroke (`useDebounce`). Fast typing therefore sends one request.
- **Provider click.** This sends two requests together: games page 1 (category reset to `all`) and the categories for that provider.
- **Duplicate pages.** The append effect adds `data.games` whenever `data` changes. A refetch of a page already appended could repeat its games in the list. RTK Query keeps the same `data` object for identical results, which limits this. `INFERRED`; not reproduced.
- **Returning to the lobby.** The lobby resets to page 1 and refetches it because of `refetchOnMountOrArgChange`; categories and providers come from cache if visited within 60 s.
- **During gameplay.** The playground makes **no** requests of its own. All traffic during play goes between the iframe and the game provider, outside this app. Because `/casino-playground` is a child of `CasinoLayout` (`App.tsx:81-85`), the layout's `Header` stays mounted underneath the full-screen overlay. Its 5 s `/users/me` and `/users/me/wallets` polls therefore keep running while the user plays (`INFERRED` from the route tree; the overlay is CSS only). This keeps the balance fresh for when the user leaves the game.
