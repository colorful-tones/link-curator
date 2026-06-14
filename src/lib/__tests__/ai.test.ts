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

const EMPTY_ENRICHMENT = {
  summary: '',
  tags: [],
  suggestedPersonalTags: [],
  suggestedPublicTags: [],
};

describe('enrichLink', () => {
  beforeEach(() => {
    delete process.env.AI_BASE_URL;
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
  });

  it('throws when AI_API_KEY is not set', async () => {
    await expect(enrichLink(testMetadata)).rejects.toThrow('AI not configured');
  });

  it('throws when AI_BASE_URL is not set', async () => {
    process.env.AI_API_KEY = 'sk-test';
    await expect(enrichLink(testMetadata)).rejects.toThrow('AI not configured');
  });

  it('throws when AI_MODEL is not set', async () => {
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_BASE_URL = 'https://api.example.com';
    await expect(enrichLink(testMetadata)).rejects.toThrow('AI not configured');
  });

  it('returns fallback when AI request fails', async () => {
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_BASE_URL = 'https://does-not-exist.example.com';
    process.env.AI_MODEL = 'test-model';

    await expect(enrichLink(testMetadata)).resolves.toEqual(EMPTY_ENRICHMENT);
  });
});
