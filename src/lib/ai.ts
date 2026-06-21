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
    maxTokens: parseInt(process.env.LINK_CURATOR_MAX_TOKENS || '500', 10),
    timeoutMs: parseInt(process.env.LINK_CURATOR_REQUEST_TIMEOUT_MS || '15000', 10),
    disableReasoning: process.env.LINK_CURATOR_DISABLE_REASONING === 'true',
  };
}

function buildPrompt(metadata: LinkMetadata, disableReasoning: boolean): string {
  let prompt = `Analyze this link and return valid JSON with these fields:
- "summary": a short 1-2 sentence summary (max 280 chars)
- "tags": array of relevant general tags
- "suggestedPersonalTags": tags for personal knowledge management (e.g. "to-read", "reference", "project-xyz")
- "suggestedPublicTags": tags suitable for public discovery (e.g. "javascript", "machine-learning", "design")

Title: ${metadata.title}
Description: ${metadata.description}
Site: ${metadata.siteName ?? 'unknown'}
Type: ${metadata.contentType ?? 'unknown'}

Respond with ONLY valid JSON, no markdown, no explanation.`;

  // Qwen models (and some other local models) spend hidden tokens on
  // reasoning unless told not to. /no_think is a prompt-level safeguard
  // that works alongside LM Studio's "Disable thinking" model setting.
  if (disableReasoning) {
    prompt = `/no_think ${prompt}`;
  }

  return prompt;
}

function extractJson(text: string): string | null {
  // Try direct parse first
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Try extracting from markdown code block (common Qwen behavior)
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch?.[1]) {
      try {
        JSON.parse(fenceMatch[1]);
        return fenceMatch[1];
      } catch {
        // continue
      }
    }
    // Try finding first { ... } block
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        JSON.parse(braceMatch[0]);
        return braceMatch[0];
      } catch {
        // continue
      }
    }
    return null;
  }
}

function parseJson(text: string): LinkEnrichment | null {
  const json = extractJson(text);
  if (!json) return null;

  try {
    const parsed = JSON.parse(json);

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
  const { baseUrl, apiKey, model, maxTokens, timeoutMs, disableReasoning } = getConfig();

  if (!baseUrl || !model) {
    throw new Error('AI not configured. Set AI_BASE_URL and AI_MODEL in .env to enable enrichment. AI_API_KEY is optional for local endpoints.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: buildPrompt(metadata, disableReasoning) },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(timeoutMs),
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
