import type { APIRoute } from 'astro';
import { getEntryById, updateEntryEnrichment } from '../../../../lib/db';
import { enrichLink } from '../../../../lib/ai';
import type { LinkMetadata } from '../../../../lib/types';

function buildMetadataFromEntry(entry: NonNullable<ReturnType<typeof getEntryById>>): LinkMetadata {
  return {
    url: entry.url,
    title: entry.title,
    description: entry.description,
    canonicalUrl: entry.canonicalUrl,
    siteName: entry.siteName,
    imageUrl: entry.imageUrl,
    contentType: entry.contentType,
  };
}

export const POST: APIRoute = async ({ params, redirect }) => {
  const { id } = params;
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const entry = getEntryById(id);
  if (!entry) {
    return new Response('Entry not found', { status: 404 });
  }

  const metadata = buildMetadataFromEntry(entry);

  try {
    const enrichment = await enrichLink(metadata);

    if (!enrichment.summary && enrichment.suggestedPersonalTags.length === 0 && enrichment.suggestedPublicTags.length === 0) {
      updateEntryEnrichment(id, {
        summary: entry.summary,
        personalTags: entry.personalTags,
        publicTags: entry.publicTags,
        status: 'failed',
        errorMessage: 'AI returned empty response. The model may not support this prompt format.',
      });
    } else {
      updateEntryEnrichment(id, {
        summary: enrichment.summary,
        personalTags: enrichment.suggestedPersonalTags,
        publicTags: enrichment.suggestedPublicTags,
        status: 'ok',
        errorMessage: '',
      });
    }
  } catch (err) {
    updateEntryEnrichment(id, {
      summary: entry.summary,
      personalTags: entry.personalTags,
      publicTags: entry.publicTags,
      status: 'failed',
      errorMessage: (err as Error).message,
    });
  }

  return redirect(`/entries/${id}`);
};
