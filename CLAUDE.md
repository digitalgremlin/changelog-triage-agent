# CLAUDE.md

## What This Is

An Apify Actor that monitors product changelogs for new entries, classifies them by severity
(BREAKING/WARNING/INFO), and produces structured triage reports for platform teams.

## Commands

```bash
npm install          # Install dependencies
npm run build        # TypeScript → dist/
npm test             # Run all Vitest tests
npm run start:dev    # Run actor locally with tsx (no compile)
```

## Architecture

- `src/types.ts` — All TypeScript types
- `src/templates.ts` — Curated source templates (pinned CSS selectors)
- `src/validate.ts` — Input validation
- `src/classify.ts` — Keyword-based severity classification (pure)
- `src/parse.ts` — HTML parsing + date normalization (pure)
- `src/hash.ts` — SHA-256 entry hashing (pure)
- `src/diff.ts` — New-entry detection + state management (pure)
- `src/sort.ts` — Entry ordering and severity filtering (pure)
- `src/report.ts` — Output report construction (pure)
- `src/llm.ts` — Optional LLM summarization via direct HTTP
- `src/fetch.ts` — Static HTML fetching (I/O)
- `src/main.ts` — Apify lifecycle, KV store, dataset push (all I/O)

## Non-negotiables

- **Determinism is sacred** — no randomness, no time-based behavior in tests
- **Pure functions only** — I/O in main.ts only
- **Fixture-based tests** — no network calls in tests
- **LLM failures are non-fatal** — one failed summary never aborts the run
- **Selectors are pinned** — changing template selectors requires updating fixtures and bumping version
