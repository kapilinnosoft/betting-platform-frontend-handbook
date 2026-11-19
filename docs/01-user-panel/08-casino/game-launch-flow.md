# Module 8: Casino (game launch flow)

This page follows a casino game from the click to the player and back out. vishnu7 `@6f3b811`; paths relative to `src/`.

**Files:** `hooks/useCasinoGameLauncher.ts` (the launch itself), `hooks/useCasinoGamePlay.ts` (consent + lock wrapper used outside the lobby), `hooks/useCasinoConsentGate.ts`, `components/CasinoConsentModal.tsx`, `pages/CasinoPlayground/index.tsx`, `components/casino/CasinoGamePlayer.tsx`, `store/slices/casinoSlice.ts`.

## Sequence

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant C as Game card / tile
  participant P as useCasinoGamePlay<br/>(Dashboard, Home, In-play, Sports)
  participant G as useCasinoConsentGate
  participant L as useCasinoGameLauncher
  participant API as Backend
  participant PG as /casino-playground
  U->>C: click game
  alt launched from Dashboard / Home / In-play / Sports grid
    C->>P: playGame(gameId, provider)
    P->>P: lock already held? → ignore click
    P->>P: lock, launchingGameId = gameId (cards disabled)
    P->>G: requestConsent(launch)
    alt consent enabled (env)
      G-->>U: "1 POINT = {value}" popup
      U->>G: OK, I Agree (✕ cancels and unlocks)
    end
    G->>L: launch()
  else lobby card / Home Aviator tile
    C->>L: launchCasinoGame(gameId, …)   (lobby has its own lock; Aviator none)
  end
  L->>L: no access-token cookie? → login modal, stop
  L->>L: demo user? → toast, stop (see F2)
  L->>API: POST /casino/create-session/{gameId}  { platform: 'Mobile' | 'Desktop' }
  alt response has url
    API-->>L: { success, status, message, url }
    L->>L: dispatch(launchGame(url))   (Redux, not read by the player)
    L->>PG: navigate('/casino-playground', { state: { gameUrl: url } })
    PG-->>U: header + spinner, then iframe(url) fades in on load
  else success === false
    API-->>L: { success:false, message }
    L-->>U: toast(message || 'Failed to get game URL')
  else HTTP error
    L-->>U: toast(error.data.message || 'Failed to create session')
  end
  Note over P: unlock after max(0, 3000 ms − elapsed)
```

## Step by step

| # | Step | What happens | Source |
|---|---|---|---|
| 1 | Click | A game card calls `onPlay(game.id)`. Cards are `<button disabled>` while any launch is running | `components/casino/CasinoGameCard.tsx:24-29` |
| 2 | Lock | `useCasinoGamePlay` and the lobby both keep a `gameLaunchLockedRef`. A second click while locked is ignored | `useCasinoGamePlay.ts:18-22`, `useCasinoLobby.ts:124-128` |
| 3 | Consent (some entry points) | `requestConsent(launch)` runs `launch` immediately if the gate is disabled. Otherwise it stores it and shows `CasinoConsentModal`. "OK, I Agree" runs it; ✕ drops it and unlocks | `useCasinoConsentGate.ts:14-37`, `useCasinoGamePlay.ts:36-49` |
| 4 | Guest check | `isGuestUser()`, i.e. no `access-token` cookie → `setLoginModalOpen(true)`, stop | `useCasinoGameLauncher.ts:20-23`, `utils/index.ts:11` |
| 5 | Demo check | `useIsDemoUser()` → toast "Demo users are not allowed to play casino games.", stop. The check compares the role name to `''`, a confirmed defect: it should be `'demo'`, so today demo users are not stopped (overview F2) | `useCasinoGameLauncher.ts:25-30`, `hooks/redux.ts:26-27` |
| 6 | Platform | `getPlatform()` tests the user agent for iphone, ipad, ipod, android, blackberry, opera mini, iemobile or mobile → `'Mobile'`, otherwise `'Desktop'` | `utils/index.ts:344-350` |
| 7 | Create session | `createSession({ id: gameId, platform }).unwrap()` → `POST /casino/create-session/{id}` with body `{ platform }`. The provider name is **not** sent (overview F5) | `useCasinoGameLauncher.ts:32-36`, `store/api/casinoApi.ts:326-333` |
| 8 | Success | `dispatch(launchGame(url))` sets `casino.isOpen = true` and `casino.gameUrl = url`, then `navigate('/casino-playground', { state: { gameUrl: url } })` | `useCasinoGameLauncher.ts:38-44`, `casinoSlice.ts:21-24` |
| 9 | Failure | `success === false` → toast with the server `message`. HTTP error → toast with `error.data.message`. No `url` and no `success: false` → **nothing happens** (overview F3) | `useCasinoGameLauncher.ts:45-56` |
| 10 | Unlock | The lock is released at least 3 s after the click, whatever the outcome | `useCasinoGamePlay.ts:27-33`, `useCasinoLobby.ts:132-138` |

## The player (`/casino-playground`)

| Part | Behaviour | Source |
|---|---|---|
| Layout | `fixed inset-0 z-[100]`: a full-screen black overlay covering the casino layout's header and sidebar | `CasinoPlayground/index.tsx:22` |
| Header (50 px) | Home icon (→ `/dashboard`), site logo (→ `/dashboard`), avatar and the user's `username` from `state.user.info` | `CasinoPlayground/index.tsx:23-50` |
| Game | `<iframe key={gameUrl} src={gameUrl} allowFullScreen>`. Hidden (`opacity-0`) with a spinner until `onLoad`, then fades in | `components/casino/CasinoGamePlayer.tsx:8-31` |
| URL source | `useLocation().state.gameUrl` only | `CasinoPlayground/index.tsx:7-10` |
| No URL | Shows "Invalid game URL" (opened directly, new tab, bookmark) | `CasinoPlayground/index.tsx:13-19` |
| Leaving | No close button. Home icon or logo → `/dashboard`; browser Back → previous page. Nothing is sent to the backend on exit (no end-session call) | `CasinoPlayground/index.tsx:25-39`; `NOT FOUND` for an exit API |

**Session lifetime.** The game URL is used as-is in the iframe. Whether it expires, and what the provider shows on reload or after a long pause, is decided by the backend and the provider: `BACKEND CONFIRMATION REQUIRED`.

## The QTech lobby (`/casino-qtech`)

This is a separate path, not part of the game-card flow. On mount it calls `getLobbyUrlById({ userId: Number(user.info?.id) })` → `GET /casino/lobby/{userId}`, then shows `<iframe src={data.url}>`, with `ComponentLoader` while loading (`pages/QTECHLobby/index.tsx`). There is no guest check, no `skip` until the user id is known (overview F7) and no error state. No link in the app points to this route.

## Redux `casino` slice

| Action | Effect | Dispatched by |
|---|---|---|
| `launchGame(url)` | `isOpen = true`, `gameUrl = url` | `useCasinoGameLauncher.ts:39` on success |
| `closeGame()` | `isOpen = false`, `gameUrl = null` | `useCasinoLobby.ts:96` (cleanup of the games effect), `:174` (`handleGameClose`, returned but not used by the lobby page) |

Readers: only `useCasinoLobby.ts:17`. The lobby scrolls to the top when `gameUrl` is set, and the lobby's entry consent popup is skipped while `gameUrl` is set (`useCasinoConsentGate.ts:63`). The player does not read this slice (overview F4).
