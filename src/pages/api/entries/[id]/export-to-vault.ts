import type { APIRoute } from 'astro';
import { getEntryById } from '../../../../lib/db';
import { writeEntryToVault } from '../../../../lib/export';

export const POST: APIRoute = async ({ params, redirect }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing entry id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const vaultPath = process.env.LINK_CURATOR_OBSIDIAN_VAULT;

  if (!vaultPath) {
    return new Response(
      JSON.stringify({
        error: 'Obsidian vault not configured. Set LINK_CURATOR_OBSIDIAN_VAULT in .env.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const entry = getEntryById(id);

  if (!entry) {
    return new Response(JSON.stringify({ error: 'Entry not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const subdir = process.env.LINK_CURATOR_EXPORT_SUBDIR || 'Inbox';
  const result = writeEntryToVault(entry, vaultPath, subdir);

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect(`/entries/${id}?exported=1`, 303);
};
