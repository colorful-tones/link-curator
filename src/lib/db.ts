import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { CREATE_ENTRIES_TABLE, CREATE_ENTRIES_URL_INDEX, CREATE_ENTRIES_CREATED_AT_INDEX } from './schema';
import type { ContentType, EntryStatus, LinkEntry } from './types';

const DATA_DIR = path.resolve(process.cwd(), process.env.LINK_CURATOR_DATA_DIR ?? (process.env.NODE_ENV === 'test' ? 'data/test' : 'data'));
const DB_PATH = path.join(DATA_DIR, 'link-curator.sqlite');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.exec(CREATE_ENTRIES_TABLE);
    ensureColumn(_db, 'status', "TEXT NOT NULL DEFAULT 'ok'");
    ensureColumn(_db, 'error_message', "TEXT NOT NULL DEFAULT ''");
    _db.exec(CREATE_ENTRIES_URL_INDEX);
    _db.exec(CREATE_ENTRIES_CREATED_AT_INDEX);
  }
  return _db;
}

function ensureColumn(db: Database.Database, columnName: string, definition: string): void {
  const columns = db.prepare('PRAGMA table_info(entries)').all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE entries ADD COLUMN ${columnName} ${definition}`);
  }
}

function rowToEntry(row: Record<string, unknown>): LinkEntry {
  return {
    id: row.id as string,
    url: row.url as string,
    title: row.title as string,
    description: row.description as string,
    summary: row.summary as string,
    canonicalUrl: (row.canonical_url as string) ?? null,
    siteName: (row.site_name as string) ?? null,
    imageUrl: (row.image_url as string) ?? null,
    contentType: (row.content_type as ContentType) ?? 'other',
    personalTags: JSON.parse(row.personal_tags as string) as string[],
    publicTags: JSON.parse(row.public_tags as string) as string[],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    status: (row.status as EntryStatus) ?? 'ok',
    errorMessage: (row.error_message as string) ?? '',
  };
}

export function createEntry(entry: LinkEntry): LinkEntry {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO entries (id, url, title, description, summary, canonical_url, site_name, image_url, content_type, personal_tags, public_tags, created_at, updated_at, status, error_message)
    VALUES (@id, @url, @title, @description, @summary, @canonicalUrl, @siteName, @imageUrl, @contentType, @personalTags, @publicTags, @createdAt, @updatedAt, @status, @errorMessage)
  `);

  stmt.run({
    id: entry.id,
    url: entry.url,
    title: entry.title,
    description: entry.description,
    summary: entry.summary,
    canonicalUrl: entry.canonicalUrl,
    siteName: entry.siteName,
    imageUrl: entry.imageUrl,
    contentType: entry.contentType,
    personalTags: JSON.stringify(entry.personalTags),
    publicTags: JSON.stringify(entry.publicTags),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    status: entry.status,
    errorMessage: entry.errorMessage,
  });

  return entry;
}

export function getEntryById(id: string): LinkEntry | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntry(row) : null;
}

export function getRecentEntries(limit = 50, offset = 0): LinkEntry[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM entries ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntry);
}

export function getAllEntriesForIndex(): LinkEntry[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM entries ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map(rowToEntry);
}

export function getEntryByUrl(url: string): LinkEntry | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM entries WHERE url = ?').get(url) as Record<string, unknown> | undefined;
  return row ? rowToEntry(row) : null;
}

export function deleteEntry(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  return result.changes > 0;
}

export function updateEntry(
  id: string,
  fields: { summary?: string; personalTags?: string[]; publicTags?: string[] }
): LinkEntry | null {
  const entry = getEntryById(id);
  if (!entry) return null;

  const db = getDb();
  const updatedAt = new Date().toISOString();
  const summary = fields.summary !== undefined ? fields.summary : entry.summary;
  const personalTags = fields.personalTags !== undefined ? JSON.stringify(fields.personalTags) : JSON.stringify(entry.personalTags);
  const publicTags = fields.publicTags !== undefined ? JSON.stringify(fields.publicTags) : JSON.stringify(entry.publicTags);

  db.prepare(`
    UPDATE entries
    SET summary = @summary, personal_tags = @personalTags, public_tags = @publicTags, updated_at = @updatedAt
    WHERE id = @id
  `).run({ summary, personalTags, publicTags, updatedAt, id });

  return getEntryById(id);
}

export function updateEntryEnrichment(
  id: string,
  fields: { summary: string; personalTags: string[]; publicTags: string[]; status: EntryStatus; errorMessage: string }
): LinkEntry | null {
  const db = getDb();
  const updatedAt = new Date().toISOString();
  const result = db.prepare(`
    UPDATE entries
    SET summary = @summary, personal_tags = @personalTags, public_tags = @publicTags,
        status = @status, error_message = @errorMessage, updated_at = @updatedAt
    WHERE id = @id
  `).run({
    summary: fields.summary,
    personalTags: JSON.stringify(fields.personalTags),
    publicTags: JSON.stringify(fields.publicTags),
    status: fields.status,
    errorMessage: fields.errorMessage,
    updatedAt,
    id,
  });

  return result.changes > 0 ? getEntryById(id) : null;
}

export function searchEntries(query: string): LinkEntry[] {
  const db = getDb();
  const like = `%${query}%`;
  const rows = db.prepare(`
    SELECT * FROM entries
    WHERE title LIKE ? OR description LIKE ? OR url LIKE ? OR summary LIKE ? OR personal_tags LIKE ? OR public_tags LIKE ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(like, like, like, like, like, like) as Record<string, unknown>[];
  return rows.map(rowToEntry);
}

export function getEntriesByTag(tag: string): LinkEntry[] {
  const db = getDb();
  const like = `%${tag}%`;
  const rows = db.prepare(`
    SELECT * FROM entries
    WHERE personal_tags LIKE ? OR public_tags LIKE ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(like, like) as Record<string, unknown>[];
  return rows.map(rowToEntry);
}

export function getEntryCount(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM entries').get() as { count: number };
  return row.count;
}

export function getEntriesByDate(date: string): LinkEntry[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM entries
    WHERE date(created_at) = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(date) as Record<string, unknown>[];
  return rows.map(rowToEntry);
}

export interface LinkStats {
  totalEntries: number;
  totalDays: number;
  byType: Record<string, number>;
  topTags: { tag: string; count: number }[];
}

export function getStats(): LinkStats {
  const db = getDb();

  const totalEntries = (db.prepare('SELECT COUNT(*) as count FROM entries').get() as { count: number }).count;

  const totalDays = (db.prepare('SELECT COUNT(DISTINCT date(created_at)) as count FROM entries').get() as { count: number }).count;

  const typeRows = db.prepare('SELECT content_type, COUNT(*) as count FROM entries GROUP BY content_type ORDER BY count DESC').all() as { content_type: string; count: number }[];
  const byType: Record<string, number> = {};
  for (const row of typeRows) {
    byType[row.content_type] = row.count;
  }

  const tagCounts = new Map<string, number>();
  const tagRows = db.prepare('SELECT personal_tags, public_tags FROM entries').all() as { personal_tags: string; public_tags: string }[];
  for (const row of tagRows) {
    try {
      const personal: string[] = JSON.parse(row.personal_tags);
      for (const tag of personal) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    } catch { /* skip malformed tags */ }
    try {
      const publicTags: string[] = JSON.parse(row.public_tags);
      for (const tag of publicTags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    } catch { /* skip malformed tags */ }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([tag, count]) => ({ tag, count }));

  return { totalEntries, totalDays, byType, topTags };
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export interface CalendarDay {
  date: string;
  count: number;
}

export function getCalendarData(yearMonth: string): CalendarDay[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM entries
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY date(created_at)
    ORDER BY date
  `).all(yearMonth) as { date: string; count: number }[];
  return rows;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: 'tag' | 'entry';
  count: number;
  url?: string;
  type?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function getGraphData(): GraphData {
  const db = getDb();
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const tagCounts = new Map<string, number>();

  const rows = db.prepare('SELECT id, url, title, content_type, personal_tags, public_tags FROM entries').all() as {
    id: string; url: string; title: string; content_type: string; personal_tags: string; public_tags: string;
  }[];

  for (const row of rows) {
    const allTags: string[] = [];
    try { allTags.push(...JSON.parse(row.personal_tags)); } catch { /* skip */ }
    try { allTags.push(...JSON.parse(row.public_tags)); } catch { /* skip */ }

    nodes.push({
      id: `entry:${row.id}`,
      label: row.title || row.url,
      kind: 'entry',
      count: 1,
      url: row.url,
      type: row.content_type,
    });

    for (const tag of allTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      links.push({ source: `tag:${tag}`, target: `entry:${row.id}` });
    }
  }

  const minTagCount = tagCounts.size <= 15 ? 1 : 2;
  const allowedTagIds = new Set<string>();
  for (const [tag, count] of tagCounts) {
    if (count >= minTagCount) {
      const tagId = `tag:${tag}`;
      allowedTagIds.add(tagId);
      nodes.push({ id: tagId, label: tag, kind: 'tag', count });
    }
  }

  const filteredLinks = links.filter(l => allowedTagIds.has(l.source));
  return { nodes, links: filteredLinks };
}
