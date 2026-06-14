import { describe, it, expect } from 'vitest';
import { parseMetadataFromHtml } from '../extract-link';

describe('parseMetadataFromHtml', () => {
  const baseHtml = `
    <html>
    <head>
      <title>Test Page</title>
      <meta name="description" content="A test page for metadata extraction">
      <meta property="og:title" content="OG Test Title">
      <meta property="og:description" content="OG test description">
      <meta property="og:url" content="https://example.com/canonical">
      <meta property="og:site_name" content="Example Site">
      <meta property="og:image" content="https://example.com/image.jpg">
      <meta property="og:type" content="article">
      <meta name="twitter:title" content="Twitter Test Title">
      <meta name="twitter:description" content="Twitter description">
      <meta name="twitter:image" content="https://example.com/twitter-image.jpg">
      <link rel="canonical" href="https://example.com/canonical-link">
      <link rel="image_src" href="https://example.com/image-src.jpg">
    </head>
    <body></body>
    </html>
  `;

  it('prefers Open Graph title over standard title', () => {
    const result = parseMetadataFromHtml(baseHtml, 'https://example.com');
    expect(result.title).toBe('OG Test Title');
  });

  it('extracts all Open Graph fields', () => {
    const result = parseMetadataFromHtml(baseHtml, 'https://example.com');
    expect(result.title).toBe('OG Test Title');
    expect(result.description).toBe('OG test description');
    expect(result.canonicalUrl).toBe('https://example.com/canonical-link');
    expect(result.siteName).toBe('Example Site');
    expect(result.imageUrl).toBe('https://example.com/image.jpg');
    expect(result.contentType).toBe('article');
  });

  it('falls back to standard meta when OG is missing', () => {
    const html = `
      <html><head>
        <title>Standard Title</title>
        <meta name="description" content="Standard description">
      </head></html>
    `;
    const result = parseMetadataFromHtml(html, 'https://example.com');
    expect(result.title).toBe('Standard Title');
    expect(result.description).toBe('Standard description');
  });

  it('falls back to twitter meta when OG is missing', () => {
    const html = `
      <html><head>
        <title>Page Title</title>
        <meta name="twitter:title" content="Twitter Title">
        <meta name="twitter:description" content="Twitter desc">
        <meta name="twitter:image" content="https://example.com/tw-img.jpg">
      </head></html>
    `;
    const result = parseMetadataFromHtml(html, 'https://example.com');
    expect(result.title).toBe('Twitter Title');
    expect(result.description).toBe('Twitter desc');
    expect(result.imageUrl).toBe('https://example.com/tw-img.jpg');
  });

  it('handles missing metadata gracefully', () => {
    const html = '<html><head></head><body></body></html>';
    const result = parseMetadataFromHtml(html, 'https://example.com');
    expect(result.title).toBe('');
    expect(result.description).toBe('');
    expect(result.canonicalUrl).toBeNull();
    expect(result.siteName).toBeNull();
    expect(result.imageUrl).toBeNull();
    expect(result.contentType).toBe('other');
  });

  it('extracts canonical from link tag', () => {
    const html = `
      <html><head>
        <link rel="canonical" href="https://example.com/canonical">
      </head></html>
    `;
    const result = parseMetadataFromHtml(html, 'https://example.com');
    expect(result.canonicalUrl).toBe('https://example.com/canonical');
  });

  it('extracts image from image_src link', () => {
    const html = `
      <html><head>
        <link rel="image_src" href="https://example.com/img.jpg">
      </head></html>
    `;
    const result = parseMetadataFromHtml(html, 'https://example.com');
    expect(result.imageUrl).toBe('https://example.com/img.jpg');
  });
});
