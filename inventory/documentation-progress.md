# Documentation progress

Status values: NOT STARTED · IN PROGRESS · SOURCE ANALYSIS COMPLETE · DOCUMENTATION COMPLETE · NEEDS VERIFICATION

## Workflow steps

| Step | Scope | Status | Date |
|---|---|---|---|
| 1 | Repository discovery | DOCUMENTATION COMPLETE ([projects.md](projects.md)) | 2026-11-18 |
| 2 | User Panel architecture discovery (rsplay + vishnu7) | DOCUMENTATION COMPLETE | 2026-11-18 |
| 3 | Module-by-module analysis | IN PROGRESS: Modules 1-9 and supplemental Login/Signup documented; Module 9 awaiting approval | 2026-11-19 |

## Phase 1: User Panel modules

Repos: rsplay = `rsplay/rsplay-user@810884b` (primary), vishnu7 = `vishnu7/vishnu7user@6f3b811` (secondary).

| # | Module | Repository | Source inspected | APIs documented | Calculations documented | Frequency documented | Status |
|---|---|---|---|---|---|---|---|
| 1 | [Home Page](../docs/01-user-panel/01-home-page/overview.md) | rsplay + vishnu7 | Yes: all home components, hooks and endpoint definitions, plus the layout calls | Yes: 9 rsplay + 8 vishnu7 calls (canonical or usage) | No betting calculations on this page; transformations documented | Yes, including the 12-question analysis | DOCUMENTATION COMPLETE (response shapes from types and code, not captured responses) |
| 2 | [In-Play Fixtures](../docs/01-user-panel/02-inplay/overview.md) | rsplay + vishnu7 | Yes: routes, fixture hooks, transforms, list and racing consumers | Yes: fixture APIs plus shared page APIs linked to Module 1 | Fixture grouping, odds ordering and sort behavior documented | Yes: 2 s, 3 s and 10 s polling and route arguments | DOCUMENTATION COMPLETE (response shapes from types and code, not captured responses) |
| 3 | [Game Detail](../docs/01-user-panel/03-game-detail/overview.md) | Common module; checked across approved source snapshots | Yes: catalogue, market rows, limits, exposure, cashout and bet slip | Yes: catalogue, bet, bookset, P&L, stakes; media APIs cross-linked | Client profit, pending exposure, cashout hedge selection documented | Yes: catalogue 1 s/2 s variants; other queries and mutations | DOCUMENTATION COMPLETE (source-derived shapes; request fields vary) |
| 4 | [Reports](../docs/01-user-panel/04-reports/overview.md) (**scope agreed 2026-11-18:** Account statement, Bet history, Profit & loss, Casino bet history only) | **rsplay only** (team decision 2026-11-19) | Yes: four report pages, date picker, pagination, route guard, entry points (profile drawer, game-detail redirect) | Yes: 6 canonical APIs (S1–S6), including 2 export endpoints | Opening/closing balance, casino P/L (`totalWins − totalBets`), totals sourced from backend | Yes: no polling; triggers and cache behaviour listed | DOCUMENTATION COMPLETE (response shapes from types and code, not captured responses) |
| 5 | [Scorecard](../docs/01-user-panel/05-scorecard-live-tv/overview.md) (documented together with 6 and 7) | **rsplay only** | Yes: `getScorecard` consumers, `LiveScoreCard`, fallback rules | Yes: M1 | No calculations; display rules documented | Yes: once per visit | DOCUMENTATION COMPLETE (URL response typed `any`; only two fields known) |
| 6 | [Live TV](../docs/01-user-panel/05-scorecard-live-tv/scorecard-and-live-tv.md#live-tv-module-6) | **rsplay only** | Yes: game detail and race detail toggles, `BettingContainer`, breakpoints | Yes: same call as Module 5 (M1) | — | Yes: once per visit | DOCUMENTATION COMPLETE |
| 7 | [Raw Scorecard](../docs/01-user-panel/05-scorecard-live-tv/raw-scorecard.md) | **rsplay only** | Yes: `CustomLiveScoreCard` | Yes: M2 | Batting side, innings, rates and ball chips documented | Yes: 1 s polling, stop rules | DOCUMENTATION COMPLETE (response shapes from types, not captured responses) |
| 8 | [Casino gameplay](../docs/01-user-panel/08-casino/overview.md) (lobby, entry points from other pages, launch and redirects, how games open, exit) | **vishnu7 only** (team decision 2026-11-19) | Yes: lobby hook and page, launcher, consent gate, playground and player, QTech lobby, every entry point in navigation and pages | Yes: 5 canonical casino APIs, home casino APIs linked to Module 1, unused endpoints listed | No calculations; filter, paging and launch logic documented | Yes: no polling; every trigger listed | DOCUMENTATION COMPLETE (response shapes from types and code, not captured responses) |
| 9 | [Deposit and Withdraw](../docs/01-user-panel/09-wallet/overview.md) (UPI, bank and crypto deposit; bank/UPI/crypto withdraw; saved accounts; request history) | **rsplay only** (team decision 2026-11-19) | Yes: both pages, `FeatureRoute`, every form, account cards, history tables, wallet slice, rule texts | Yes: 16 APIs (W1–W16) plus `/system` linked to Module 1; 10 unused duplicates listed | Withdrawable balance, USDT→INR conversion, deposit range checks, validation rules | Yes: no polling; 5 s wallet and 30 s `/system` layout polls; tag refresh table | DOCUMENTATION COMPLETE (response shapes from types and code, not captured responses) |

## Supplemental module

| Module | Repository | Source/API coverage | Status |
|---|---|---|---|
| [Login and Signup](../docs/01-user-panel/authentication/overview.md) | rsplay + vishnu7 | OTP, registration and login requests; payload examples and frontend differences | DOCUMENTATION COMPLETE (same register path/method; payload shapes differ) |

## Inventories

| File | Status |
|---|---|
| [projects.md](projects.md) | Complete |
| [page-inventory.md](page-inventory.md) | Complete for both repos (routes) |
| [api-inventory.md](api-inventory.md) | Complete endpoint registry and consumers; Modules 1-9 and supplemental auth detail linked |
| [polling-and-frequency-inventory.md](polling-and-frequency-inventory.md) | Complete for `pollingInterval` usage; Modules 1-3 per-page reasoning linked; auth mutations noted as non-polling |
| [feature-coverage.md](feature-coverage.md) | Modules 1-3 verified; later rows remain initial |
| [open-questions.md](open-questions.md) | 37 items: all 37 resolved, 0 open. Confirmed code fixes (Q-02, Q-07, Q-08, Q-09, Q-10, Q-15, Q-17, Q-19, Q-23, Q-24, Q-29, Q-30, Q-35) are listed at the end of the file |
| `shared-api-inventory.md` | Folded into the "Shared APIs" section of [api-inventory.md](api-inventory.md#shared-apis-called-from-more-than-one-component) to avoid duplication. Will become its own file if it grows |
| [component-inventory.md](component-inventory.md) | Covers Modules 1-9 and the layout components |
