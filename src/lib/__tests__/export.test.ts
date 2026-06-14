import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writeEntryToVault } from '../export';
import type { LinkEntry } from '../types';

const tmpDir = path.join(os.tmpdir(), `link-curator-export-test-${Date.now()}`);
const vaultDir = path.join(tmpDir, 'vault');

function makeEntry(overrides: Partial<LinkEntry> = {}): LinkEntry {
  return {
    id: 'abc123',
    url: 'https://example.com/my-post',
    title: 'Example Post',
    description: 'A test post',
    summary: 'This is a summary.',
    canonicalUrl: null,
    siteName: null,
    imageUrl: null,
    contentType: 'article',
    personalTags: ['testing'],
    publicTags: ['example'],
    createdAt: '2026-06-14T00:00:00.000Z',
    updatedAt: '2026-06-14T00:00:00.000Z',
    status: 'ok',
    errorMessage: '',
    ...overrides,
  };
}

describe('writeEntryToVault', () => {
  beforeEach(() => {
    fs.mkdirSync(vaultDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes a Markdown file to the vault subdirectory', () => {
    const entry = makeEntry();
    const result = writeEntryToVault(entry, vaultDir, 'Inbox');

    expect(result.success).toBe(true);
    expect(result.path).toContain('Inbox');
    expect(result.path).toContain('.md');

    const written = fs.readFileSync(result.path!, 'utf-8');
    expect(written).toContain('---');
    expect(written).toContain('title: Example Post');
    expect(written).toContain('url: https://example.com/my-post');
    expect(written).toContain('This is a summary.');
  });

  it('creates the subdirectory if it does not exist', () => {
    const entry = makeEntry();
    const result = writeEntryToVault(entry, vaultDir, 'Deep/Nested');

    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(vaultDir, 'Deep', 'Nested'))).toBe(true);
  });

  it('returns failure when vault path does not exist', () => {
    const entry = makeEntry();
    const result = writeEntryToVault(entry, '/nonexistent/path', 'Inbox');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('overwrites an existing file with the same name', () => {
    const entry = makeEntry();
    writeEntryToVault(entry, vaultDir, 'Inbox');
    
    const updated = makeEntry({ summary: 'Updated summary.' });
    const result = writeEntryToVault(updated, vaultDir, 'Inbox');

    expect(result.success).toBe(true);
    const written = fs.readFileSync(result.path!, 'utf-8');
    expect(written).toContain('Updated summary.');
  });

  it('sanitizes filenames with special characters', () => {
    const entry = makeEntry({ title: 'What is AI/ML? A deep:dive' });
    const result = writeEntryToVault(entry, vaultDir, 'Inbox');

    expect(result.success).toBe(true);
    const filename = path.basename(result.path!);
    expect(filename).not.toContain('/');
    expect(filename).not.toContain(':');
    expect(filename).not.toContain('?');
  });
});
