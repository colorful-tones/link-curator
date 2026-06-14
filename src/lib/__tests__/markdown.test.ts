import { describe, it, expect } from 'vitest';
import { entryToMarkdown } from '../markdown';
import type { LinkEntry } from '../types';

describe('entryToMarkdown', () => {
  const baseEntry: LinkEntry = {
    id: 'abc123',
    url: 'https://example.com/article',
    title: 'Example Article',
    description: 'An example article for testing',
    summary: 'This is a summary of the example article.',
    canonicalUrl: 'https://example.com/canonical',
    siteName: 'Example Site',
    imageUrl: null,
    contentType: 'article',
    personalTags: ['to-read', 'reference'],
    publicTags: ['javascript', 'testing'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    status: 'ok',
    errorMessage: '',
  };

  it('produces valid YAML frontmatter', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toMatch(/^---\n/);
    expect(result).toMatch(/\n---\n/);
  });

  it('includes title in frontmatter', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toContain('title: Example Article');
  });

  it('includes url in frontmatter', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toContain('url: https://example.com/article');
  });

  it('includes canonicalUrl in frontmatter', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toContain('canonicalUrl: https://example.com/canonical');
  });

  it('includes siteName in frontmatter', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toContain('siteName: Example Site');
  });

  it('includes dates in frontmatter', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toContain('createdAt: 2024-01-15T10:00:00.000Z');
    expect(result).toContain('updatedAt: 2024-01-15T10:00:00.000Z');
  });

  it('includes contentType in frontmatter', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toContain('contentType: article');
  });

  it('includes personalTags in frontmatter as YAML list', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toContain('personalTags:');
    expect(result).toContain('  - to-read');
    expect(result).toContain('  - reference');
  });

  it('includes publicTags in frontmatter as YAML list', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toContain('publicTags:');
    expect(result).toContain('  - javascript');
    expect(result).toContain('  - testing');
  });

  it('includes summary in body', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toContain('This is a summary of the example article.');
  });

  it('includes source link in body', () => {
    const result = entryToMarkdown(baseEntry);
    expect(result).toContain('Source: [Example Article](https://example.com/article)');
  });

  it('omits null frontmatter values', () => {
    const entry: LinkEntry = {
      ...baseEntry,
      canonicalUrl: null,
      siteName: null,
      imageUrl: null,
    };
    const result = entryToMarkdown(entry);
    expect(result).not.toContain('canonicalUrl:');
    expect(result).not.toContain('siteName:');
  });

  it('omits empty tag arrays', () => {
    const entry: LinkEntry = {
      ...baseEntry,
      personalTags: [],
      publicTags: [],
    };
    const result = entryToMarkdown(entry);
    expect(result).not.toContain('personalTags:');
    expect(result).not.toContain('publicTags:');
  });

  it('handles empty summary', () => {
    const entry: LinkEntry = {
      ...baseEntry,
      summary: '',
    };
    const result = entryToMarkdown(entry);
    expect(result).not.toContain('undefined');
  });
});
