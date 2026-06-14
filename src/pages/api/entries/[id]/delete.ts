import type { APIRoute } from 'astro';
import { deleteEntry } from '../../../../lib/db';

export const POST: APIRoute = async ({ params, redirect }) => {
  const { id } = params;
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  deleteEntry(id);
  return redirect('/');
};
