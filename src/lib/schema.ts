export const CREATE_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    canonical_url TEXT,
    site_name TEXT,
    image_url TEXT,
    content_type TEXT NOT NULL DEFAULT 'other',
    personal_tags TEXT NOT NULL DEFAULT '[]',
    public_tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ok',
    error_message TEXT NOT NULL DEFAULT ''
  )
`;

export const CREATE_ENTRIES_URL_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_entries_url ON entries(url)
`;

export const CREATE_ENTRIES_CREATED_AT_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at)
`;
