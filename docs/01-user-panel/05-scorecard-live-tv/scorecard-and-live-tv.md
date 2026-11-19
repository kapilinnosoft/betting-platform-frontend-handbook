# Modules 5–6 (Scorecard and Live TV)

rsplay `@810884b`; paths relative to `src/`. Both features come from one call, [M1 `getScorecard`](api-inventory.md#m1-getscorecard).

## The URL call

| Page | Call | Skip when | Fields read |
|---|---|---|---|
| Game detail | `useCatalogData` → `useGetScorecardQuery(Number(eventId))` (`pages/GameDetails/Hooks/useCatalogData.ts:27-29`) | no `eventId`, demo user, or not logged in | `scorecardUrl` → `liveScoreUrl`, `liveTvUrl` (`:115-116`) |
| Race detail | `useGetScorecardQuery(Number(eventId))` (`pages/RacingInside/index.tsx:29-31`) | demo user, no `eventId`, or not logged in | `liveTvUrl` only (`:32`) |

The call runs once when the page opens. It is not polled (see [polling](polling-and-frequency.md)).

## Scorecard iframe (Module 5)

Component `LiveScoreCard` (`pages/GameDetails/components/LiveScoreCard.tsx`).

**When it shows** (`GameDetails/index.tsx:155-162` desktop, `191-198` mobile): only when the [raw scorecard](raw-scorecard.md) is not shown, **and** the catalogue says the event is `inplay`, **and** `scorecardUrl` is set. In practice:

| Sport | Shows the iframe when |
|---|---|
| Football, Tennis | in play and a URL is returned |
| Cricket | the raw scorecard API reported no data (fallback), in play, and a URL is returned |

**How it renders.**

| Item | Value | Source |
|---|---|---|
| Element | `<iframe src={scorecardUrl} title="Live Scorecard">` | `LiveScoreCard.tsx:28-33` |
| Sandbox | `allow-scripts allow-same-origin allow-popups` | `:32` |
| Height | 140 px, toggled to 400 px by the arrow button (300 ms transition) | `:14-19,26,35-39` |
| Empty URL | renders nothing | `:21` |

Both the desktop and the mobile copy are mounted, so the URL loads in two iframes (F4).

## Live TV (Module 6)

There is **no** separate API: the stream URL is the `liveTvUrl` field of the same response. TV is **off by default**; the user turns it on with a toggle, which then renders `<iframe src={liveTvUrl} allowFullScreen>` in a 16:9 box.

| Screen width | Control | Who sees the control | Source |
|---|---|---|---|
| < 1024 px (game detail) | "Live Tv" bar with an on/off switch at the top of the page | everyone, including guests (F5) | `GameDetails/index.tsx:164-190` |
| 1024–1279 px | **none** (F2) | — | — |
| ≥ 1280 px (game detail and race detail) | "Live Tv" bar in the right-hand `BettingContainer`, above one-click betting and matched bets | logged-in users only (`isAuthenticated`) | `components/BettingContainer.tsx:44-82` |

| Rule | Behaviour |
|---|---|
| No URL | The switch still turns green, but nothing is shown (`showTv && liveTvUrl`) |
| Pre-match | Not checked. If the backend returns a URL before the match, it can be played. `BettingContainer` receives `isLive` but ignores it |
| Switch state | Local `useState(false)` per component, reset on every page visit; not stored |
| Off and on again | The iframe is rendered only while on (`showTv && liveTvUrl`), so switching off removes it and switching on reloads the stream from the same URL. Team (Q-31): the URL is a direct stream, so this is intended |
| Sandbox | none (F7) |
| Race detail below 1280 px | No TV at all (F3) |

## Example response (sanitised)

```json
{
  "scorecardUrl": "https://<scorecard-provider>/<event-path>",
  "liveTvUrl": "https://<stream-provider>/<stream-path>"
}
```

Only these two fields are read; the full shape is `NOT CONFIRMED FROM SOURCE` because the endpoint is typed `any` (F10). Real URLs must not be copied into documentation or tickets.
