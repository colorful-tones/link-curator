import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createEntry, getEntryById, getEntryByUrl, deleteEntry, getRecentEntries, searchEntries, closeDb } from '../db';
import type { LinkEntry } from '../types';
import { CREATE_ENTRIES_TABLE, CREATE_ENTRIES_URL_INDEX, CREATE_ENTRIES_CREATED_AT_INDEX } from '../schema';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), process.env.LINK_CURATOR_DATA_DIR ?? (process.env.NODE_ENV === 'test' ? 'data/test' : 'data'));

function cleanDb(): void {
  closeDb();
  const dbPath = path.join(DATA_DIR, 'link-curator.sqlite');
  try {
    fs.unlinkSync(dbPath);
  } catch {
    // If DB doesn't exist yet, that's fine
  }
}

function makeEntry(overrides: Partial<LinkEntry> = {}): LinkEntry {
  const now = new Date().toISOString();
  return {
    id: `test-${Math.random().toString(36).slice(2, 9)}`,
    url: 'https://example.com/article',
    title: 'Test Article',
    description: 'A test article',
    summary: 'Test summary',
    canonicalUrl: null,
    siteName: 'Example',
    imageUrl: null,
    contentType: 'article',
    personalTags: [],
    publicTags: [],
    createdAt: now,
    updatedAt: now,
    status: 'ok',
    errorMessage: '',
    ...overrides,
  };
}

describe('database', () => {
  beforeEach(() => {
    cleanDb();
  });

  afterEach(() => {
    closeDb();
  });

  describe('createEntry', () => {
    it('creates and returns an entry', () => {
      const entry = makeEntry();
      const result = createEntry(entry);
      expect(result).toEqual(entry);
    });
  });

  describe('getEntryById', () => {
    it('returns null for missing entry', () => {
      expect(getEntryById('nonexistent')).toBeNull();
    });

    it('returns created entry by id', () => {
      const entry = makeEntry();
      createEntry(entry);
      const found = getEntryById(entry.id);
      expect(found).toEqual(entry);
    });
  });

  describe('getRecentEntries', () => {
    it('returns entries in reverse chronological order', () => {
      const entry1 = makeEntry({ id: 'chrono-1', createdAt: '2024-01-01T00:00:00.000Z' });
      const entry2 = makeEntry({ id: 'chrono-2', createdAt: '2024-01-02T00:00:00.000Z' });
      createEntry(entry1);
      createEntry(entry2);
      const recent = getRecentEntries(10, 0);
      const idx1 = recent.findIndex((e) => e.id === 'chrono-1');
      const idx2 = recent.findIndex((e) => e.id === 'chrono-2');
      expect(idx2).toBeLessThan(idx1);
    });

    it('respects limit', () => {
      for (let i = 0; i < 5; i++) {
        createEntry(makeEntry({ id: `limit-${i}`, createdAt: `2024-01-0${i + 1}T00:00:00.000Z` }));
      }
      const recent = getRecentEntries(2, 0);
      expect(recent.length).toBe(2);
    });

    it('respects offset', () => {
      for (let i = 0; i < 3; i++) {
        createEntry(makeEntry({ id: `offset-${i}`, createdAt: `2024-01-0${i + 1}T00:00:00.000Z` }));
      }
      const recent = getRecentEntries(10, 2);
      expect(recent.length).toBe(1);
    });
  });

  describe('searchEntries', () => {
    it('finds entries by title', () => {
      const entry = makeEntry({ title: 'Unique Search Title ABC123' });
      createEntry(entry);
      const results = searchEntries('ABC123');
      expect(results.some((r) => r.id === entry.id)).toBe(true);
    });

    it('finds entries by description', () => {
      const entry = makeEntry({ description: 'Something very specific XYZ' });
      createEntry(entry);
      const results = searchEntries('XYZ');
      expect(results.some((r) => r.id === entry.id)).toBe(true);
    });

    it('finds entries by URL', () => {
      const entry = makeEntry({ url: 'https://special-url.example.com/page' });
      createEntry(entry);
      const results = searchEntries('special-url');
      expect(results.some((r) => r.id === entry.id)).toBe(true);
    });

    it('finds entries by summary', () => {
      const entry = makeEntry({ summary: 'A practical note about local-first workflows' });
      createEntry(entry);
      const results = searchEntries('local-first');
      expect(results.some((r) => r.id === entry.id)).toBe(true);
    });

    it('finds entries by personal tags', () => {
      const entry = makeEntry({ personalTags: ['knowledge-system'] });
      createEntry(entry);
      const results = searchEntries('knowledge-system');
      expect(results.some((r) => r.id === entry.id)).toBe(true);
    });

    it('finds entries by public tags', () => {
      const entry = makeEntry({ publicTags: ['web-development'] });
      createEntry(entry);
      const results = searchEntries('web-development');
      expect(results.some((r) => r.id === entry.id)).toBe(true);
    });

    it('returns empty array for no match', () => {
      createEntry(makeEntry({ title: 'Cats' }));
      const results = searchEntries('DogsXYZ');
      expect(results).toHaveLength(0);
    });
  });

  describe('getEntryByUrl', () => {
    it('returns null for missing URL', () => {
      expect(getEntryByUrl('https://example.com/missing')).toBeNull();
    });

    it('returns entry by URL', () => {
      const entry = makeEntry({ url: 'https://example.com/find-me' });
      createEntry(entry);
      const found = getEntryByUrl('https://example.com/find-me');
      expect(found).not.toBeNull();
      expect(found!.id).toBe(entry.id);
    });

    it('returns null for different URL', () => {
      const entry = makeEntry({ url: 'https://example.com/page-a' });
      createEntry(entry);
      expect(getEntryByUrl('https://example.com/page-b')).toBeNull();
    });
  });

  describe('deleteEntry', () => {
    it('returns true when deleting existing entry', () => {
      const entry = makeEntry();
      createEntry(entry);
      expect(deleteEntry(entry.id)).toBe(true);
      expect(getEntryById(entry.id)).toBeNull();
    });

    it('returns false when deleting missing entry', () => {
      expect(deleteEntry('nonexistent')).toBe(false);
    });
  });

  describe('tag storage', () => {
    it('stores and retrieves personalTags as arrays', () => {
      const entry = makeEntry({
        personalTags: ['to-read', 'reference'],
        publicTags: ['javascript', 'testing'],
      });
      createEntry(entry);
      const found = getEntryById(entry.id);
      expect(found?.personalTags).toEqual(['to-read', 'reference']);
      expect(found?.publicTags).toEqual(['javascript', 'testing']);
    });
  });
});
