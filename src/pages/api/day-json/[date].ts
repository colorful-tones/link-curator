import type { APIRoute } from 'astro';
import type { LinkEntry } from '../../../lib/types';
import { getEntriesByDate } from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const { date } = params;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const entries = getEntriesByDate(date);

  // Return lightweight entry summaries
  const results = entries.map((e: LinkEntry) => ({
    title: e.title,
    url: e.url,
    contentType: e.contentType,
    summary: e.summary,
    personalTags: e.personalTags,
    publicTags: e.publicTags,
  }));

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
