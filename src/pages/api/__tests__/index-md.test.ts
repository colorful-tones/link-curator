import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LinkEntry } from '../../../lib/types';

const mocks = vi.hoisted(() => ({
  getAllEntriesForIndex: vi.fn(),
}));

vi.mock('../../../lib/db', () => ({
  getAllEntriesForIndex: mocks.getAllEntriesForIndex,
}));

const { GET, entriesToIndexMarkdown } = await import('../index-md');

function makeEntry(overrides: Partial<LinkEntry> = {}): LinkEntry {
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
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-06-24T00:00:00.000Z',
    status: 'ok',
    errorMessage: '',
    ...overrides,
  };
}

describe('GET /api/index-md', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns markdown with empty-state text for an empty collection', async () => {
    mocks.getAllEntriesForIndex.mockReturnValue([]);

    const response = await GET({} as never);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(text).toContain('# Link Curator Index');
    expect(text).toContain('_No entries yet._');
  });

  it('returns entries newest-first', async () => {
    const newest = makeEntry({ id: 'newest', title: 'Newest Link', createdAt: '2026-06-25T00:00:00.000Z' });
    const middle = makeEntry({ id: 'middle', title: 'Middle Link', createdAt: '2026-06-24T00:00:00.000Z' });
    const oldest = makeEntry({ id: 'oldest', title: 'Oldest Link', createdAt: '2026-06-23T00:00:00.000Z' });

    // getAllEntriesForIndex already sorts newest-first; mirror that order.
    mocks.getAllEntriesForIndex.mockReturnValue([newest, middle, oldest]);

    const response = await GET({} as never);
    const text = await response.text();

    const newestPos = text.indexOf('Newest Link');
    const middlePos = text.indexOf('Middle Link');
    const oldestPos = text.indexOf('Oldest Link');

    expect(newestPos).toBeLessThan(middlePos);
    expect(middlePos).toBeLessThan(oldestPos);
  });

  it('includes each entry field in the output', async () => {
    const entry = makeEntry({
      title: 'Full Featured Entry',
      url: 'https://example.com/full',
      canonicalUrl: 'https://example.com/canonical',
      contentType: 'video',
      personalTags: ['to-read', 'reference'],
      publicTags: ['tutorial', 'guide'],
      createdAt: '2026-06-25T12:00:00.000Z',
      summary: 'A thorough walkthrough of the topic.',
    });

    mocks.getAllEntriesForIndex.mockReturnValue([entry]);

    const response = await GET({} as never);
    const text = await response.text();

    expect(text).toContain('Full Featured Entry');
    expect(text).toContain('https://example.com/full');
    expect(text).toContain('Canonical URL: https://example.com/canonical');
    expect(text).toContain('Content type: video');
    expect(text).toContain('Personal tags: to-read, reference');
    expect(text).toContain('Public tags: tutorial, guide');
    expect(text).toContain('Added: 2026-06-25T12:00:00.000Z');
    expect(text).toContain('A thorough walkthrough of the topic.');
  });

  it('renders entries with missing optional fields without errors', async () => {
    const entry = makeEntry({
      title: 'Sparse Entry',
      url: 'https://example.com/sparse',
      canonicalUrl: null,
      personalTags: [],
      publicTags: [],
      summary: '',
    });

    mocks.getAllEntriesForIndex.mockReturnValue([entry]);

    const response = await GET({} as never);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('Sparse Entry');
    expect(text).toContain('https://example.com/sparse');
    expect(text).not.toContain('Canonical URL');
    expect(text).toContain('Personal tags: _none_');
    expect(text).toContain('Public tags: _none_');
  });
});

describe('entriesToIndexMarkdown', () => {
  it('returns the empty-state document for an empty array', () => {
    const md = entriesToIndexMarkdown([]);
    expect(md).toContain('# Link Curator Index');
    expect(md).toContain('_No entries yet._');
  });
});
