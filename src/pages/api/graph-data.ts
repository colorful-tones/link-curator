import type { APIRoute } from 'astro';
import { getGraphData } from '../../lib/db';

export const GET: APIRoute = async () => {
  const data = getGraphData();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
