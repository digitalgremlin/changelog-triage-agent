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

## Development Workflow (AI-tiered)

Implementation uses a two-tier AI pattern:
- **Claude Code** — architecture, Codex prompt generation, spec + quality review
- **Codex** — bounded pure-function implementation via `codex exec --full-auto`

### Codex invocation pattern

```bash
cd /home/johnny5/Code/apify-actor/changelog-triage-agent
codex exec --full-auto "$(cat /tmp/codex-task-N.md)"
```

Each task prompt follows the template in `../../setup-guide-apify-claude-codex.md` (section 6.1): spec, file scope, acceptance criteria, test code, constraints, verification checklist.

### Review gates (per task)

1. **Spec compliance** — Claude haiku subagent reads files, checks every requirement
2. **Code quality** — Claude haiku subagent reviews implementation and tests

Both gates must pass before marking a task complete.

## Implementation Progress

| Task | Module | Status |
|------|--------|--------|
| 1 | Scaffold (package.json, tsconfig, .actor/, Dockerfile) | ✅ done |
| 2 | `src/types.ts` | ✅ done |
| 3 | `src/classify.ts` + `test/classify.test.ts` | ✅ done |
| 4 | `src/parse.ts` (parseDate) + `test/parse.test.ts` | ✅ done |
| 5 | `src/hash.ts` + `test/hash.test.ts` | ✅ done |
| 6 | `src/diff.ts` + `test/diff.test.ts` | ✅ done |
| 7 | `src/parse.ts` (add parseEntries) + extend tests | ⬜ next |
| 8 | `src/templates.ts` | ⬜ pending |
| 9 | `src/validate.ts` + `test/validate.test.ts` | ⬜ pending |
| 10 | `src/sort.ts` + `test/sort.test.ts` | ⬜ pending |
| 11 | `src/report.ts` + `test/report.test.ts` | ⬜ pending |
| 12 | `src/llm.ts` + `test/llm.test.ts` | ⬜ pending |
| 13 | `src/fetch.ts` | ⬜ pending |
| 14 | `test/fixtures/` + `test/pipeline.test.ts` | ⬜ pending |
| 15 | `src/main.ts` | ⬜ pending |

## Lessons Learned (this build)

### Word-boundary matching in classify.ts
Simple `String.includes()` keyword matching causes false positives: `"removed"` also matches the WARNING keyword `"moved"` as a substring. All keyword matching must use word-boundary regex:
```typescript
new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i').test(text)
```
The regression test at `test/classify.test.ts` line 82 locks this in.

### Always .gitignore before first commit
The scaffold commit accidentally tracked `dist/` and `node_modules/`. Fixed in commit `8172f77`. Always create `.gitignore` (with `dist/`, `node_modules/`, `storage/`) before `git add .`.
