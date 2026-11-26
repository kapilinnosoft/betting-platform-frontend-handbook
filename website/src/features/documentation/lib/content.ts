import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import { headingSlug } from './privacy';
import { MODULE_SEPARATOR } from './api-records';

const handbookRoot = path.resolve(process.cwd(), '..');
const docsRoot = path.join(handbookRoot, 'docs');
const inventoryRoot = path.join(handbookRoot, 'inventory');

export type PanelKey = 'user' | 'admin';

/** Each panel is one folder under docs/; its module folders become portal module pages. */
export const PANELS: Record<PanelKey, { folder: string; route: string; group: 'User Panel' | 'Admin Panel'; overview: string }> = {
  user: { folder: '01-user-panel', route: '/user-panel', group: 'User Panel', overview: 'docs/01-user-panel/overview.md' },
  admin: { folder: '02-admin-panel', route: '/admin-panel', group: 'Admin Panel', overview: 'docs/02-admin-panel/overview.md' },
};

function panelForFolder(folder: string | undefined): PanelKey | undefined {
  return (Object.keys(PANELS) as PanelKey[]).find((key) => PANELS[key].folder === folder);
}

interface MarkdownNode {
  type: string;
  value?: string;
  depth?: number;
  url?: string;
  children?: MarkdownNode[];
}

interface ParsedTable {
  headers: string[];
  rows: MarkdownNode[][];
}

export interface ModuleDocumentEntry {
  title: string;
  /** Markdown file rendered for this tab. For a visual guide: the reference document it is built from. */
  path: string;
  key: string;
  kind: 'markdown' | 'visual';
}

export interface ModuleDocument {
  slug: string;
  folder: string;
  title: string;
  /** Title without the "Module N:" prefix and trailing "(…)" qualifier, for navigation. */
  displayTitle: string;
  group: 'User Panel' | 'Supplemental' | 'Admin Panel';
  panel: PanelKey;
  overviewPath: string;
  status: string;
  documents: ModuleDocumentEntry[];
}

export interface CapabilityRow {
  capability: string;
  apiReference: string;
  usage: string;
  /** `repo:path:line (Name)` citations found in the row's inline code. */
  sources: string[];
  /** Inline-code values that look like HTTP calls, e.g. `GET /banners`. */
  endpoints: string[];
  scope: 'Same endpoint in both' | 'Varies by implementation';
}

export interface CapabilityMap {
  title: string;
  intro: string;
  rows: CapabilityRow[];
  /** Markdown that follows the capability table in the reference document. */
  remainder: string;
}

/** A non-overview Markdown document containing this marker becomes the module's "Visual guide" tab. */
const VISUAL_GUIDE_MARKER = '<!-- portal:visual-guide -->';
const INVENTORY_PAGES = new Set([
  'api-inventory.md',
  'polling-and-frequency-inventory.md',
  'feature-coverage.md',
  'open-questions.md',
  'documentation-progress.md',
  'page-inventory.md',
  'component-inventory.md',
]);

export function displayTitle(title: string): string {
  return title.replace(/^(?:Admin )?Modules? [A-Z]?\d+(?:\s*[–-]\s*\d+)?:?\s*/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim() || title;
}

export interface OpenQuestion {
  id: string;
  question: string;
  evidence: string;
  label: string;
  owner: string;
  status: string;
}

export type ApiPanel = 'User Panel' | 'Admin Panel';

export interface ApiRecord {
  id: string;
  panel: ApiPanel;
  name: string;
  aliases: string[];
  method: string;
  endpoint: string;
  module: string;
  trigger: string;
  frequency: string;
  polling: 'Polling' | 'Non-polling' | 'Not confirmed from source';
  source: string;
  consumers: string;
  notes: string;
  verification: string;
  detailHref?: string;
}

async function readText(relativePath: string): Promise<string> {
  const resolved = path.resolve(handbookRoot, relativePath);
  if (!resolved.startsWith(`${handbookRoot}${path.sep}`)) {
    throw new Error('Documentation path is outside the handbook.');
  }
  return readFile(resolved, 'utf8');
}

function nodeText(node: MarkdownNode): string {
  if (node.value) return node.value;
  return (node.children ?? []).map(nodeText).join('');
}

function collectTables(node: MarkdownNode, found: ParsedTable[] = []): ParsedTable[] {
  if (node.type === 'table') {
    const rows = (node.children ?? []).map((row) => row.children ?? []);
    const [header, ...body] = rows;
    if (header) {
      found.push({ headers: header.map(nodeText), rows: body });
    }
  }
  for (const child of node.children ?? []) collectTables(child, found);
  return found;
}

function tableRows(markdown: string): ParsedTable[] {
  return collectTables(remark().use(remarkGfm).parse(markdown) as unknown as MarkdownNode);
}

function cellValue(row: MarkdownNode[], index: number | undefined): string {
  if (index === undefined) return '';
  return nodeText(row[index] ?? { type: 'text', value: '' }).trim();
}

function normalizedHeaders(headers: string[]): string[] {
  return headers.map((header) => header.trim().toLowerCase().replace(/\s+/g, ' '));
}

function firstHeading(markdown: string, fallback: string): string {
  const tree = remark().parse(markdown) as unknown as MarkdownNode;
  const first = tree.children?.find((node) => node.type === 'heading');
  return first ? nodeText(first).trim() : fallback;
}

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(absolute)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(absolute);
  }
  return files;
}

function pathForHandbook(absolutePath: string): string {
  return path.relative(handbookRoot, absolutePath).split(path.sep).join('/');
}

function moduleSlug(folder: string): string {
  return folder.replace(/^\d+-/, '');
}

function moduleHref(slug: string, documentKey = 'overview', panel: PanelKey = 'user'): string {
  const base = `${PANELS[panel].route}/${slug}`;
  return documentKey === 'overview' ? base : `${base}?doc=${encodeURIComponent(documentKey)}`;
}

async function progressStatus(folder: string, panel: PanelKey): Promise<string> {
  const progress = await readText('inventory/documentation-progress.md');
  const expectedPath = `${PANELS[panel].folder}/${folder}/overview.md`;
  const row = progress.split('\n').find((line) => line.includes(expectedPath));
  if (!row) return 'Documentation status not listed';
  const cells = row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
  const status = cells.at(-1)?.trim() ?? '';
  return status || 'Status not confirmed from progress inventory';
}

export async function getDocumentedModules(panel: PanelKey = 'user'): Promise<ModuleDocument[]> {
  const panelRoot = path.join(docsRoot, PANELS[panel].folder);
  const entries = await readdir(panelRoot, { withFileTypes: true }).catch(() => []);
  const modules: ModuleDocument[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folderPath = path.join(panelRoot, entry.name);
    const overviewAbsolute = path.join(folderPath, 'overview.md');
    try {
      const overview = await readFile(overviewAbsolute, 'utf8');
      const status = await progressStatus(entry.name, panel);
      const sources = await Promise.all((await markdownFiles(folderPath)).map(async (absolute) => ({
        absolute,
        markdown: await readFile(absolute, 'utf8'),
      })));
      const docs: ModuleDocumentEntry[] = sources.map(({ absolute, markdown }) => ({
        title: firstHeading(markdown, path.basename(absolute, '.md')),
        path: pathForHandbook(absolute),
        key: path.basename(absolute, '.md'),
        kind: 'markdown' as const,
      }));
      docs.sort((a, b) => a.key === 'overview' ? -1 : b.key === 'overview' ? 1 : a.title.localeCompare(b.title));

      // A Markdown document carrying the visual-guide marker gets a portal "Visual guide" tab,
      // built from its capability table, so the facts stay in Markdown.
      const guideSource = sources.find(({ absolute, markdown }) =>
        path.basename(absolute) !== 'overview.md' && markdown.includes(VISUAL_GUIDE_MARKER));
      if (guideSource) {
        docs.splice(1, 0, { title: 'Visual guide', path: pathForHandbook(guideSource.absolute), key: 'visual-guide', kind: 'visual' });
      }

      const title = firstHeading(overview, entry.name);
      modules.push({
        slug: moduleSlug(entry.name),
        folder: entry.name,
        title,
        displayTitle: displayTitle(title),
        group: panel === 'user' && entry.name === 'authentication' ? 'Supplemental' : PANELS[panel].group,
        panel,
        overviewPath: pathForHandbook(overviewAbsolute),
        status,
        documents: docs,
      });
    } catch {
      continue;
    }
  }

  const order = await moduleOrderFromOverview(panel);
  const rank = (folder: string) => order.has(folder) ? order.get(folder)! : Number.MAX_SAFE_INTEGER;
  return modules.sort((a, b) => rank(a.folder) - rank(b.folder) || a.folder.localeCompare(b.folder));
}

/**
 * Module order as listed in the panel overview's "## Modules in this phase" table (the Markdown stays the
 * source of truth for ordering). Folders not listed there fall back to folder-name order after the listed ones.
 */
async function moduleOrderFromOverview(panel: PanelKey): Promise<Map<string, number>> {
  const order = new Map<string, number>();
  const overview = await readFile(path.join(handbookRoot, PANELS[panel].overview), 'utf8').catch(() => '');
  const section = overview.match(/^## Modules in this phase\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? '';
  for (const match of section.matchAll(/\]\(([^/)\s]+)\/overview\.md\)/g)) {
    const folder = match[1];
    if (folder && !order.has(folder)) order.set(folder, order.size);
  }
  return order;
}

export async function getMarkdownDocument(relativePath: string): Promise<string> {
  if (!relativePath.endsWith('.md')) throw new Error('Only Markdown documents are available.');
  const allowedRoots = [docsRoot, inventoryRoot];
  const resolved = path.resolve(handbookRoot, relativePath);
  if (!allowedRoots.some((root) => resolved.startsWith(`${root}${path.sep}`))) {
    throw new Error('Documentation path is not available.');
  }
  return readFile(resolved, 'utf8');
}

export function portalHrefForMarkdown(fromPath: string, href: string): string {
  const [targetPath, hash] = href.split('#');
  if (!targetPath?.endsWith('.md')) return href;
  const absolute = path.resolve(handbookRoot, path.dirname(fromPath), targetPath);
  const relative = path.relative(docsRoot, absolute).split(path.sep).join('/');

  const inventoryRelative = path.relative(inventoryRoot, absolute).split(path.sep).join('/');
  if (!inventoryRelative.startsWith('..') && !inventoryRelative.includes('/')) {
    // The API explorer replaces the registry for plain links; section links need the full document.
    if (inventoryRelative === 'api-inventory.md' && !hash) return '/api-explorer';
    if (inventoryRelative === 'polling-and-frequency-inventory.md') return `/api-frequency${hash ? `#${hash}` : ''}`;
    if (inventoryRelative === 'open-questions.md') return `/team-review${hash ? `#${hash}` : ''}`;
    if (INVENTORY_PAGES.has(inventoryRelative)) return `/inventory/${inventoryRelative.replace(/\.md$/, '')}${hash ? `#${hash}` : ''}`;
    return href;
  }

  if (relative.startsWith('00-overview/')) return `/architecture${hash ? `#${hash}` : ''}`;

  const parts = relative.split('/');
  const panel = panelForFolder(parts[0]);
  if (panel && parts.length === 2 && parts[1] === 'overview.md') return `${PANELS[panel].route}${hash ? `#${hash}` : ''}`;
  if (panel && parts.length >= 3 && parts[1]) {
    const document = path.basename(parts.at(-1) ?? 'overview.md', '.md');
    return `${moduleHref(moduleSlug(parts[1]), document, panel)}${hash ? `#${hash}` : ''}`;
  }

  if (path.basename(absolute) === 'api-inventory.md') return `/api-explorer${hash ? `#${hash}` : ''}`;
  if (path.basename(absolute) === 'polling-and-frequency-inventory.md') return `/api-frequency${hash ? `#${hash}` : ''}`;
  if (path.basename(absolute) === 'open-questions.md') return `/team-review${hash ? `#${hash}` : ''}`;
  if (path.basename(absolute) === 'feature-coverage.md') return `/#${hash ?? ''}`;
  return href;
}

function walk(node: MarkdownNode, visit: (node: MarkdownNode) => void): void {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function codeValues(node: MarkdownNode): string[] {
  const values: string[] = [];
  walk(node, (child) => {
    if (child.type === 'inlineCode' || child.type === 'code') values.push(child.value ?? '');
  });
  return values;
}

function linkedValue(node: MarkdownNode): string | undefined {
  let url: string | undefined;
  walk(node, (child) => {
    if (child.type === 'link' && child.url) url = child.url;
  });
  return url;
}

function inferModules(source: string, consumers: string, endpoint: string): string[] {
  const value = `${source} ${consumers} ${endpoint}`.toLowerCase();
  const modules = new Set<string>();
  if (/auth|register|login|sendcode|sendotp/.test(value)) modules.add('Login and Signup');
  if (/homepage|dashboard|sportslisting|popular|banners/.test(value)) modules.add('Home Page');
  if (/inplay|fixture|racing|sportspage/.test(value)) modules.add('In-Play Fixtures');
  if (/gamedetails|market|betslip|betplace|bookset|stake|exposure|cashout|pinned/.test(value)) modules.add('Game Detail');
  if (/reports|statement|betreport/.test(value)) modules.add('Reports and Statements');
  if (/scorecard|medias|rawscore/.test(value)) modules.add('Scorecard / Media');
  if (/casino/.test(value)) modules.add('Casino');
  if (/accountapi|depositapi|withdrawapi|pages\/deposit|pages\/withdraw/.test(value)) modules.add('Deposit and Withdraw');
  return modules.size ? [...modules] : ['Shared User Panel'];
}

function sourceDefinitions(markdown: string): Omit<ApiRecord, 'trigger' | 'frequency' | 'polling' | 'verification' | 'detailHref'>[] {
  const tree = remark().use(remarkGfm).parse(markdown) as unknown as MarkdownNode;
  const output: Omit<ApiRecord, 'trigger' | 'frequency' | 'polling' | 'verification' | 'detailHref'>[] = [];
  let sourceFile = '';

  for (const node of tree.children ?? []) {
    if (node.type === 'heading' && node.depth === 3) {
      const match = nodeText(node).match(/src\/[\w./-]+\.(?:ts|tsx)/);
      if (match) sourceFile = match[0];
    }
    if (node.type !== 'table') continue;
    const rows = node.children ?? [];
    const headers = normalizedHeaders(rows[0]?.children?.map(nodeText) ?? []);
    const endpointIndex = headers.findIndex((cell) => cell === 'endpoint');
    const typeIndex = headers.findIndex((cell) => cell === 'type');
    const methodIndex = headers.findIndex((cell) => cell === 'method');
    const urlIndex = headers.findIndex((cell) => cell.startsWith('url'));
    const consumerIndex = headers.findIndex((cell) => cell.includes('consumer'));
    const noteIndex = headers.findIndex((cell) => cell === 'notes');
    if (endpointIndex < 0 || methodIndex < 0 || urlIndex < 0) continue;

    for (const row of rows.slice(1)) {
      const cells = row.children ?? [];
      const originalEndpoint = cellValue(cells, endpointIndex);
      const line = originalEndpoint.match(/\(L(\d+)\)/)?.[1];
      const name = originalEndpoint.replace(/\s*\(L\d+\).*$/, '').replace(/`/g, '').trim();
      const endpoint = cellValue(cells, urlIndex).replace(/`/g, '').trim();
      const method = cellValue(cells, methodIndex).replace(/`/g, '').trim().toUpperCase();
      if (!name || !endpoint || !method) continue;
      const consumers = cellValue(cells, consumerIndex);
      const notes = cellValue(cells, noteIndex);
      output.push({
        id: `${method}:${endpoint}`,
        name,
        aliases: [name],
        method,
        endpoint,
        panel: 'User Panel',
        module: inferModules(sourceFile, consumers, endpoint).join(MODULE_SEPARATOR),
        source: `${sourceFile}${line ? `:${line}` : ''} (${name})`,
        consumers,
        notes: [cellValue(cells, typeIndex), notes].filter(Boolean).join(' · '),
      });
    }
  }
  return output;
}

function parseCanonicalLinks(markdown: string): Map<string, string> {
  const tree = remark().use(remarkGfm).parse(markdown) as unknown as MarkdownNode;
  const canonical = new Map<string, string>();
  for (const table of collectTables(tree)) {
    const headers = normalizedHeaders(table.headers);
    const endpointIndex = headers.findIndex((cell) => cell === 'endpoint');
    const docIndex = headers.findIndex((cell) => cell.includes('canonical doc'));
    if (endpointIndex < 0 || docIndex < 0) continue;
    for (const row of table.rows) {
      const cells = row;
      const endpointCell = cells[endpointIndex];
      const docCell = cells[docIndex];
      const href = docCell ? linkedValue(docCell) : undefined;
      if (!endpointCell || !href) continue;
      const aliases = codeValues(endpointCell);
      for (const alias of aliases) canonical.set(alias, href);
    }
  }
  return canonical;
}

async function usageTables(): Promise<ParsedTable[]> {
  // User Panel records only: admin docs reuse some paths (/users/me, /auth/login) with other triggers.
  const adminRoot = path.join(docsRoot, PANELS.admin.folder);
  const files = (await markdownFiles(docsRoot)).filter((file) => !file.startsWith(`${adminRoot}${path.sep}`));
  const markdown = await Promise.all(files.map((file) => readFile(file, 'utf8')));
  return markdown.flatMap(tableRows);
}

function usageFor(record: Omit<ApiRecord, 'trigger' | 'frequency' | 'polling' | 'verification' | 'detailHref'>, tables: ParsedTable[]) {
  const alias = record.aliases[0]?.toLowerCase() ?? '';
  const endpointStem = (record.endpoint.split('?')[0] ?? '').replace(/\$\{[^}]+\}/g, ':id').toLowerCase();
  const candidates = tables.flatMap((table) => {
    const headers = normalizedHeaders(table.headers);
    return table.rows.flatMap((row) => {
      const values = row.map(nodeText);
      const joined = values.join(' ').toLowerCase();
      if (!joined.includes(alias) && !joined.includes(endpointStem)) return [];
      const triggerIndex = headers.findIndex((header) => header.includes('trigger'));
      const frequencyIndex = headers.findIndex((header) => header.includes('frequency') || header === 'interval');
      const combinedIndex = headers.findIndex((header) => header.includes('trigger / frequency') || header.includes('frequency / trigger'));
      const trigger = cellValue(row, triggerIndex);
      const frequency = cellValue(row, frequencyIndex) || cellValue(row, combinedIndex);
      if (!trigger && !frequency) return [];
      return [{ trigger, frequency }];
    });
  });
  const pollingCandidate = candidates.find((candidate) => /\b\d+\s*(ms|s|sec|second|minute|min)\b|every\s+\d+/i.test(`${candidate.frequency} ${candidate.trigger}`));
  const best = pollingCandidate ?? candidates[0];
  return {
    trigger: best?.trigger || 'Not confirmed from source.',
    frequency: best?.frequency || 'Not confirmed from source.',
  };
}

function routeForCanonical(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const file = href.split('#')[0];
  if (!file) return undefined;
  const hash = href.includes('#') ? href.slice(href.indexOf('#')) : '';
  const absolute = path.resolve(inventoryRoot, file);
  const relative = path.relative(docsRoot, absolute).split(path.sep).join('/');
  const parts = relative.split('/');
  if (parts[0] !== '01-user-panel' || parts.length < 3 || !parts[1]) return undefined;
  const slug = moduleSlug(parts[1]);
  const document = path.basename(parts.at(-1) ?? 'overview.md', '.md');
  return `${moduleHref(slug, document)}${hash}`;
}

function routeForModule(module: string): string | undefined {
  const value = module.toLowerCase();
  if (value.includes('game detail')) return '/user-panel/game-detail?doc=api-inventory';
  if (value.includes('home page')) return '/user-panel/home-page?doc=api-inventory';
  if (value.includes('in-play')) return '/user-panel/inplay?doc=api-inventory';
  if (value.includes('login and signup')) return '/user-panel/authentication?doc=api-inventory';
  if (value.includes('casino')) return '/user-panel/casino?doc=api-inventory';
  if (value.includes('reports')) return '/user-panel/reports?doc=api-inventory';
  if (value.includes('scorecard')) return '/user-panel/scorecard-live-tv?doc=api-inventory';
  if (value.includes('deposit and withdraw')) return '/user-panel/wallet?doc=api-inventory';
  return undefined;
}

export async function getApiRecords(): Promise<ApiRecord[]> {
  const [registry, docs, questionText] = await Promise.all([
    readText('inventory/api-inventory.md'),
    usageTables(),
    readText('inventory/open-questions.md'),
  ]);
  const canonical = parseCanonicalLinks(registry);
  const definitions = sourceDefinitions(registry);
  const grouped = new Map<string, ApiRecord>();

  for (const definition of definitions) {
    const usage = usageFor(definition, docs);
    const prior = grouped.get(definition.id);
    const endpointAliases = definition.aliases.map((item) => item.toLowerCase());
    const hasBackendQuestion = questionText.split('\n').some((line) =>
      /BACKEND CONFIRMATION REQUIRED/.test(line) &&
      (line.toLowerCase().includes(definition.endpoint.toLowerCase()) || endpointAliases.some((alias) => line.toLowerCase().includes(alias)))
    );
    const detailHref = routeForCanonical(canonical.get(definition.name));
    const polling = /\b\d+\s*(ms|s|sec|second|minute|min)\b|every\s+\d+/i.test(`${usage.frequency} ${usage.trigger}`)
      ? 'Polling'
      : /Not confirmed/i.test(usage.frequency)
        ? 'Not confirmed from source'
        : 'Non-polling';
    const next: ApiRecord = {
      ...definition,
      aliases: prior ? [...new Set([...prior.aliases, ...definition.aliases])] : definition.aliases,
      source: prior ? `${prior.source}; ${definition.source}` : definition.source,
      consumers: prior ? `${prior.consumers}; ${definition.consumers}` : definition.consumers,
      notes: prior ? `${prior.notes}; ${definition.notes}` : definition.notes,
      trigger: usage.trigger,
      frequency: usage.frequency,
      polling,
      verification: hasBackendQuestion ? 'Backend confirmation required' : 'Source observed; backend response not captured',
      detailHref: detailHref ?? prior?.detailHref ?? routeForModule(definition.module),
    };
    grouped.set(definition.id, next);
  }
  const adminRecords = await getAdminApiRecords(questionText);
  return [...grouped.values(), ...adminRecords].sort((a, b) => a.endpoint.localeCompare(b.endpoint) || a.panel.localeCompare(b.panel));
}

const POLLING_PATTERN = /\b\d+\s*(ms|s|sec|second|minute|min)\b|every\s+\d+/i;
const REQUEST_PATTERN = /^(GET|POST|PUT|PATCH|DELETE)\s+(\S.*)$/;

/** Pairs the names and requests written in one summary row ("`a` / `b`" with "`POST x` / `POST y`"). */
function pairNamesAndRequests(names: string[], requests: { method: string; endpoint: string }[]) {
  if (names.length === requests.length) return requests.map((request, index) => ({ ...request, names: [names[index] as string] }));
  if (requests.length === 1) return [{ ...requests[0]!, names }];
  return requests.map((request) => ({ ...request, names }));
}

/**
 * Admin Panel records come from the Summary table of each admin module's api-inventory.md
 * (columns "#", "Name", "Request"). Rows without a concrete path (grouped export rows) are skipped;
 * the module document lists them. Same path in two admin modules is one record (first module wins
 * for trigger and link); admin records never merge with User Panel records.
 */
async function getAdminApiRecords(questionText: string): Promise<ApiRecord[]> {
  const panelRoot = path.join(docsRoot, PANELS.admin.folder);
  const entries = (await readdir(panelRoot, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  const adminQuestions = questionText.split('\n').filter((line) => /rsplay-admin/.test(line) && /BACKEND CONFIRMATION REQUIRED/.test(line)).map((line) => line.toLowerCase());
  const grouped = new Map<string, ApiRecord>();

  for (const entry of entries) {
    const folder = path.join(panelRoot, entry.name);
    const markdown = await readFile(path.join(folder, 'api-inventory.md'), 'utf8').catch(() => '');
    if (!markdown) continue;
    const polling = await readFile(path.join(folder, 'polling-and-frequency.md'), 'utf8').catch(() => '');
    const moduleNoPolling = /\*\*Nothing in [^*]* polls\.\*\*/.test(polling);
    const tree = remark().use(remarkGfm).parse(markdown.replace(/<!--[\s\S]*?-->/g, '')) as unknown as MarkdownNode;
    const heading = firstHeading(markdown, entry.name);
    const moduleCode = heading.match(/Module\s+([A-Z]\d+)/i)?.[1] ?? '';
    const moduleName = displayTitle(heading);
    const headings = (tree.children ?? []).filter((node) => node.type === 'heading').map((node) => nodeText(node));
    const summary = collectTables(tree).find((table) => {
      const headers = normalizedHeaders(table.headers);
      return headers.includes('#') && headers.includes('name') && headers.includes('request');
    });
    if (!summary) continue;
    const headers = normalizedHeaders(summary.headers);
    const index = (name: string) => headers.findIndex((header) => header === name || header.startsWith(name));
    const [codeIndex, nameIndex, requestIndex] = [index('#'), index('name'), index('request')];
    const [whenIndex, repeatsIndex, consumerIndex, paramsIndex] = [index('when it runs'), index('repeats'), index('consumer'), index('parameters')];

    for (const row of summary.rows) {
      const code = cellValue(row, codeIndex);
      const names = row[nameIndex] ? codeValues(row[nameIndex]).map((value) => value.trim()) : [];
      const requests = (row[requestIndex] ? codeValues(row[requestIndex]) : []).flatMap((value) => {
        const match = value.trim().match(REQUEST_PATTERN);
        if (!match?.[1] || !match[2]) return [];
        const endpoint = match[2].replace(/\[[^\]]*\]/g, '').trim();
        return endpoint.startsWith('…') ? [] : [{ method: match[1], endpoint }];
      });
      if (!names.length || !requests.length) continue;

      const trigger = cellValue(row, whenIndex) || 'Not confirmed from source.';
      const repeats = cellValue(row, repeatsIndex);
      const frequency = repeats || (moduleNoPolling ? 'No polling in this module' : 'Not confirmed from source.');
      const consumerCell = row[consumerIndex];
      const consumers = cellValue(row, consumerIndex);
      const canonicalLink = consumerCell ? linkedValue(consumerCell) : undefined;
      const ownHeading = headings.find((text) => new RegExp(`(^|\\W)${code}(\\W|$)`).test(text));
      const moduleRoute = moduleHref(moduleSlug(entry.name), 'api-inventory', 'admin');
      const detailHref = canonicalLink && !canonicalLink.startsWith('#')
        ? portalHrefForMarkdown(pathForHandbook(path.join(folder, 'api-inventory.md')), canonicalLink)
        : `${moduleRoute}${ownHeading ? `#${headingSlug(ownHeading)}` : ''}`;

      for (const request of pairNamesAndRequests(names, requests)) {
        const id = `admin:${request.method}:${request.endpoint}`;
        const prior = grouped.get(id);
        const lowerNames = request.names.map((name) => name.toLowerCase());
        const backend = adminQuestions.some((line) => line.includes(request.endpoint.toLowerCase()) || lowerNames.some((name) => line.includes(name)));
        if (prior) {
          prior.aliases = [...new Set([...prior.aliases, ...request.names])];
          if (!prior.module.split(MODULE_SEPARATOR).includes(moduleName)) prior.module = `${prior.module}${MODULE_SEPARATOR}${moduleName}`;
          prior.source = `${prior.source}; ${moduleCode} ${code}`;
          prior.consumers = `${prior.consumers}; ${consumers}`;
          if (backend) prior.verification = 'Backend confirmation required';
          continue;
        }
        grouped.set(id, {
          id,
          panel: 'Admin Panel',
          name: request.names.join(' / '),
          aliases: request.names,
          method: request.method,
          endpoint: request.endpoint,
          module: moduleName,
          trigger,
          frequency,
          polling: POLLING_PATTERN.test(`${frequency} ${trigger}`) ? 'Polling' : /Not confirmed/i.test(frequency) ? 'Not confirmed from source' : 'Non-polling',
          source: `${moduleCode} ${code}`.trim(),
          consumers,
          notes: cellValue(row, paramsIndex) ? `Parameters: ${cellValue(row, paramsIndex)}` : '',
          verification: backend ? 'Backend confirmation required' : 'Source observed; backend response not captured',
          detailHref,
        });
      }
    }
  }
  return [...grouped.values()];
}

export async function getOpenQuestions(): Promise<OpenQuestion[]> {
  const markdown = await readText('inventory/open-questions.md');
  const records: OpenQuestion[] = [];
  for (const table of tableRows(markdown)) {
    const headers = normalizedHeaders(table.headers);
    const id = headers.findIndex((header) => header === 'id');
    const question = headers.findIndex((header) => header.includes('question'));
    const evidence = headers.findIndex((header) => header === 'evidence');
    const label = headers.findIndex((header) => header === 'label');
    const owner = headers.findIndex((header) => header === 'owner');
    const status = headers.findIndex((header) => header === 'status');
    if (id < 0 || question < 0 || status < 0) continue;
    for (const row of table.rows) {
      records.push({
        id: cellValue(row, id),
        question: cellValue(row, question),
        evidence: cellValue(row, evidence),
        label: cellValue(row, label),
        owner: cellValue(row, owner),
        status: cellValue(row, status),
      });
    }
  }
  return records;
}

export async function getDashboardStats() {
  const [modules, questions, apis, pollingMarkdown] = await Promise.all([
    getDocumentedModules(),
    getOpenQuestions(),
    getApiRecords(),
    readText('inventory/polling-and-frequency-inventory.md'),
  ]);
  const userModules = modules.filter((module) => module.group === 'User Panel');
  const supplementalModules = modules.filter((module) => module.group === 'Supplemental');
  const documentedModules = userModules.filter((module) => /DOCUMENTATION COMPLETE/i.test(module.status)).length;
  const documentedSupplementalModules = supplementalModules.filter((module) => /DOCUMENTATION COMPLETE/i.test(module.status)).length;
  const backendQuestions = questions.filter((question) => /BACKEND CONFIRMATION REQUIRED/i.test(question.label)).length;
  const resolvedQuestions = questions.filter((question) => /resolved/i.test(question.status)).length;
  const pollingEntries = tableRows(pollingMarkdown).reduce((count, table) => {
    const headers = normalizedHeaders(table.headers);
    const intervalIndex = headers.findIndex((header) => header.includes('interval'));
    if (intervalIndex < 0) return count;
    return count + table.rows.filter((row) => /\b\d+\s*(ms|s|sec|second|minute|min)\b|every\s+\d+/i.test(cellValue(row, intervalIndex))).length;
  }, 0);
  return {
    documentedModules,
    userModules: userModules.length,
    documentedSupplementalModules,
    supplementalModules: supplementalModules.length,
    apiDefinitions: apis.length,
    pollingEntries,
    openQuestions: questions.length - resolvedQuestions,
    backendQuestions,
  };
}

export async function getRecentDocumentation(limit = 5) {
  const files = await markdownFiles(docsRoot);
  const entries = await Promise.all(files.map(async (file) => ({
    path: pathForHandbook(file),
    href: routeForDocumentPath(pathForHandbook(file)),
    title: firstHeading(await readFile(file, 'utf8'), path.basename(file, '.md')),
    modified: (await stat(file)).mtime,
  })));
  return entries.sort((a, b) => b.modified.getTime() - a.modified.getTime()).slice(0, limit);
}

export function routeForDocumentPath(relativePath: string): string {
  if (relativePath.startsWith('docs/00-overview/')) return '/architecture';
  const parts = relativePath.split('/');
  const panel = panelForFolder(parts[1]);
  if (panel && parts.length === 3 && parts[2] === 'overview.md') return PANELS[panel].route;
  if (panel && parts.length === 4 && parts[2] && parts[3]) return moduleHref(moduleSlug(parts[2]), parts[3].replace(/\.md$/, ''), panel);
  if (relativePath.endsWith('/api-inventory.md')) return '/api-explorer';
  if (relativePath.endsWith('/polling-and-frequency-inventory.md')) return '/api-frequency';
  if (relativePath.endsWith('/open-questions.md')) return '/team-review';
  return '/user-panel';
}

export async function getInventoryMarkdown(name: string): Promise<string> {
  if (!INVENTORY_PAGES.has(name)) throw new Error('Inventory document is not available.');
  return readText(`inventory/${name}`);
}

export function isInventoryPage(name: string): boolean {
  return INVENTORY_PAGES.has(name);
}

export function inventoryPageNames(): string[] {
  return [...INVENTORY_PAGES].map((name) => name.replace(/\.md$/, ''));
}

export async function getInventoryTitle(name: string): Promise<string> {
  return firstHeading(await getInventoryMarkdown(name), name.replace(/\.md$/, '').replace(/-/g, ' '));
}

const SOURCE_CITATION = /^[\w.-]+:src\/\S+/;
const HTTP_CALL = /^(GET|POST|PUT|PATCH|DELETE)\s+\S+/;

/**
 * Builds the visual-guide data from a reference document: its first heading, the paragraph
 * before the capability table, and the table whose first column header is "… capability".
 */
export async function getCapabilityMap(relativePath: string): Promise<CapabilityMap | undefined> {
  const markdown = await getMarkdownDocument(relativePath);
  const tree = remark().use(remarkGfm).parse(markdown) as unknown as MarkdownNode & {
    children: (MarkdownNode & { position?: { start: { offset?: number }; end: { offset?: number } } })[];
  };
  const tableIndex = tree.children.findIndex((node) =>
    node.type === 'table' && /capability/i.test(nodeText(node.children?.[0]?.children?.[0] ?? { type: 'text' })));
  const table = tree.children[tableIndex];
  if (!table) return undefined;

  const intro = tree.children
    .slice(0, tableIndex)
    .filter((node) => node.type === 'paragraph')
    .map(nodeText)[0] ?? '';

  const rows = (table.children ?? []).slice(1).map((row): CapabilityRow => {
    const cells = row.children ?? [];
    const code = cells.flatMap((cell) => codeValues(cell));
    const apiReference = nodeText(cells[1] ?? { type: 'text' }).trim();
    return {
      capability: nodeText(cells[0] ?? { type: 'text' }).trim(),
      apiReference,
      usage: nodeText(cells[2] ?? { type: 'text' }).trim(),
      sources: [...new Set(code.filter((value) => SOURCE_CITATION.test(value)))],
      endpoints: [...new Set(code.filter((value) => HTTP_CALL.test(value)))],
      scope: /^Both\b/i.test(apiReference) ? 'Same endpoint in both' : 'Varies by implementation',
    };
  });

  const tableEnd = table.position?.end.offset;
  return {
    title: firstHeading(markdown, 'Visual guide'),
    intro,
    rows,
    remainder: tableEnd ? markdown.slice(tableEnd).trim() : '',
  };
}

export function modulePageHref(module: ModuleDocument, documentKey = 'overview') {
  return moduleHref(module.slug, documentKey, module.panel);
}

export function getLabelForDoc(pathname: string) {
  return pathname.split('/').at(-1)?.replace(/\.md$/, '').replace(/-/g, ' ') ?? pathname;
}