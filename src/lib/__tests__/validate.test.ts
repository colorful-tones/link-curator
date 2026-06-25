import { describe, it, expect } from 'vitest';
import { entryToMarkdown } from '../markdown';
import { validateExportMarkdown } from '../validate';
import type { LinkEntry } from '../types';

describe('validateExportMarkdown', () => {
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

  function removeLine(md: string, line: string): string {
    return md.split('\n').filter((l) => l !== line).join('\n');
  }

  function replaceLine(md: string, from: string, to: string): string {
    return md.replace(from, to);
  }

  function insertBeforeClosingDelimiter(md: string, extra: string): string {
    const lines = md.split('\n');
    let closingIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        closingIdx = i;
        break;
      }
    }
    lines.splice(closingIdx, 0, extra);
    return lines.join('\n');
  }

  it('passes for a round-trip export from entryToMarkdown', () => {
    const md = entryToMarkdown(baseEntry);
    const result = validateExportMarkdown(md);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('reports an error when the title field is missing', () => {
    const md = removeLine(entryToMarkdown(baseEntry), 'title: Example Article');
    const result = validateExportMarkdown(md);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('reports an error when the url field is missing', () => {
    const md = removeLine(entryToMarkdown(baseEntry), 'url: https://example.com/article');
    const result = validateExportMarkdown(md);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'url')).toBe(true);
  });

  it('reports an error when the url is not parseable', () => {
    const md = replaceLine(
      entryToMarkdown(baseEntry),
      'url: https://example.com/article',
      'url: not-a-valid-url',
    );
    const result = validateExportMarkdown(md);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'url')).toBe(true);
  });

  it('reports an error when the createdAt field is missing', () => {
    const md = removeLine(entryToMarkdown(baseEntry), 'createdAt: 2024-01-15T10:00:00.000Z');
    const result = validateExportMarkdown(md);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'createdAt')).toBe(true);
  });

  it('reports an error when createdAt is not a date', () => {
    const md = replaceLine(
      entryToMarkdown(baseEntry),
      'createdAt: 2024-01-15T10:00:00.000Z',
      'createdAt: not-a-date',
    );
    const result = validateExportMarkdown(md);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'createdAt')).toBe(true);
  });

  it('reports an error when the opening frontmatter delimiter is missing', () => {
    const md = entryToMarkdown(baseEntry).replace(/^---\n/, '');
    const result = validateExportMarkdown(md);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'frontmatter')).toBe(true);
  });

  it('reports an error when the closing frontmatter delimiter is missing', () => {
    const lines = entryToMarkdown(baseEntry).split('\n');
    const closingIdx = lines.findIndex((l, i) => i > 0 && l === '---');
    lines.splice(closingIdx, 1);
    const md = lines.join('\n');
    const result = validateExportMarkdown(md);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'frontmatter')).toBe(true);
  });

  it('reports an error when duplicate --- separators appear inside frontmatter', () => {
    const md = insertBeforeClosingDelimiter(entryToMarkdown(baseEntry), '---');
    const result = validateExportMarkdown(md);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'frontmatter')).toBe(true);
  });

  it('warns, but stays valid, when both tag arrays are empty', () => {
    const md = entryToMarkdown({ ...baseEntry, personalTags: [], publicTags: [] });
    const result = validateExportMarkdown(md);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.field === 'tags')).toBe(true);
  });

  it('reports an error for a completely empty string', () => {
    const result = validateExportMarkdown('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
