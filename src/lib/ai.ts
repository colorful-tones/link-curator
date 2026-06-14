import type { LinkEnrichment, LinkMetadata } from './types';

const FALLBACK: LinkEnrichment = {
  summary: '',
  tags: [],
  suggestedPersonalTags: [],
  suggestedPublicTags: [],
};

function getConfig() {
  return {
    baseUrl: process.env.AI_BASE_URL ?? '',
    apiKey: process.env.AI_API_KEY ?? '',
    model: process.env.AI_MODEL ?? '',
  };
}

function buildPrompt(metadata: LinkMetadata): string {
  return `Analyze this link and return valid JSON with these fields:
- "summary": a short 1-2 sentence summary (max 280 chars)
- "tags": array of relevant general tags
- "suggestedPersonalTags": tags for personal knowledge management (e.g. "to-read", "reference", "project-xyz")
- "suggestedPublicTags": tags suitable for public discovery (e.g. "javascript", "machine-learning", "design")

Title: ${metadata.title}
Description: ${metadata.description}
Site: ${metadata.siteName ?? 'unknown'}
Type: ${metadata.contentType ?? 'unknown'}

Respond with ONLY valid JSON, no markdown, no explanation.`;
}

function parseJson(text: string): LinkEnrichment | null {
  try {
    const parsed = JSON.parse(text);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown): t is string => typeof t === 'string') : [],
      suggestedPersonalTags: Array.isArray(parsed.suggestedPersonalTags)
        ? parsed.suggestedPersonalTags.filter((t: unknown): t is string => typeof t === 'string')
        : [],
      suggestedPublicTags: Array.isArray(parsed.suggestedPublicTags)
        ? parsed.suggestedPublicTags.filter((t: unknown): t is string => typeof t === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

export async function enrichLink(metadata: LinkMetadata): Promise<LinkEnrichment> {
  const { baseUrl, apiKey, model } = getConfig();

  if (!apiKey || !baseUrl || !model) {
    throw new Error('AI not configured. Set AI_BASE_URL, AI_API_KEY, and AI_MODEL in .env to enable enrichment.');
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: buildPrompt(metadata) },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return FALLBACK;
    }

    const body = await response.json();
    const content: string | undefined = body?.choices?.[0]?.message?.content;

    if (!content) {
      return FALLBACK;
    }

    return parseJson(content) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}
