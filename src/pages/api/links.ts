import type { APIRoute } from 'astro';
import { normalizeUrl } from '../../lib/url';
import { extractLinkMetadata } from '../../lib/extract-link';
import { enrichLink } from '../../lib/ai';
import { createEntry, getEntryByUrl } from '../../lib/db';
import { writeEntryToVault } from '../../lib/export';
import type { ContentType, LinkEntry } from '../../lib/types';

function autoExportEntry(entry: LinkEntry): void {
  if (process.env.LINK_CURATOR_AUTO_EXPORT !== 'true') {
    return;
  }

  const vaultPath = process.env.LINK_CURATOR_OBSIDIAN_VAULT;
  if (!vaultPath) {
    console.warn('Link Curator auto-export skipped: LINK_CURATOR_OBSIDIAN_VAULT is not set.');
    return;
  }

  try {
    const subdir = process.env.LINK_CURATOR_EXPORT_SUBDIR || 'Inbox';
    const result = writeEntryToVault(entry, vaultPath, subdir);

    if (!result.success) {
      console.warn('Link Curator auto-export failed:', result.error);
    }
  } catch (err) {
    console.warn('Link Curator auto-export failed:', (err as Error).message);
  }
}

export const POST: APIRoute = async ({ request }) => {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.url || typeof body.url !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing or invalid url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeUrl(body.url);
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const existingEntry = getEntryByUrl(normalizedUrl);
  if (existingEntry) {
    return new Response(JSON.stringify(existingEntry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let title = '';
  let description = '';
  let summary = '';
  let canonicalUrl: string | null = null;
  let siteName: string | null = null;
  let imageUrl: string | null = null;
  let contentType: ContentType = 'other';
  let personalTags: string[] = [];
  let publicTags: string[] = [];
  let status: 'ok' | 'failed' = 'ok';
  let errorMessage = '';

  try {
    const metadata = await extractLinkMetadata(normalizedUrl);
    title = metadata.title;
    description = metadata.description;
    canonicalUrl = metadata.canonicalUrl;
    siteName = metadata.siteName;
    imageUrl = metadata.imageUrl;
    contentType = metadata.contentType;

    const enrichment = await enrichLink(metadata);
    summary = enrichment.summary;
    personalTags = enrichment.suggestedPersonalTags;
    publicTags = enrichment.suggestedPublicTags;

    // If enrichment returned empty (LM Studio not running, model timeout, etc.),
    // mark as failed so the retry button appears on the detail page.
    if (!summary && personalTags.length === 0 && publicTags.length === 0) {
      status = 'failed';
      errorMessage = 'AI returned no summary or tags. Check that your provider is running and the model is available.';
    }
  } catch (err) {
    status = 'failed';
    errorMessage = (err as Error).message;
  }

  const entry: LinkEntry = {
    id,
    url: normalizedUrl,
    title,
    description,
    summary,
    canonicalUrl,
    siteName,
    imageUrl,
    contentType,
    personalTags,
    publicTags,
    createdAt: now,
    updatedAt: now,
    status,
    errorMessage,
  };

  createEntry(entry);
  autoExportEntry(entry);

  return new Response(JSON.stringify(entry), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
