# Link Curator

A local-first link curation tool built with Astro, SQLite, and AI-assisted metadata enrichment.

Paste a link, save it locally, fetch useful page metadata, generate a short summary, split tags into personal and public discovery buckets, search your saved entries, browse by tag or date, explore a tag graph, and export entries as clean Markdown.

## Features

- Save links through the local web UI with AI-generated summaries and tags
- Fetch page title, description, canonical URL, site name, image, and content type
- AI enrichment via OpenAI-compatible API with safe fallback and retry
- Dual tag system: personal tags for your knowledge system, public tags for discovery
- Search across title, description, URL, summary, and tags
- Browse entries by tag (`/tags/:tag`) or by date (`/day/YYYY-MM-DD`)
- Calendar view (`/calendar`) with monthly grid and entry counts
- Interactive D3 tag graph (`/graph`) showing relationships between tags and entries
- Stats endpoint (`/api/stats`) with tag frequency and content type distribution
- Health check endpoint (`/api/health`)
- Pagination on the home page (20 entries per page)
- Per-entry Markdown export with YAML frontmatter
- Save entries directly to an Obsidian vault
- Collection index endpoint (`/api/index-md`) returns a Markdown index of all saved links, newest-first
- PWA support for iPhone via Safari "Add to Home Screen"
- Accessible anywhere via Tailscale (`http://damons-macbook-pro:4321`)
- 106 tests covering URL validation, metadata extraction, AI fallback, export, index generation, and database operations

## Tech stack

- Astro 6
- TypeScript
- SQLite via `better-sqlite3`
- Vitest
- `node-html-parser`
- D3.js v7 (CDN, client-side only)
- OpenAI-compatible chat completions for optional AI enrichment
- pnpm

## Requirements

- Node.js `>=22.12.0`
- pnpm

## Setup

```sh
git clone https://github.com/colorful-tones/link-curator.git
cd link-curator
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

AI config is optional. Without it, links still save locally with fetched metadata.

### iPhone + Tailscale access

The Link Curator works as a standalone app on iPhone via Tailscale:

1. Start the server: `HOST=0.0.0.0 pnpm dev`
2. On iPhone Safari: `http://damons-macbook-pro:4321`
3. Tap Share → Add to Home Screen → name it "Curator"

The PWA manifest enables full-screen mode with no Safari chrome. See the full setup guide in the project vault.

### Obsidian vault export

To auto-write entries to an Obsidian vault, configure:

```sh
LINK_CURATOR_AUTO_EXPORT=true
LINK_CURATOR_OBSIDIAN_VAULT=/Users/you/AI/obsidian/Hermes
LINK_CURATOR_EXPORT_SUBDIR=Inbox
```

Entries save to `{VAULT}/{SUBDIR}/entry-title.md` with YAML frontmatter.
Auto-export is off by default. Manual export from an entry page still only needs `LINK_CURATOR_OBSIDIAN_VAULT`; auto-export runs only when `LINK_CURATOR_AUTO_EXPORT=true` and a vault path is set. Link saving still succeeds if the vault write fails.

## Development

```sh
pnpm dev        # start at http://localhost:4321
pnpm test       # run 106 tests
pnpm typecheck  # TypeScript typecheck
pnpm build      # production build
```

## Local data

The app stores data in `data/link-curator.sqlite`. Tests use `data/test/link-curator.sqlite`.

Override the data directory:

```sh
LINK_CURATOR_DATA_DIR=/absolute/path/to/data pnpm dev
```

## AI enrichment

Uses OpenAI-compatible chat completions at `POST {AI_BASE_URL}/chat/completions`. Works with OpenAI, LM Studio, Ollama, or any OpenAI-compatible endpoint.

### Local LM Studio setup (recommended)

Install [LM Studio](https://lmstudio.ai/), download `qwen/qwen3.5-9b` or `qwen/qwen3-14b`, start the local server, then configure `.env`:

```
AI_BASE_URL=http://localhost:1234/v1
AI_MODEL=qwen/qwen3.5-9b
LINK_CURATOR_MAX_TOKENS=2048
LINK_CURATOR_REQUEST_TIMEOUT_MS=60000
LINK_CURATOR_DISABLE_REASONING=true
```

`AI_API_KEY` can be left blank for local LM Studio. The `/no_think` prefix (enabled by `LINK_CURATOR_DISABLE_REASONING=true`) prevents Qwen models from wasting tokens on hidden reasoning. Pair with LM Studio's "Disable thinking" model setting for best results.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_BASE_URL` | — | OpenAI-compatible base URL (required) |
| `AI_MODEL` | — | Model name (required) |
| `AI_API_KEY` | — | Optional API key — omit for local endpoints |
| `LINK_CURATOR_MAX_TOKENS` | 500 | Max completion tokens (2048 recommended for LM Studio) |
| `LINK_CURATOR_REQUEST_TIMEOUT_MS` | 15000 | Request timeout in ms (60000 for local models) |
| `LINK_CURATOR_DISABLE_REASONING` | false | Prepend `/no_think` to prompt (Qwen/Claude reasoning models) |

The AI prompt requests `summary`, `tags`, `suggestedPersonalTags`, and `suggestedPublicTags`. If the provider is unavailable or returns invalid JSON, the app falls back safely and still saves the link. The JSON parser handles markdown-wrapped JSON (common Qwen output).

## Tag model

Two tag buckets per entry:

- `personalTags` — tags for your knowledge system, notes, projects, recall
- `publicTags` — tags that help others understand or discover the link

## Markdown export

Each entry exports as Markdown from `/api/entries/:id/markdown` with YAML frontmatter (title, URL, canonical URL, site name, timestamps, content type, tags). The body includes the summary and source link.

## Collection index

`GET /api/index-md` returns a single Markdown document listing every saved link, newest-first. Each entry shows its title as a link, URL, canonical URL when available, content type, personal and public tags, added date, and summary. An empty collection returns a short "No entries yet" document instead of an empty response. The endpoint serves `text/markdown` and offers `INDEX.md` as a download filename.

## Project structure

```
src/
  components/
    BaseHead.astro         # shared <head> with PWA meta tags
    EntryCard.astro        # entry preview card
    LinkForm.astro         # new link submission form
    Nav.astro              # site navigation (List | Calendar | Graph)
    Pagination.astro       # pagination controls
    SearchBox.astro        # search input
    TagCloud.astro         # top tags with frequency
  lib/
    ai.ts                  # AI enrichment (OpenAI-compatible)
    db.ts                  # SQLite queries (CRUD, stats, graph data)
    export.ts              # Obsidian vault file writer
    extract-link.ts        # HTML metadata extraction
    markdown.ts            # Markdown/YAML frontmatter generation
    schema.ts              # SQLite schema
    types.ts               # TypeScript types
    url.ts                 # URL validation
    __tests__/             # test files
  pages/
    index.astro            # home page (list, search, tag cloud)
    calendar.astro         # monthly calendar view
    graph.astro            # D3 force-directed tag graph
    day/[date].astro       # entries for a specific date
    entries/[id].astro     # entry detail view
    tags/[tag].astro       # entries for a specific tag
    api/
      links.ts             # POST /api/links
      stats.ts             # GET /api/stats
      health.ts            # GET /api/health
      graph-data.ts        # GET /api/graph-data
      calendar-data.ts     # GET /api/calendar-data?month=YYYY-MM
      index-md.ts          # GET collection index as Markdown
      entries/[id]/
        markdown.ts        # GET markdown export
        edit.ts            # POST edit summary/tags
        delete.ts          # POST delete entry
        enrich.ts          # POST retry AI enrichment
        export-to-vault.ts # POST save to Obsidian
      day-json/[date].ts   # GET lightweight day entries
  styles/
    global.css
public/
  manifest.json            # PWA manifest
  favicon.svg
```

## Roadmap

See the unified roadmap in the project vault for the full v0.3–v1.0 plan.

**Next phases:**
- **Phase 3:** Auto-export to vault on save, INDEX.md generation, entry validation
- **Phase 4:** Hermes agent integration (auto-archive from chat), Telegram intake
- **Phase 5:** HTML bookmark import from browser exports

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

## Changelog

### v0.3.0

*Phase 1 + Phase 2 dashboard features*

- Added health check endpoint (`/api/health`)
- Added stats endpoint (`/api/stats`) with tag frequency and content type distribution
- Added day-based browsing (`/day/YYYY-MM-DD`) with JSON variant
- Added calendar view (`/calendar`) with monthly grid and entry counts
- Added D3 force-directed tag graph (`/graph`) with drag, click navigation, and dangling-links fix
- Added site navigation bar (List | Calendar | Graph) across all pages
- Added tag cloud widget to homepage showing top 30 tags with frequency
- Added PWA manifest and shared `BaseHead.astro` component for iPhone "Add to Home Screen"
- Expanded content types to include `paper` and `newsletter`
- Added `getStats()`, `getGraphData()`, `getCalendarData()`, `getEntriesByDate()` database queries
- 88 tests (up from 53 in v0.2.0)

### v0.3.1

*Phase 3 Markdown bridge*

- Added opt-in Obsidian auto-export on save via `LINK_CURATOR_AUTO_EXPORT=true`
- Hardened vault export path handling against `../`, symlink, and nested symlink escapes
- Added collection index endpoint (`/api/index-md`) returning a Markdown index of all saved links, newest-first
- Added `getAllEntriesForIndex()` database query
- 106 tests (up from 88 in v0.3.0)

### v0.2.0

- Added Obsidian vault export via "Save to Obsidian" button
- Added tag pages at `/tags/:tag` with clickable tag links
- Added pagination on the home page (20 entries per page)
- Added `getEntryCount` and `getEntriesByTag` database queries

### v0.1.1

- Fixed `.env` loading for AI enrichment
- Fixed AI config detection with proper `failed` status and retry prompt

### v0.1.0

- Initial MVP: local-first Astro server, SQLite storage, URL validation, metadata extraction
- AI enrichment with OpenAI-compatible API, safe fallback
- Dual tag system, Markdown export, search, entry CRUD, duplicate detection
- 53 tests, MIT license, contributing guide, issue templates
