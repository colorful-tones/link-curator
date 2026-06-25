import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LinkEntry, LinkMetadata } from '../../../lib/types';

const mocks = vi.hoisted(() => ({
  extractLinkMetadata: vi.fn(),
  enrichLink: vi.fn(),
  createEntry: vi.fn(),
  getEntryByUrl: vi.fn(),
  writeEntryToVault: vi.fn(),
}));

vi.mock('../../../lib/extract-link', () => ({
  extractLinkMetadata: mocks.extractLinkMetadata,
}));

vi.mock('../../../lib/ai', () => ({
  enrichLink: mocks.enrichLink,
}));

vi.mock('../../../lib/db', () => ({
  createEntry: mocks.createEntry,
  getEntryByUrl: mocks.getEntryByUrl,
}));

vi.mock('../../../lib/export', () => ({
  writeEntryToVault: mocks.writeEntryToVault,
}));

const { POST } = await import('../links');

const metadata: LinkMetadata = {
  url: 'https://example.com/article',
  title: 'Example Article',
  description: 'Example description',
  canonicalUrl: 'https://example.com/canonical',
  siteName: 'Example',
  imageUrl: null,
  contentType: 'article',
};

function makeRequest(url = 'https://example.com/article'): Request {
  return new Request('http://localhost/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
}

function existingEntry(overrides: Partial<LinkEntry> = {}): LinkEntry {
  return {
    id: 'existing-id',
    url: 'https://example.com/article',
    title: 'Existing Article',
    description: 'Existing description',
    summary: 'Existing summary',
    canonicalUrl: null,
    siteName: 'Example',
    imageUrl: null,
    contentType: 'article',
    personalTags: ['existing'],
    publicTags: ['example'],
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-06-24T00:00:00.000Z',
    status: 'ok',
    errorMessage: '',
    ...overrides,
  };
}

describe('POST /api/links auto-export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    delete process.env.LINK_CURATOR_AUTO_EXPORT;
    delete process.env.LINK_CURATOR_OBSIDIAN_VAULT;
    delete process.env.LINK_CURATOR_EXPORT_SUBDIR;

    mocks.getEntryByUrl.mockReturnValue(null);
    mocks.extractLinkMetadata.mockResolvedValue(metadata);
    mocks.enrichLink.mockResolvedValue({
      summary: 'AI summary',
      tags: ['example'],
      suggestedPersonalTags: ['to-read'],
      suggestedPublicTags: ['article'],
    });
    mocks.createEntry.mockImplementation((entry: LinkEntry) => entry);
    mocks.writeEntryToVault.mockReturnValue({ success: true, path: '/vault/Inbox/Example-Article.md' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not export by default', async () => {
    const response = await POST({ request: makeRequest() } as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.title).toBe('Example Article');
    expect(mocks.createEntry).toHaveBeenCalledTimes(1);
    expect(mocks.writeEntryToVault).not.toHaveBeenCalled();
  });

  it('exports to the configured vault when enabled', async () => {
    process.env.LINK_CURATOR_AUTO_EXPORT = 'true';
    process.env.LINK_CURATOR_OBSIDIAN_VAULT = '/vault';
    process.env.LINK_CURATOR_EXPORT_SUBDIR = 'Links/Inbox';

    const response = await POST({ request: makeRequest() } as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).not.toHaveProperty('exportResult');
    expect(mocks.writeEntryToVault).toHaveBeenCalledTimes(1);
    expect(mocks.writeEntryToVault).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Example Article', summary: 'AI summary' }),
      '/vault',
      'Links/Inbox',
    );
  });

  it('uses Inbox as the default export subdirectory', async () => {
    process.env.LINK_CURATOR_AUTO_EXPORT = 'true';
    process.env.LINK_CURATOR_OBSIDIAN_VAULT = '/vault';

    await POST({ request: makeRequest() } as never);

    expect(mocks.writeEntryToVault).toHaveBeenCalledWith(expect.any(Object), '/vault', 'Inbox');
  });

  it('still saves the link when auto-export fails', async () => {
    process.env.LINK_CURATOR_AUTO_EXPORT = 'true';
    process.env.LINK_CURATOR_OBSIDIAN_VAULT = '/missing-vault';
    mocks.writeEntryToVault.mockReturnValue({ success: false, error: 'Vault path does not exist' });

    const response = await POST({ request: makeRequest() } as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.title).toBe('Example Article');
    expect(mocks.createEntry).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      'Link Curator auto-export failed:',
      'Vault path does not exist',
    );
  });

  it('still saves the link when auto-export throws unexpectedly', async () => {
    process.env.LINK_CURATOR_AUTO_EXPORT = 'true';
    process.env.LINK_CURATOR_OBSIDIAN_VAULT = '/vault';
    mocks.writeEntryToVault.mockImplementation(() => {
      throw new Error('Unexpected exporter failure');
    });

    const response = await POST({ request: makeRequest() } as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.title).toBe('Example Article');
    expect(mocks.createEntry).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      'Link Curator auto-export failed:',
      'Unexpected exporter failure',
    );
  });

  it('does not export when the URL already exists', async () => {
    mocks.getEntryByUrl.mockReturnValue(existingEntry());
    process.env.LINK_CURATOR_AUTO_EXPORT = 'true';
    process.env.LINK_CURATOR_OBSIDIAN_VAULT = '/vault';

    const response = await POST({ request: makeRequest() } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe('existing-id');
    expect(mocks.createEntry).not.toHaveBeenCalled();
    expect(mocks.writeEntryToVault).not.toHaveBeenCalled();
  });
});
