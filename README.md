# Betting Platform Frontend Handbook

This handbook explains how the betting platform frontends actually work, based on reading their source code. For each page it covers which API is called, from which component, how often and why, how the response is transformed and stored, and how it reaches the UI.

It is written for frontend and backend developers, QA engineers, and anyone new to these codebases.

> **Status:** Phase 1 (User Panel): Modules 1-9 and the supplemental Login/Signup reference are documented. Phase 2 (Admin Panel): Login and layout (with sidebar), Dashboard and Downline are documented (2026-11-24); further admin modules need approval. See [inventory/documentation-progress.md](inventory/documentation-progress.md).

## Documentation Portal

The internal Next.js portal in [`website/`](website/README.md) presents the existing handbook as searchable module pages, API references, frequency data, calculations, and review questions. It reads the Markdown and inventory files in this repository; those files remain canonical. Public-facing portal views redact project and organization labels while preserving technical source paths.

```bash
cd website
npm ci
npm run dev
```

For production, run `npm run build` then `npm run start` from `website/`. The portal is read-only and has no backend or database.

## Reference repositories

| Role | Repository | Commit documented |
|---|---|---|
| **Primary** User Panel reference | `/home/innosoft/Projects/rsplay/rsplay-user` | `810884b` (2026-11-12, branch `main`) |
| **Secondary** User Panel reference (covers features rsplay lacks) | `/home/innosoft/Projects/vishnu7/vishnu7user` | `6f3b811` (2026-11-16, branch `staging`) |
| Admin Panel reference (Phase 2) | `/home/innosoft/Projects/rsplay/rsplay-admin` | `12f0054` (2026-11-20, branch `staging`) |

Only the **last commit** of each repository is documented. Uncommitted working-tree changes are out of scope; vishnu7 had 6 uncommitted files at discovery. The two repos come from different template families, so the documentation never merges their behaviour. Every statement names the repo it applies to.

The full list of repositories found in `/home/innosoft/Projects` is in [inventory/projects.md](inventory/projects.md).

## How to read this handbook

| You want to… | Go to |
|---|---|
| Understand how an app boots, authenticates and talks to the backend | [docs/00-overview/application-architecture.md](docs/00-overview/application-architecture.md) |
| See the libraries and versions | [docs/00-overview/technology-stack.md](docs/00-overview/technology-stack.md) |
| Find which module a page belongs to | [docs/01-user-panel/overview.md](docs/01-user-panel/overview.md); Admin Panel: [docs/02-admin-panel/overview.md](docs/02-admin-panel/overview.md) |
| Find a route | [inventory/page-inventory.md](inventory/page-inventory.md) |
| Find an endpoint and who calls it | [inventory/api-inventory.md](inventory/api-inventory.md) |
| Find what polls and how often | [inventory/polling-and-frequency-inventory.md](inventory/polling-and-frequency-inventory.md) |
| See which repo has which feature | [inventory/feature-coverage.md](inventory/feature-coverage.md) |
| See unresolved questions and suspected defects | [inventory/open-questions.md](inventory/open-questions.md) |

## Evidence labels

Every important claim carries one of these labels:

| Label | Meaning |
|---|---|
| `OBSERVED` | Confirmed directly from source code or a captured API response. |
| `INFERRED` | Strongly suggested by the implementation, but not conclusively confirmed. |
| `BACKEND CONFIRMATION REQUIRED` | The frontend behaviour is visible, but the backend rule or contract still needs confirming. |
| `NOT FOUND` | Searched the relevant source and found nothing. |
| `NOT CONFIRMED FROM SOURCE` | The code does not establish the behaviour precisely. |

Response shapes come from TypeScript types and from the fields the code reads. They are **not** verified backend contracts unless a section says so explicitly.

## Repository layout

```text
README.md                       this file
CLAUDE.md                       working rules for AI-assisted updates
inventory/                      cross-cutting registries (routes, APIs, polling, coverage, progress)
docs/00-overview/               architecture and technology stack, per repo
docs/01-user-panel/             Phase 1 – module-by-module User Panel docs
docs/02-admin-panel/            Phase 2 – Admin Panel docs (Login/layout and sidebar, Dashboard, Downline)
website/                        Next.js App Router documentation portal; renders docs/ and inventory/
```

Folders for later phases (Result Panel, Shared Modules, Cross-project comparison) will be added when those phases are approved. Empty placeholder files are deliberately not created.
