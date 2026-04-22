# AGENTS.md

## Actor: Changelog Triage Agent

### Bounded implementation tasks

Acceptable Codex tasks (≤200 lines, ≤3 files each):
- Implement a single pure-function module (classify, parse, hash, diff, sort, report)
- Write tests for a single module given the function signatures
- Add a new curated template to templates.ts with matching fixture HTML

### Off-limits for Codex

- main.ts (Apify lifecycle, KV store interactions)
- Any change to the output schema (types.ts OutputEntry/Output fields)
- Any change to keyword lists in classify.ts (requires version bump)

### Testing

Always run `npm test` after any change. All tests must pass.
