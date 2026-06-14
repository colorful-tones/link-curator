import fs from 'node:fs';
import path from 'node:path';
import { entryToMarkdown } from './markdown';
import type { LinkEntry } from './types';

export interface ExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'untitled';
}

export function writeEntryToVault(
  entry: LinkEntry,
  vaultPath: string,
  subdir: string,
): ExportResult {
  if (!fs.existsSync(vaultPath)) {
    return { success: false, error: `Vault path does not exist: ${vaultPath}` };
  }

  const markdown = entryToMarkdown(entry);
  const filename = `${sanitizeFilename(entry.title || entry.url)}.md`;
  const dir = path.join(vaultPath, subdir);
  const filePath = path.join(dir, filename);

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, markdown, 'utf-8');
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
