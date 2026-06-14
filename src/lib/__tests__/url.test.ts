import { describe, it, expect } from 'vitest';
import { normalizeUrl } from '../url';

describe('normalizeUrl', () => {
  it('throws on empty string', () => {
    expect(() => normalizeUrl(' ')).toThrow('URL is empty');
  });

  it.each(['/relative/path', './foo', '../foo'])('throws on relative URL: %s', (input) => {
    expect(() => normalizeUrl(input)).toThrow('Relative URL not allowed');
  });

  it('rejects javascript: protocol', () => {
    expect(() => normalizeUrl('javascript:alert(1)')).toThrow('Unsupported protocol');
  });

  it('rejects file: protocol', () => {
    expect(() => normalizeUrl('file:///etc/passwd')).toThrow('Unsupported protocol');
  });

  it('rejects ftp: protocol', () => {
    expect(() => normalizeUrl('ftp://example.com')).toThrow('Unsupported protocol');
  });

  it('rejects mailto: protocol', () => {
    expect(() => normalizeUrl('mailto:test@example.com')).toThrow('Unsupported protocol');
  });

  it('accepts http URLs', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('accepts https URLs', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it('adds https:// when no protocol is given', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/');
  });

  it('handles protocol-relative URLs', () => {
    expect(normalizeUrl('//example.com')).toBe('https://example.com/');
  });

  it('normalizes trailing whitespace', () => {
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com/');
  });

  it('throws on invalid URL', () => {
    expect(() => normalizeUrl('https://')).toThrow('Invalid URL');
  });
});
