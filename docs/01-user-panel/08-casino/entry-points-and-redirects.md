# Module 8: Casino (entry points and redirects)

This page lists every place outside the lobby that leads into the casino, what each one passes, and where it lands. vishnu7 `@6f3b811`; paths relative to `src/`. All `OBSERVED` unless labelled.

There are two kinds of entry:

- **Lobby links** go to `/casino`, sometimes with `?provider=` or `?category=` preselected. The user then picks a game in the lobby.
- **Direct launches** start a game immediately, skipping the lobby (see [game-launch-flow.md](game-launch-flow.md)).

## Lobby links

| Where | Label / element | Destination | Source |
|---|---|---|---|
| Desktop navbar | "All Casino" | `/casino` | `components/Navbar.tsx:28` |
| Mobile bottom bar | "I CASINO" | `/casino` | `components/MobileNavbar.tsx:17` |
| Mobile bottom bar | "TEENPATI" | `/casino?provider=aura%20gaming` | `MobileNavbar.tsx:12-15` |
| Sidebar | "All Casino" | `/casino` | `components/common/Sidebar.tsx:76` |
| `/dashboard` | "CASINO PROVIDERS" cards (12, static list `newProviderCards`) | `/casino?provider={provider name, lower-cased}` | `pages/Dashboard/index.tsx:213-221` |
| `/home`, `/inplay`, `/all-sports/:sport` | "Casino Providers" cards in `CasinoGames` (same 12 cards) | `/casino?provider={name, lower-cased}` | `pages/Home/components/CasinoGames.tsx:20-22,45-51`; mounted by `pages/Inplay/index.tsx:7`, `pages/Sports/index.tsx:8` |
| `/home` (`md` and up) | Side promotions (3 images) | `/casino?category=casino`, `?category=baccarat`, `?category=poker` | `pages/Home/components/HomePromotions.tsx:3-34` |
| `/home` | "Live Casino" tile | **New browser tab**: `window.open('/casino?provider=aura%20gaming', '_blank', 'noopener,noreferrer')`. A code comment says the client wants Aura opened in its own tab | `pages/Home/index.tsx:22-33` |

The provider names on the cards come from the static `newProviderCards` list in `utils/constants.ts`, not from the API. They include BGaming, CRASH88 Gaming, Evolution Gaming, Ezugi, Fun Games, Gamzix, JiLi Gaming, Kingmidas Gaming, Mac88 Gaming, Mac88 Gaming Virtual, MAC Excite, Playtech Live, Smartsoft Gaming, SPRIBE and Turbo Games. The lobby must recognise the lower-cased name as a provider for the preselection to filter anything (Q-25).

## Direct launches (skip the lobby)

| Where | Element | Calls | Consent popup? | Source |
|---|---|---|---|---|
| `/dashboard` | "POPULAR GAMES" cards (first 16 of `getHomeCasinoGames`) | `playGame(game.id)` (provider defaults to `'mac88'`, ignored) | Yes, if enabled | `Dashboard/index.tsx:128-137` |
| `/dashboard` | "INDIAN CARD GAMES" buttons (per provider, `getHomeProviderGames`) | `playGame(game.id, providerName.toLowerCase())` | Yes, if enabled | `Dashboard/index.tsx:147-163` |
| `/home`, `/inplay`, `/all-sports/:sport` | "Popular Casino" grid (first 24 of `getHomeCasinoGames`) | `playGame(game.id)` | Yes, if enabled | `Home/components/CasinoGames.tsx:30-41` |
| `/home` | "Aviator" tile | `launchCasinoGame(49, 'Aviator')`; the game id is hard-coded (`AVIATOR_GAME_ID = 49`) | **No** | `pages/Home/index.tsx:11,34-38` |
| Lobby `/casino` | Any game card | `handleGameClick(id)` → `launchCasinoGame(id, 'mac88')` | **No** (asked once on lobby entry instead) | `hooks/useCasinoLobby.ts:123-139` |

All of these end in `useCasinoGameLauncher.launchCasinoGame`. The guest and demo checks, the session call and the redirect are identical for every entry point. Only the consent step and the double-click lock differ:

| Entry point family | Consent | Double-click lock |
|---|---|---|
| `useCasinoGamePlay` (Dashboard, Home/In-play/Sports casino grid) | Per game, via `useCasinoConsentGate.requestConsent` | Ref lock + `launchingGameId`, released after ≥ 3 s |
| Lobby cards (`useCasinoLobby`) | None per game | Ref lock + `launchingGameId`, released after ≥ 3 s |
| Home Aviator tile | None | **None**; repeated clicks can create several sessions (`INFERRED`) |

## Not entry points (checked)

| Item | Why it is not an entry point | Source |
|---|---|---|
| Sidebar "Others" games | `handleOthersClick` launches games, but the "Others" section is never rendered | `Sidebar.tsx:161-175`; only `section="allSports"` is rendered at `:422` |
| `pages/Home/components/GameCard.tsx` | Calls `launchCasinoGame`, but nothing imports the component | `git grep` for importers at HEAD |
| `/casino-qtech` | Routed, but no link or `navigate` targets it | `App.tsx:84`; no other reference at HEAD |
| `/casino-playground` | Only reached through the launcher's `navigate`, never linked | `useCasinoGameLauncher.ts:40` |

## Redirects out of the casino

| From | Trigger | Goes to | Source |
|---|---|---|---|
| `/casino` (lobby) | Closing the entry consent popup (✕) | `/dashboard` | `pages/Casino/index.tsx:48-51` |
| `/casino-playground` | Home icon or logo | `/dashboard` | `CasinoPlayground/index.tsx:25-39` |
| `/casino-playground` | Browser Back | The page the game was launched from (lobby, Dashboard, Home, …) | `INFERRED` (`navigate` without `replace`) |
| Any launch point | Guest clicks a game | Stays on the page; the login modal opens | `useCasinoGameLauncher.ts:20-23` |
