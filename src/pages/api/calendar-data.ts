import type { APIRoute } from 'astro';
import { getCalendarData } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  const month = url.searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return new Response(JSON.stringify({ error: 'Invalid month format. Use YYYY-MM.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const days = getCalendarData(month);
  return new Response(JSON.stringify({ days }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
