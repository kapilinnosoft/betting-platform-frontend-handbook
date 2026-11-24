import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';

interface MarkdownNode {
  type: string;
  depth?: number;
  value?: string;
  url?: string;
  title?: string;
  data?: { hProperties?: Record<string, unknown>; [key: string]: unknown };
  children?: MarkdownNode[];
}

export type PrivateLabel = { value: string; replacement: string };

const handbookRoot = path.resolve(process.cwd(), '..');
const ignoredLabels = new Set([
  'repo', 'repos', 'brand', 'admin', 'user', 'users', 'result', 'result-panel',
  'panel', 'source', 'backend', 'frontend', 'template', 'all', 'except', 'and',
  'the', 'phase', 'family', 'markets', 'qtechlobby', 'game', 'gameappfe',
]);

function nodeText(node: MarkdownNode): string {
  if (node.value) return node.value;
  return (node.children ?? []).map(nodeText).join('');
}

function walk(node: MarkdownNode, visit: (node: MarkdownNode) => void): void {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function extractPathParts(value: string): string[] {
  const parts: string[] = [];
  for (const match of value.matchAll(/([A-Za-z][A-Za-z0-9._-]*)\/([A-Za-z][A-Za-z0-9._-]*)/g)) {
    if (match[1]) parts.push(match[1]);
    if (match[2]) parts.push(match[2]);
  }
  return parts.filter((part): part is string => Boolean(part));
}

function plainBrandValues(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((part) => part.trim().replace(/[`*]/g, '').replace(/admin(?:istration)?/gi, '').trim())
    .filter((part) => part.length > 1 && part.length < 36 && !ignoredLabels.has(part.toLowerCase()) && /^[A-Za-z][A-Za-z0-9._-]*$/.test(part));
}

const projectsInventory = path.join(handbookRoot, 'inventory/projects.md');
let labelsCache: { mtime: number; labels: Promise<PrivateLabel[]> } | undefined;

/** Labels are rebuilt whenever inventory/projects.md changes, so new repositories are redacted without a restart. */
export async function getPrivateLabels(): Promise<PrivateLabel[]> {
  const mtime = (await stat(projectsInventory)).mtimeMs;
  if (!labelsCache || labelsCache.mtime !== mtime) labelsCache = { mtime, labels: loadPrivateLabels() };
  return labelsCache.labels;
}

async function loadPrivateLabels(): Promise<PrivateLabel[]> {
  const source = await readFile(projectsInventory, 'utf8');
  const tree = remark().use(remarkGfm).parse(source) as unknown as MarkdownNode;
  const selected: string[][] = [];
  const selectedAdmin: string[][] = [];
  const all = new Set<string>();
  let section = '';

  for (const child of tree.children ?? []) {
    if (child.type === 'heading') section = nodeText(child).toLowerCase();
    if (child.type !== 'table') continue;
    const rows = child.children ?? [];
    const headers = rows[0]?.children?.map(nodeText).map((text) => text.trim().toLowerCase()) ?? [];
    const relevantIndexes = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => /^(repo|repos|remote|brand|admin|result panel)$/.test(header))
      .map(({ index }) => index);

    for (const row of rows.slice(1)) {
      const cells = row.children ?? [];
      for (const index of relevantIndexes) {
        const cell = cells[index];
        if (!cell) continue;
        const value = nodeText(cell);
        const pathParts = extractPathParts(value);
        const codeParts: string[] = [];
        walk(cell, (node) => {
          if (node.type === 'inlineCode' || node.type === 'code') codeParts.push(node.value ?? '');
        });
        const found = [...pathParts, ...codeParts.flatMap(extractPathParts)];
        if (headers[index] === 'brand') found.push(...plainBrandValues(value));
        for (const part of found) {
          if (part.length > 1 && !ignoredLabels.has(part.toLowerCase())) all.add(part);
        }
        if (section.includes('selected references') && headers[index] === 'repo' && pathParts.length) {
          // Keep every part of a selected repo path (brand folder and repo name) together,
          // so "brand" and "brand-user" redact to the same implementation label.
          selected.push(pathParts);
        }
        if (section.includes('selected reference') && section.includes('admin') && headers[index] === 'repo' && pathParts.length) {
          selectedAdmin.push(pathParts);
        }
      }
    }
  }

  const variants = new Map<string, string>();
  selected.slice(0, 2).forEach((parts, position) => {
    const replacement = position === 0 ? 'Implementation A' : 'Implementation B';
    for (const part of parts) variants.set(part.toLowerCase(), replacement);
  });
  // The admin reference repo gets its own neutral label; a brand folder shared with a
  // User Panel reference keeps that reference's label.
  for (const parts of selectedAdmin) {
    for (const part of parts) if (!variants.has(part.toLowerCase())) variants.set(part.toLowerCase(), 'Admin reference');
  }
  const output = [...all].map((value) => ({
    value,
    replacement: variants.get(value.toLowerCase()) ?? 'another implementation',
  }));
  return output.sort((a, b) => b.value.length - a.value.length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function redactProjectLabels(value: string, labels: PrivateLabel[]): string {
  return labels.reduce((text, label) => {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(label.value)}(?=$|[^\\p{L}\\p{N}])`, 'giu');
    return text.replace(pattern, (_match, prefix: string) => `${prefix}${label.replacement}`);
  }, value);
}

/**
 * GitHub-style heading slug, matching the anchors written in the canonical Markdown
 * (lower-case, punctuation removed, spaces to hyphens).
 */
export function headingSlug(text: string): string {
  return text.trim().toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu, '').replace(/ /g, '-');
}

function hashSlug(value: string): string {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Element id for a heading anchor. Canonical anchors that contain a private label are
 * replaced by a stable hash, so the label never reaches the HTML while links still resolve.
 * Headings and link fragments both pass through this function with the ORIGINAL slug.
 */
export function anchorId(originalSlug: string, labels: PrivateLabel[]): string {
  const decoded = safeDecode(originalSlug);
  return redactProjectLabels(decoded, labels) === decoded ? decoded : `s-${hashSlug(decoded)}`;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Rewrites the fragment of an internal href to the portal's privacy-safe anchor id. */
export function privateSafeHref(href: string, labels: PrivateLabel[]): string {
  const hashAt = href.indexOf('#');
  if (hashAt < 0 || /^[a-z]+:/i.test(href)) return href;
  const fragment = href.slice(hashAt + 1);
  return fragment ? `${href.slice(0, hashAt)}#${anchorId(fragment, labels)}` : href.slice(0, hashAt);
}

export function createPrivacyPlugin(labels: PrivateLabel[]) {
  return function privacyPlugin() {
    return function transform(tree: MarkdownNode) {
      const used = new Map<string, number>();
      walk(tree, (node) => {
        if (node.type === 'heading') {
          // Ids come from the original text (pre-redaction) so canonical anchors keep working;
          // duplicates get -1, -2 … like GitHub.
          const base = headingSlug(nodeText(node));
          const seen = used.get(base) ?? 0;
          used.set(base, seen + 1);
          const slug = seen ? `${base}-${seen}` : base;
          node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: anchorId(slug, labels) } };
        }
        if (node.value) node.value = redactProjectLabels(node.value, labels);
        if (node.url) {
          // Redact only the path; the fragment is converted by privateSafeHref at render time.
          const hashAt = node.url.indexOf('#');
          node.url = hashAt < 0
            ? redactProjectLabels(node.url, labels)
            : `${redactProjectLabels(node.url.slice(0, hashAt), labels)}${node.url.slice(hashAt)}`;
        }
        if (node.title) node.title = redactProjectLabels(node.title, labels);
      });
    };
  };
}