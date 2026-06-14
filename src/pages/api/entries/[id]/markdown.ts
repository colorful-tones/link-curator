import type { APIRoute } from 'astro';
import { getEntryById } from '../../../../lib/db';
import { entryToMarkdown } from '../../../../lib/markdown';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing entry id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const entry = getEntryById(id);

  if (!entry) {
    return new Response(JSON.stringify({ error: 'Entry not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const markdown = entryToMarkdown(entry);

  return new Response(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${id}.md"`,
    },
  });
};
