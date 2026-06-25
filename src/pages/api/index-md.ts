import type { APIRoute } from 'astro';
import { getAllEntriesForIndex } from '../../lib/db';
import type { LinkEntry } from '../../lib/types';

const EMPTY_INDEX = '# Link Curator Index\n\n_No entries yet._\n';

function formatTags(tags: string[]): string {
  return tags.length > 0 ? tags.join(', ') : '_none_';
}

function entryToIndexSection(entry: LinkEntry): string {
  const lines: string[] = [];
  lines.push(`## [${entry.title || entry.url}](${entry.url})`);
  lines.push('');
  lines.push(`- URL: ${entry.url}`);
  if (entry.canonicalUrl) {
    lines.push(`- Canonical URL: ${entry.canonicalUrl}`);
  }
  lines.push(`- Content type: ${entry.contentType}`);
  lines.push(`- Personal tags: ${formatTags(entry.personalTags)}`);
  lines.push(`- Public tags: ${formatTags(entry.publicTags)}`);
  lines.push(`- Added: ${entry.createdAt}`);
  if (entry.summary) {
    lines.push('');
    lines.push(entry.summary);
  }
  lines.push('');
  return lines.join('\n');
}

export function entriesToIndexMarkdown(entries: LinkEntry[]): string {
  if (entries.length === 0) {
    return EMPTY_INDEX;
  }
  const sections = entries.map(entryToIndexSection).join('\n');
  return `# Link Curator Index\n\n${entries.length} link${entries.length === 1 ? '' : 's'} saved.\n\n${sections}`;
}

export const GET: APIRoute = async () => {
  const entries = getAllEntriesForIndex();
  const markdown = entriesToIndexMarkdown(entries);

  return new Response(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="INDEX.md"',
    },
  });
};
