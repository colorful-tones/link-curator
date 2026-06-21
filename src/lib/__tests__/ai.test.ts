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
    delete process.env.LINK_CURATOR_MAX_TOKENS;
    delete process.env.LINK_CURATOR_REQUEST_TIMEOUT_MS;
    delete process.env.LINK_CURATOR_DISABLE_REASONING;
  });

  it('throws when AI_BASE_URL is not set', async () => {
    process.env.AI_MODEL = 'test-model';
    await expect(enrichLink(testMetadata)).rejects.toThrow('AI not configured');
  });

  it('throws when AI_MODEL is not set', async () => {
    process.env.AI_BASE_URL = 'https://api.example.com';
    await expect(enrichLink(testMetadata)).rejects.toThrow('AI not configured');
  });

  it('does not require AI_API_KEY for local endpoints (LM Studio)', async () => {
    // Use a non-routable local address that fails fast
    process.env.AI_BASE_URL = 'http://0.0.0.0:1';
    process.env.AI_MODEL = 'qwen/qwen3.5-9b';
    // No API key set — should not throw about missing config, should fallback on fetch failure
    await expect(enrichLink(testMetadata)).resolves.toEqual(EMPTY_ENRICHMENT);
  });

  it('returns fallback when AI request fails', async () => {
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_BASE_URL = 'https://does-not-exist.example.com';
    process.env.AI_MODEL = 'test-model';

    await expect(enrichLink(testMetadata)).resolves.toEqual(EMPTY_ENRICHMENT);
  });
});
