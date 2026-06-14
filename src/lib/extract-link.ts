import { parse as parseHtml } from 'node-html-parser';
import type { ContentType, LinkMetadata } from './types';

export function mapContentType(ogType: string | null, sourceUrl: string): ContentType {
  if (!ogType) return 'other';

  const type = ogType.toLowerCase();

  if (type === 'article') return 'article';
  if (type === 'website') return 'article';
  if (type.startsWith('video.')) return 'video';
  if (type === 'profile') return 'social';

  if (/^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]/.test(sourceUrl)) {
    return 'repo';
  }

  return 'other';
}

export function parseMetadataFromHtml(html: string, sourceUrl: string): LinkMetadata {
  const root = parseHtml(html);

  const og = (property: string): string | undefined =>
    root.querySelector(`meta[property="${property}"]`)?.getAttribute('content')?.trim();

  const twitter = (name: string): string | undefined =>
    root.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim();

  const standard = (name: string): string | undefined =>
    root.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() ??
    root.querySelector(`meta[name="DC.${name}"]`)?.getAttribute('content')?.trim();

  const title =
    og('og:title') ??
    twitter('twitter:title') ??
    standard('title') ??
    root.querySelector('title')?.textContent?.trim() ??
    '';

  const description =
    og('og:description') ??
    twitter('twitter:description') ??
    standard('description') ??
    '';

  const canonicalUrl =
    root.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() ??
    og('og:url') ??
    null;

  const siteName = og('og:site_name') ?? null;

  const imageUrl =
    og('og:image') ??
    twitter('twitter:image') ??
    root.querySelector('link[rel="image_src"]')?.getAttribute('href')?.trim() ??
    null;

  const contentType =
    mapContentType(og('og:type') ?? null, sourceUrl);

  return {
    url: sourceUrl,
    title,
    description,
    canonicalUrl,
    siteName,
    imageUrl,
    contentType,
  };
}

export async function extractLinkMetadata(url: string): Promise<LinkMetadata> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LinkCurator/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const html = await response.text();
  return parseMetadataFromHtml(html, url);
}
