import type { LinkEntry } from './types';

export interface ValidationIssue {
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

type FrontmatterValue = string | string[];

function getString(value: FrontmatterValue | undefined): string | null {
  if (value === undefined || Array.isArray(value)) return null;
  return value.length > 0 ? value : null;
}

function getArray(value: FrontmatterValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function parseFrontmatter(content: string): Map<string, FrontmatterValue> {
  const map = new Map<string, FrontmatterValue>();
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = /^([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(line);
    if (match) {
      const key = match[1];
      let value = match[2];
      if (value === '') {
        const items: string[] = [];
        i++;
        while (i < lines.length && /^\s+-\s+.+$/.test(lines[i])) {
          items.push(lines[i].replace(/^\s+-\s+/, ''));
          i++;
        }
        map.set(key, items);
        continue;
      }
      if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\"/g, '"');
      }
      map.set(key, value);
    }
    i++;
  }
  return map;
}

export function validateExportMarkdown(markdown: string): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!markdown || markdown.trim() === '') {
    errors.push({ field: 'frontmatter', message: 'Markdown is empty' });
    return { valid: false, errors, warnings };
  }

  const lines = markdown.split('\n');

  if (lines[0] !== '---') {
    errors.push({
      field: 'frontmatter',
      message: 'Missing opening frontmatter delimiter (---)',
    });
    return { valid: false, errors, warnings };
  }

  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      closingIdx = i;
      break;
    }
  }
  if (closingIdx === -1) {
    errors.push({
      field: 'frontmatter',
      message: 'Unclosed frontmatter, missing closing delimiter (---)',
    });
    return { valid: false, errors, warnings };
  }

  const separatorCount = lines.filter((l) => l === '---').length;
  if (separatorCount > 2) {
    errors.push({
      field: 'frontmatter',
      message: `Duplicate frontmatter delimiters (---), expected exactly 2 but found ${separatorCount}`,
    });
  }

  const fm = parseFrontmatter(lines.slice(1, closingIdx).join('\n'));

  if (!getString(fm.get('title'))) {
    errors.push({ field: 'title', message: 'Missing required frontmatter field: title' });
  }

  const urlValue = getString(fm.get('url'));
  if (!urlValue) {
    errors.push({ field: 'url', message: 'Missing required frontmatter field: url' });
  } else {
    try {
      new URL(urlValue);
    } catch {
      errors.push({ field: 'url', message: `Invalid URL: ${urlValue}` });
    }
  }

  const createdAtValue = getString(fm.get('createdAt'));
  if (!createdAtValue) {
    errors.push({ field: 'createdAt', message: 'Missing required frontmatter field: createdAt' });
  } else if (Number.isNaN(new Date(createdAtValue).getTime())) {
    errors.push({ field: 'createdAt', message: `Invalid createdAt date: ${createdAtValue}` });
  }

  const personalTags = getArray(fm.get('personalTags'));
  const publicTags = getArray(fm.get('publicTags'));
  if (personalTags.length === 0 && publicTags.length === 0) {
    warnings.push({
      field: 'tags',
      message: 'Both personalTags and publicTags are empty or absent',
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Re-exported type for callers that build entries before exporting.
export type { LinkEntry };
