# Contributing to Link Curator

Thanks for your interest. This project is early. Keep changes small and boring.

## Before contributing

- Open an issue first for anything larger than a typo fix.
- Check the roadmap in README to see what's planned.

## Development

```sh
pnpm install
pnpm dev        # start at http://localhost:4321
pnpm test       # run tests
pnpm typecheck  # typecheck
pnpm build      # production build
```

## Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add duplicate link detection
fix: reject unsupported URL protocols
docs: document markdown export
```

## Pull requests

- Keep PRs focused on one change.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build` before pushing.
- No new dependencies without a clear justification.
