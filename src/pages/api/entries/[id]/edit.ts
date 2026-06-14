import type { APIRoute } from 'astro';
import { updateEntry } from '../../../../lib/db';

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const { id } = params;
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const formData = await request.formData();
  const body = {
    summary: formData.get('summary')?.toString(),
    personalTags: formData.get('personalTags')?.toString(),
    publicTags: formData.get('publicTags')?.toString(),
  };

  const personalTags = body.personalTags
    ? body.personalTags.split(',').map((t) => t.trim()).filter(Boolean)
    : undefined;
  const publicTags = body.publicTags
    ? body.publicTags.split(',').map((t) => t.trim()).filter(Boolean)
    : undefined;

  updateEntry(id, {
    summary: body.summary,
    personalTags,
    publicTags,
  });

  return redirect(`/entries/${id}`);
};
