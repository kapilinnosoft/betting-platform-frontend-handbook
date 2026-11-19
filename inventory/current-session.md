# Current Session

> Historical snapshot from the Module 3 session. Superseded: current status is in [documentation-progress.md](documentation-progress.md) and [open-questions.md](open-questions.md) (Q-14 to Q-22 have since been updated).

- **Agent used:** GitHub Copilot
- **Repository analyzed:** Documentation workspace and the two approved source snapshots at commits `810884b` and `6f3b811`; committed HEAD content only was inspected. Existing uncommitted source edits were left untouched.
- **Current panel and module:** Phase 1, User Panel, Module 3: Game Detail (common reference, no project labels).
- **Work completed:** Documented catalogue-to-market flow, shared API paths and aliases, bet placement, limits, stake settings, exposure/book, local profit estimate, cashout calculation, and polling. Updated module map and cross-cutting inventories.
- **Documentation files created or updated:** `docs/01-user-panel/03-game-detail/{overview.md,component-flow.md,api-inventory.md,bet-placement-flow.md,book-calculations.md,polling-and-frequency.md}`; `docs/01-user-panel/overview.md`; `inventory/{documentation-progress.md,api-inventory.md,polling-and-frequency-inventory.md,open-questions.md,component-inventory.md}`; this file.
- **APIs investigated:** `GET /catalogue/:eventId`, `POST /bet/place`, `GET /exposure/bookset/calculation`, `GET /exposure/profit-loss`, `GET/PUT /stakeset`, and related scorecard/bet-history calls.
- **Important findings:** The catalogue, bet-placement, bookset, and stake paths/methods match across the inspected sources, but aliases, query args, request types, polling, and cashout candidate sorting are not identical. Cashout is implemented as a local hedge calculation that pre-fills the normal bet slip; no separate cashout mutation was found in the inspected flows.
- **Unresolved questions:** Q-22 asks whether both backend deployments accept the different typed `/bet/place` payload shapes. Existing Q-14 through Q-21 remain open as recorded.
- **Exact next recommended task:** Module 4, Reports & Statements, as one common module using canonical paths and inline source differences.
- **Approval required before continuing:** Yes. Module 3 was explicitly approved; CLAUDE.md requires approval before Module 4.