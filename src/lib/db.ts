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

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
