import type { APIRoute } from 'astro';
import { getEntryCount } from '../../lib/db';

export const GET: APIRoute = async () => {
  const entryCount = getEntryCount();
  const uptime = process.uptime();

  return new Response(
    JSON.stringify({
      status: 'healthy',
      entryCount,
      uptime: Math.round(uptime),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
