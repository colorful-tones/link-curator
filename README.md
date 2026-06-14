# Link Curator

A local-first link curation tool built with Astro, SQLite, and AI-assisted metadata enrichment.

Paste a link, save it locally, fetch useful page metadata, generate a short summary, split tags into personal and public discovery buckets, search your saved entries, and export entries as clean Markdown.

The project is intentionally small right now. No auth. No hosted database. No deployment target. The first goal is a useful local workflow.

## Current status

MVP foundation is in place:

- Save links through the local web UI
- Fetch page title, description, canonical URL, site name, image, and content type
- Add AI-generated summaries and tags when AI config exists
- Fall back safely when AI is missing or fails
- Store entries in local SQLite
- Search title, description, URL, summary, personal tags, and public tags
- View entry detail pages
- Export entries to Markdown

## Tech stack

- Astro 6
- TypeScript
- SQLite via `better-sqlite3`
- Vitest
- `node-html-parser`
- OpenAI-compatible chat completions for optional AI enrichment
- pnpm

## Requirements

- Node.js `>=22.12.0`
- pnpm

## Setup

Clone the repo:

```sh
git clone https://github.com/colorful-tones/link-curator.git
cd link-curator
```

Install dependencies:

```sh
pnpm install
```

Copy the example environment file if you want AI enrichment:

```sh
cp .env.example .env
```

Edit `.env` with an OpenAI-compatible provider:

```sh
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-api-key
AI_MODEL=gpt-4o-mini
```

You can also point those values at a compatible open-model provider or local gateway.

AI config is optional. Without it, links still save locally with fetched metadata.

## Development

Start the local dev server:

```sh
pnpm dev
```

Open:

```txt
http://localhost:4321
```

Run tests:

```sh
pnpm test
```

Run typecheck:

```sh
pnpm typecheck
```

Build:

```sh
pnpm build
```

## Local data

The app stores local data in:

```txt
data/link-curator.sqlite
```

Tests use:

```txt
data/test/link-curator.sqlite
```

You can override the data directory with:

```sh
LINK_CURATOR_DATA_DIR=/absolute/path/to/data pnpm dev
```

The `data/` directory and SQLite files are ignored by Git.

## AI enrichment

The AI module uses OpenAI-compatible chat completions:

```txt
POST {AI_BASE_URL}/chat/completions
```

Expected env vars:

```txt
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
```

The AI prompt asks for:

- `summary`
- `tags`
- `suggestedPersonalTags`
- `suggestedPublicTags`

If the provider is unavailable, returns invalid JSON, or errors, the app falls back to empty AI fields and still saves the link.

## Tag model

Entries use two tag buckets:

- `personalTags`: tags for your knowledge system, notes, projects, and recall
- `publicTags`: tags that help other people understand or discover the link

This keeps private organization and public-facing discovery separate without adding a complex taxonomy yet.

## Markdown export

Each entry can export as Markdown from:

```txt
/api/entries/:id/markdown
```

The export includes YAML frontmatter with:

- title
- URL
- canonical URL
- site name
- created and updated timestamps
- content type
- personal tags
- public tags

The body includes the summary and source link.

## Project structure

```txt
src/
  components/
    EntryCard.astro
    LinkForm.astro
    SearchBox.astro
  lib/
    ai.ts
    db.ts
    extract-link.ts
    markdown.ts
    schema.ts
    types.ts
    url.ts
  pages/
    index.astro
    entries/[id].astro
    api/links.ts
    api/entries/[id]/markdown.ts
  styles/
    global.css
```

## What is intentionally not included yet

- User accounts
- Hosted sync
- Deployment instructions
- Browser extension
- Vector search
- Bookmark import
- Manual edit/delete UI
- Retry enrichment UI

Those can come later if the local workflow proves useful.

## Roadmap

Near-term:

- Improve search UX
- Add duplicate URL handling
- Add manual editing for summary and tags
- Add delete action
- Add retry enrichment for failed entries
- Add Markdown export destination options

Later:

- Bookmark import
- Tag pages
- JSON export
- Obsidian-friendly export flows
- Optional browser extension
- Optional hosted mode

## Contributing

This is early. Keep changes small and boring.

Before opening a PR or committing a larger change, run:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Prefer focused commits using Conventional Commit messages, for example:

```txt
feat: add duplicate link detection
fix: reject unsupported URL protocols
docs: document markdown export
```

## License

No license file has been added yet.

If this becomes a public open-source project, add a license before sharing widely. MIT is the likely default unless the project needs something stricter.

## Changelog

### Unreleased

- Added local-first Astro server setup.
- Added SQLite-backed link storage.
- Added URL validation for safe `http` and `https` links.
- Added metadata extraction from HTML and Open Graph tags.
- Added optional OpenAI-compatible AI enrichment.
- Added separate personal and public tag fields.
- Added Markdown export for saved entries.
- Added home page with link submission, recent entries, and search.
- Added entry detail pages.
- Added tests for URL validation, metadata parsing, AI fallback, Markdown export, and database behavior.
