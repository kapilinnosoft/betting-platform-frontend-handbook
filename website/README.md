# Betting Platform Documentation Portal

Internal, read-only technical documentation UI. The Markdown files and inventories in the parent directory remain the source of truth; the portal does not contain a backend or betting application API client.

## Stack

- Next.js 16 App Router
- React 19 and strict TypeScript
- Tailwind CSS, Lucide icons
- `react-markdown` + `remark-gfm` for Markdown and tables
- Mermaid for diagrams already present in the handbook

## Run

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Typecheck, lint, and build with:

```bash
npm run typecheck
npm run lint
npm run build
```

## Structure

```text
src/app/                              App Router pages and layouts (incl. /inventory/[name])
src/features/documentation/components Markdown views, API explorer, diagrams
src/features/documentation/lib/       Markdown/inventory loaders and privacy layer
src/shared/                            Template UI and navigation primitives
../docs/                               Canonical module and architecture documentation
../inventory/                          Canonical API, polling, progress and questions data
```

The pages read Markdown from `../docs/` and structured tables from `../inventory/` at server render time. API Explorer entries and dashboard statistics are derived from those files; do not duplicate API facts in UI components. If a document lacks request, response, interval, or calculation evidence, the UI should retain the source's unconfirmed status rather than fill in a guess.

## Adding documentation

Add or update canonical Markdown and inventory files first. Module pages are discovered from `docs/01-user-panel/*/overview.md`; supplemental references are discovered from their overview file. API entries are derived from `inventory/api-inventory.md`, timing from `inventory/polling-and-frequency-inventory.md`, and team questions from `inventory/open-questions.md`. Update progress and the current-session handoff as required by the parent handbook's `CLAUDE.md`.

The privacy layer reads project labels from `inventory/projects.md` and replaces them at render time. Keep source citations in canonical Markdown; do not hardcode organization or client names into portal components.

### Conventions the portal relies on

- **Heading anchors.** Every heading gets a GitHub-style id computed from its *original* text, so `[…](file.md#some-heading)` links written in the Markdown resolve in the portal. If that slug contains a private label, the id becomes a stable hash (`s-…`) and link fragments are converted the same way (`privateSafeHref`). Labels never appear in ids or hrefs.
- **Redact before keys.** React `key` props are serialised into the page payload. Redact values *before* using them as keys or props in components.
- **Inventory links.** Links to `inventory/*.md` route to `/api-frequency`, `/team-review`, `/api-explorer` (plain registry link), or `/inventory/<name>` (any other published inventory, and registry section links). `inventory/projects.md` is never published; links to unpublished files render as plain text.
- **Visual guide.** A module folder that contains `visual-guide.html` gets a "Visual guide" tab. The tab is built from the Markdown document in that folder that links to `visual-guide.html`: its first table whose first header mentions "capability", plus the text after that table. To change the guide, edit that Markdown.

### Checking the portal

After a production build, crawl every page for broken links, broken anchors and leaked labels, and scan the raw HTML (including the page payload) for project names, not only the visible text.