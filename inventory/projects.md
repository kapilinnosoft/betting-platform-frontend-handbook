# Project inventory

Discovered on 2026-11-18 by inspecting `/home/innosoft/Projects`. The folder holds several **brands**. Each brand usually has its own User, Admin and Result-panel repositories.

## Selected references (Phase 1)

| Role | Repo | Branch | Commit | Remote |
|---|---|---|---|---|
| Primary | `rsplay/rsplay-user` | `main` | `810884b` (2026-11-12) | `Innosoft-Group/rsplay-user` |
| Secondary | `vishnu7/vishnu7user` | `staging` | `6f3b811` (2026-11-16) | `Innosoft-Group/vishnu7` |

Why both: rsplay is the richest repo in its family (94 RTK Query endpoints, racing, wallet, scorecards). vishnu7 has features rsplay lacks: multi-market and pinned markets, a QTech lobby iframe, an open-bets summary, Telegram/mobile MFA, an activity log and an account-statement drill-down. It also has its own admin and result panels locally, which matters for Phases 2 and 3. See [feature-coverage.md](feature-coverage.md).

Note: vishnu7's own `ARCHITECTURE.md` is titled "ONE8 Frontend — Architecture Reference" The team confirmed it was copied from another project (Q-11), so it is ignored; the handbook documents the code only.

## Selected reference (Phase 2: Admin Panel)

| Role | Repo | Branch | Commit | Notes |
|---|---|---|---|---|
| Admin reference | `rsplay/rsplay-admin` | `staging` | `12f0054` (2026-11-20) | Chosen by the team on 2026-11-24. One build serves the admin panel (Owner, staff role users) and the agent panel (`VITE_ADMIN_URL` / `VITE_AGENT_URL`). Working tree clean at reading |

## All User Panel repositories found

All except AJ are Vite + React SPAs built from the same `admin-template` base: Redux Toolkit, a single RTK Query `apiSlice`, and routes declared in `App.tsx`.

| Template family | Repos | Distinguishing pages | Notes |
|---|---|---|---|
| A – "Markets / QTECHLobby" | `vishnu7/vishnu7user`, `leaser/99exch-user`, `one8/one8-user` | `Markets`, `MultiMarket`, `QTECHLobby`, `CasinoPlayground`, `AccountStatment` | vishnu7 has 64 endpoints |
| B – "MarketDetails / Glive" | `leaser/laser247-user`, `notout/notout-user` | `MarketDetails`, `Glive`, `SettledBets` | laser247 has about 93 endpoints |
| C – "Game / GameDetails / Racing" | `rsplay/rsplay-user`, `leaser/radhe-exch-user`, `monty/monty7 user ` | `GameDetails`, `Racing`, `RacingInside`, `Results` | Extra `src/apis/` folder |
| D – Velki | `velki/velki-user`, `upgrade/velki-user` (older copy) | Parlay, League pages, `TurnoverHistory` | React 19, RTK 2, react-router 7 |
| E – AJ / BetJet | `AJ/gameappfe user ` | Next.js App Router | Next.js 16, Zustand + Redux + TanStack Query, axios, native WebSockets. Different GitHub organisation. Entirely different architecture |

## Admin and Result panel repositories found (for Phases 2–3)

| Brand | Admin | Result panel |
|---|---|---|
| vishnu7 | `vishnu7/vishnu7-admin` | `vishnu7/vishnu7-result-panel` |
| monty | `monty/monty7-admin` | `monty/monty7-results-panel` |
| velki | `velki/velki-admin` | `velki/velki-result-panel` |
| leaser | `leaser/laser247-admin` | `leaser/laser247-result-panel` |
| AJ | `AJ/adminpanelfe` | `AJ/result-web` |
| ninewicket | `ninewicket/Nineaaa-admin` | `ninewicket/ninewickets-result-panel` (also a copy in `velki/`) |
| betx777 | `betx777/betex777-admin` | — |
| rsplay, notout, one8, kailashbook, pb, shyamexch, win2rich, Diamond | admin only | — |

## Not frontend repositories
- `backend /` – `igaming-nestjs-template`, `nestjs-starter-template` (NestJS). These may help with `BACKEND CONFIRMATION REQUIRED` items later. Not inspected yet.
- `upgrade/` – modular template experiments (`react-modular-template`, `nextjs-modular-template`) plus zips.
- `interview task javascript/` – unrelated learning material.
