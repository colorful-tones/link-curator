const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('URL is empty');
  }

  let normalized: string;

  if (/^\.\.?\//.test(trimmed)) {
    throw new Error('Relative URL not allowed');
  }

  if (trimmed.startsWith('//')) {
    normalized = `https:${trimmed}`;
  } else if (/^\//.test(trimmed)) {
    throw new Error('Relative URL not allowed');
  } else if (!/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) {
    normalized = `https://${trimmed}`;
  } else {
    normalized = trimmed;
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error('Invalid URL');
  }

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }

  return url.href;
}
