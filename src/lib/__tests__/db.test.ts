import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createEntry, getEntryById, getEntryByUrl, deleteEntry, updateEntry, getRecentEntries, searchEntries, getEntriesByTag, getEntryCount, getStats, getEntriesByDate, getCalendarData, getGraphData, closeDb } from '../db';
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

  describe('updateEntry', () => {
    it('updates summary', () => {
      const entry = makeEntry({ summary: 'old summary' });
      createEntry(entry);
      const updated = updateEntry(entry.id, { summary: 'new summary' });
      expect(updated).not.toBeNull();
      expect(updated!.summary).toBe('new summary');
      expect(getEntryById(entry.id)?.summary).toBe('new summary');
    });

    it('updates personalTags', () => {
      const entry = makeEntry({ personalTags: ['old'] });
      createEntry(entry);
      const updated = updateEntry(entry.id, { personalTags: ['new', 'tags'] });
      expect(updated!.personalTags).toEqual(['new', 'tags']);
    });

    it('updates publicTags', () => {
      const entry = makeEntry({ publicTags: ['old'] });
      createEntry(entry);
      const updated = updateEntry(entry.id, { publicTags: ['public'] });
      expect(updated!.publicTags).toEqual(['public']);
    });

    it('returns null for missing entry', () => {
      expect(updateEntry('nonexistent', { summary: 'x' })).toBeNull();
    });

    it('updates updatedAt timestamp', () => {
      const entry = makeEntry();
      createEntry(entry);
      const updated = updateEntry(entry.id, { summary: 'changed' });
      expect(updated!.updatedAt).not.toBe(entry.updatedAt);
    });
  });

  describe('getEntriesByTag', () => {
    it('returns entries with a matching personal tag', () => {
      const entry = makeEntry({ personalTags: ['react', 'typescript'] });
      createEntry(entry);

      const results = getEntriesByTag('react');
      expect(results.some(e => e.id === entry.id)).toBe(true);
    });

    it('returns entries with a matching public tag', () => {
      const entry = makeEntry({ publicTags: ['tutorial', 'guide'] });
      createEntry(entry);

      const results = getEntriesByTag('tutorial');
      expect(results.some(e => e.id === entry.id)).toBe(true);
    });

    it('returns empty array when no entries match', () => {
      const results = getEntriesByTag('nonexistent-tag-xyz');
      expect(results).toEqual([]);
    });

    it('is case-insensitive for LIKE matching', () => {
      const entry = makeEntry({ personalTags: ['TypeScript'] });
      createEntry(entry);

      const results = getEntriesByTag('typescript');
      expect(results.some(e => e.id === entry.id)).toBe(true);
    });
  });

  describe('getEntryCount', () => {
    it('returns 0 when no entries exist', () => {
      expect(getEntryCount()).toBe(0);
    });

    it('returns the number of entries', () => {
      createEntry(makeEntry());
      createEntry(makeEntry());
      expect(getEntryCount()).toBeGreaterThanOrEqual(2);
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

  describe('getStats', () => {
    it('returns zero counts when no entries exist', () => {
      const stats = getStats();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
      expect(stats.totalDays).toBeGreaterThanOrEqual(0);
      expect(typeof stats.byType).toBe('object');
      expect(Array.isArray(stats.topTags)).toBe(true);
    });

    it('counts entries by content type', () => {
      createEntry(makeEntry({ contentType: 'article' }));
      createEntry(makeEntry({ contentType: 'article' }));
      createEntry(makeEntry({ contentType: 'tool' }));

      const stats = getStats();
      expect(stats.byType['article']).toBeGreaterThanOrEqual(2);
      expect(stats.byType['tool']).toBeGreaterThanOrEqual(1);
    });

    it('counts tag frequency from both personal and public tags', () => {
      createEntry(makeEntry({ personalTags: ['react'], publicTags: ['tutorial'] }));
      createEntry(makeEntry({ personalTags: ['react', 'typescript'], publicTags: [] }));

      const stats = getStats();
      const reactTag = stats.topTags.find((t: { tag: string; count: number }) => t.tag === 'react');
      expect(reactTag).toBeDefined();
      expect(reactTag!.count).toBeGreaterThanOrEqual(2);
    });

    it('returns top tags sorted by frequency', () => {
      createEntry(makeEntry({ personalTags: ['popular'] }));
      createEntry(makeEntry({ personalTags: ['popular'] }));
      createEntry(makeEntry({ personalTags: ['popular'] }));
      createEntry(makeEntry({ personalTags: ['rare'] }));

      const stats = getStats();
      expect(stats.topTags[0].count).toBeGreaterThanOrEqual(stats.topTags[stats.topTags.length - 1].count);
    });
  });

  describe('getEntriesByDate', () => {
    it('returns entries for a specific date', () => {
      const today = new Date().toISOString().slice(0, 10);
      const entry = makeEntry({ createdAt: today + 'T12:00:00.000Z' });
      createEntry(entry);

      const results = getEntriesByDate(today);
      expect(results.some(e => e.id === entry.id)).toBe(true);
    });

    it('returns empty array when no entries match the date', () => {
      const results = getEntriesByDate('2020-01-01');
      expect(results).toEqual([]);
    });

    it('does not return entries from a different date', () => {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      createEntry(makeEntry({ createdAt: today + 'T12:00:00.000Z' }));

      const results = getEntriesByDate(yesterday);
      expect(results).toEqual([]);
    });
  });

  describe('getCalendarData', () => {
    it('returns empty array when no entries in month', () => {
      const data = getCalendarData('2020-01');
      expect(data).toEqual([]);
    });

    it('returns entry counts grouped by day', () => {
      const today = new Date().toISOString().slice(0, 7); // YYYY-MM
      const day1 = today + '-15T10:00:00.000Z';
      const day2 = today + '-16T10:00:00.000Z';
      createEntry(makeEntry({ createdAt: day1 }));
      createEntry(makeEntry({ createdAt: day1 }));
      createEntry(makeEntry({ createdAt: day2 }));

      const data = getCalendarData(today);
      const d15 = data.find(d => d.date === today + '-15');
      const d16 = data.find(d => d.date === today + '-16');
      expect(d15).toBeDefined();
      expect(d15!.count).toBe(2);
      expect(d16).toBeDefined();
      expect(d16!.count).toBe(1);
    });

    it('only returns data for the specified month', () => {
      const thisMonth = new Date().toISOString().slice(0, 7);
      createEntry(makeEntry({ createdAt: thisMonth + '-01T10:00:00.000Z' }));
      const data = getCalendarData(thisMonth);
      expect(data.length).toBeGreaterThanOrEqual(1);
      const otherMonth = '2020-01';
      const otherData = getCalendarData(otherMonth);
      expect(otherData).toEqual([]);
    });
  });

  describe('getGraphData', () => {
    it('returns empty arrays when no entries exist', () => {
      const data = getGraphData();
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(Array.isArray(data.links)).toBe(true);
    });
    it('creates tag nodes with counts and entry nodes', () => {
      createEntry(makeEntry({ personalTags: ['react', 'typescript'] }));
      createEntry(makeEntry({ personalTags: ['react'], publicTags: ['css'] }));
      const data = getGraphData();
      const reactNode = data.nodes.find(n => n.id === 'tag:react');
      expect(reactNode).toBeDefined();
      expect(reactNode!.count).toBeGreaterThanOrEqual(2);
      const entryNodes = data.nodes.filter(n => n.kind === 'entry');
      expect(entryNodes.length).toBeGreaterThanOrEqual(2);
    });
    it('creates links between tags and entries', () => {
      createEntry(makeEntry({ personalTags: ['react'] }));
      const data = getGraphData();
      const entryNode = data.nodes.find(n => n.kind === 'entry');
      expect(entryNode).toBeDefined();
      expect(data.links.some(l => l.target === entryNode!.id && l.source === 'tag:react')).toBe(true);
    });
    it('filters out dangling links when singletons are removed', () => {
      for (let i = 0; i < 16; i++) createEntry(makeEntry({ personalTags: [`unique-${i}`] }));
      const data = getGraphData();
      expect(data.nodes.filter(n => n.kind === 'tag' && n.id.startsWith('tag:unique-')).length).toBe(0);
      expect(data.links.filter(l => l.source.startsWith('tag:unique-')).length).toBe(0);
    });
  });
});
