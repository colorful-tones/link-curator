export type ContentType = 'article' | 'video' | 'podcast' | 'documentation' | 'tool' | 'social' | 'repo' | 'paper' | 'newsletter' | 'other';

export interface LinkMetadata {
  url: string;
  title: string;
  description: string;
  canonicalUrl: string | null;
  siteName: string | null;
  imageUrl: string | null;
  contentType: ContentType;
}

export interface LinkEnrichment {
  summary: string;
  tags: string[];
  suggestedPersonalTags: string[];
  suggestedPublicTags: string[];
}

export type EntryStatus = 'ok' | 'failed';

export interface LinkEntry {
  id: string;
  url: string;
  title: string;
  description: string;
  summary: string;
  canonicalUrl: string | null;
  siteName: string | null;
  imageUrl: string | null;
  contentType: ContentType;
  personalTags: string[];
  publicTags: string[];
  createdAt: string;
  updatedAt: string;
  status: EntryStatus;
  errorMessage: string;
}
