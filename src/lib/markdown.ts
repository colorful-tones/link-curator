import type { LinkEntry } from './types';

export function entryToMarkdown(entry: LinkEntry): string {
  const frontmatter: Record<string, unknown> = {
    title: entry.title,
    url: entry.url,
    canonicalUrl: entry.canonicalUrl,
    siteName: entry.siteName,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    contentType: entry.contentType,
    personalTags: entry.personalTags.length > 0 ? entry.personalTags : undefined,
    publicTags: entry.publicTags.length > 0 ? entry.publicTags : undefined,
  };

  const cleanFrontmatter = Object.fromEntries(
    Object.entries(frontmatter).filter(([, v]) => v !== undefined && v !== null),
  );

  const body = [
    '',
    ...(entry.summary ? [entry.summary, ''] : []),
    `Source: [${entry.title}](${entry.url})`,
    '',
  ].join('\n');

  const yamlLines = Object.entries(cleanFrontmatter).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map((v: string) => `  - ${v}`).join('\n')}`;
      }
      if (typeof value === 'string' && (value.includes('#') || value.includes("'") || value.includes('"'))) {
        return `${key}: "${value.replace(/"/g, '\\"')}"`;
      }
      if (typeof value === 'string' && /^[\dT:.Z+\-]+$/.test(value)) {
        return `${key}: ${value}`;
      }
      if (typeof value === 'string' && /^[\w\s.\-/]+$/.test(value)) {
        return `${key}: ${value}`;
      }
      return `${key}: ${value}`;
    });

  return `---\n${yamlLines.join('\n')}\n---${body}\n`;
}
