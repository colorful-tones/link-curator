import type { APIRoute } from 'astro';
import { getStats } from '../../lib/db';

export const GET: APIRoute = async () => {
  const stats = getStats();
  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
