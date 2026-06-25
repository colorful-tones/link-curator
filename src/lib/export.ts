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

function pathStaysInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function prepareExportDir(vaultRoot: string, subdir: string): { success: true; dir: string } | { success: false; error: string } {
  const targetDir = path.resolve(vaultRoot, subdir);

  if (!pathStaysInside(vaultRoot, targetDir)) {
    return { success: false, error: `Export subdirectory escapes vault path: ${subdir}` };
  }

  const realVaultRoot = fs.realpathSync(vaultRoot);
  const relativeTarget = path.relative(vaultRoot, targetDir);
  const parts = relativeTarget === '' ? [] : relativeTarget.split(path.sep).filter(Boolean);
  let current = vaultRoot;

  for (const part of parts) {
    current = path.join(current, part);

    if (fs.existsSync(current)) {
      const realCurrent = fs.realpathSync(current);
      if (!pathStaysInside(realVaultRoot, realCurrent)) {
        return { success: false, error: `Export subdirectory escapes vault path: ${subdir}` };
      }
      continue;
    }

    fs.mkdirSync(current);
    const realCurrent = fs.realpathSync(current);
    if (!pathStaysInside(realVaultRoot, realCurrent)) {
      return { success: false, error: `Export subdirectory escapes vault path: ${subdir}` };
    }
  }

  const realTargetDir = fs.realpathSync(targetDir);
  if (!pathStaysInside(realVaultRoot, realTargetDir)) {
    return { success: false, error: `Export subdirectory escapes vault path: ${subdir}` };
  }

  return { success: true, dir: realTargetDir };
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
  const vaultRoot = path.resolve(vaultPath);

  try {
    const prepared = prepareExportDir(vaultRoot, subdir);
    if (!prepared.success) {
      return prepared;
    }

    const filePath = path.join(prepared.dir, filename);
    fs.writeFileSync(filePath, markdown, 'utf-8');
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
