import { describe, it, expect, beforeEach } from 'vitest';
import { enrichLink } from '../ai';
import type { LinkMetadata } from '../types';

const testMetadata: LinkMetadata = {
  url: 'https://example.com/test',
  title: 'Test Article',
  description: 'A test article about testing',
  canonicalUrl: null,
  siteName: 'Example',
  imageUrl: null,
  contentType: 'article',
};

describe('enrichLink', () => {
  beforeEach(() => {
    delete process.env.AI_BASE_URL;
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
  });

  it('returns fallback when AI_API_KEY is not set', async () => {
    const result = await enrichLink(testMetadata);
    expect(result).toEqual({
      summary: '',
      tags: [],
      suggestedPersonalTags: [],
      suggestedPublicTags: [],
    });
  });

  it('returns fallback when AI_BASE_URL is not set', async () => {
    process.env.AI_API_KEY = 'sk-test';
    const result = await enrichLink(testMetadata);
    expect(result.summary).toBe('');
  });

  it('returns fallback when AI_MODEL is not set', async () => {
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_BASE_URL = 'https://api.example.com';
    const result = await enrichLink(testMetadata);
    expect(result.summary).toBe('');
  });

  it('does not throw when AI request fails', async () => {
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_BASE_URL = 'https://does-not-exist.example.com';
    process.env.AI_MODEL = 'test-model';

    await expect(enrichLink(testMetadata)).resolves.toEqual({
      summary: '',
      tags: [],
      suggestedPersonalTags: [],
      suggestedPublicTags: [],
    });
  });
});
