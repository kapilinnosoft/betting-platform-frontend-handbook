# Documentation progress

Status values: NOT STARTED · IN PROGRESS · SOURCE ANALYSIS COMPLETE · DOCUMENTATION COMPLETE · NEEDS VERIFICATION

## Workflow steps

| Step | Scope | Status | Date |
|---|---|---|---|
| 1 | Repository discovery | DOCUMENTATION COMPLETE ([projects.md](projects.md)) | 2026-11-18 |
| 2 | User Panel architecture discovery (rsplay + vishnu7) | DOCUMENTATION COMPLETE | 2026-11-18 |
| 3 | Module-by-module analysis | IN PROGRESS: Modules 1-3 and supplemental Login/Signup documented; waiting for approval to begin Module 4 | 2026-11-18 |

## Phase 1: User Panel modules

Repos: rsplay = `rsplay/rsplay-user@810884b` (primary), vishnu7 = `vishnu7/vishnu7user@6f3b811` (secondary).

| # | Module | Repository | Source inspected | APIs documented | Calculations documented | Frequency documented | Status |
|---|---|---|---|---|---|---|---|
| 1 | [Home Page](../docs/01-user-panel/01-home-page/overview.md) | rsplay + vishnu7 | Yes: all home components, hooks and endpoint definitions, plus the layout calls | Yes: 9 rsplay + 8 vishnu7 calls (canonical or usage) | No betting calculations on this page; transformations documented | Yes, including the 12-question analysis | DOCUMENTATION COMPLETE (response shapes from types and code, not captured responses) |
| 2 | [In-Play Fixtures](../docs/01-user-panel/02-inplay/overview.md) | rsplay + vishnu7 | Yes: routes, fixture hooks, transforms, list and racing consumers | Yes: fixture APIs plus shared page APIs linked to Module 1 | Fixture grouping, odds ordering and sort behavior documented | Yes: 2 s, 3 s and 10 s polling and route arguments | DOCUMENTATION COMPLETE (response shapes from types and code, not captured responses) |
| 3 | [Game Detail](../docs/01-user-panel/03-game-detail/overview.md) | Common module; checked across approved source snapshots | Yes: catalogue, market rows, limits, exposure, cashout and bet slip | Yes: catalogue, bet, bookset, P&L, stakes; media APIs cross-linked | Client profit, pending exposure, cashout hedge selection documented | Yes: catalogue 1 s/2 s variants; other queries and mutations | DOCUMENTATION COMPLETE (source-derived shapes; request fields vary) |
| 4 | Reports & Statements (**scope agreed 2026-11-18:** Account statement, Bet history, Profit & loss, Casino bet history only; done **after** Module 8) | rsplay + vishnu7 | Routes only | Endpoint list only | No | No | NOT STARTED |
| 5 | Scorecard | rsplay + vishnu7 | Endpoint and consumers only | Endpoint list only | — | Polling inventory only | NOT STARTED |
| 6 | Live TV | rsplay + vishnu7 | Endpoint and consumers only | Endpoint list only | — | No | NOT STARTED |
| 7 | Raw Scorecard | rsplay + vishnu7 | Endpoint and consumers only | Endpoint list only | — | Polling inventory only | NOT STARTED |
| 8 | Casino gameplay (**next**, agreed 2026-11-18: lobby, entry points from other pages, launch and redirects, how games open, exit) | rsplay + vishnu7 | Routes and launch entry points only | Endpoint list only | — | Partial | NOT STARTED |

## Supplemental module

| Module | Repository | Source/API coverage | Status |
|---|---|---|---|
| [Login and Signup](../docs/01-user-panel/authentication/overview.md) | rsplay + vishnu7 | OTP, registration and login requests; payload examples and frontend differences | DOCUMENTATION COMPLETE (same register path/method; payload shapes differ) |

## Inventories

| File | Status |
|---|---|
| [projects.md](projects.md) | Complete |
| [page-inventory.md](page-inventory.md) | Complete for both repos (routes) |
| [api-inventory.md](api-inventory.md) | Complete endpoint registry and consumers; Modules 1-3 and supplemental auth detail linked |
| [polling-and-frequency-inventory.md](polling-and-frequency-inventory.md) | Complete for `pollingInterval` usage; Modules 1-3 per-page reasoning linked; auth mutations noted as non-polling |
| [feature-coverage.md](feature-coverage.md) | Modules 1-3 verified; later rows remain initial |
| [open-questions.md](open-questions.md) | 22 items: 5 resolved (Q-03, Q-05, Q-06, Q-12, Q-13), 17 open |
| `shared-api-inventory.md` | Folded into the "Shared APIs" section of [api-inventory.md](api-inventory.md#shared-apis-called-from-more-than-one-component) to avoid duplication. Will become its own file if it grows |
| [component-inventory.md](component-inventory.md) | Covers Modules 1-3 and the layout components |
