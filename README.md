The Changelog Triage Agent monitors product changelogs for new entries, classifies each entry by severity (BREAKING / WARNING / INFO), and produces structured triage reports — so your platform team can catch API deprecations, breaking changes, and migration notices before they cause incidents.

## Use Cases

- **API-dependent teams** that integrate multiple third-party services and need a single feed of breaking changes across all of them
- **DevOps and platform engineers** who want automated alerts when a dependency announces a deprecation or end-of-life
- **Release managers** who need a weekly changelog digest sorted by severity to include in internal communications
- **On-call engineers** who want to query changelogs on demand when debugging unexpected API behavior
- **Content and docs teams** tracking upstream product changes that may require documentation updates
- **Compliance teams** monitoring vendor changelogs for security advisories and policy changes

## How It Works

1. **Fetch** — The actor fetches static HTML from each configured changelog URL
2. **Parse** — HTML is parsed into structured entries: date, title, body content, and source URL
3. **Diff** — Each entry is hashed (SHA-256) and compared against state stored in Apify's Key-Value store; only entries not seen in a previous run proceed further
4. **Classify** — Keyword-based severity classification assigns BREAKING, WARNING, or INFO to each new entry using word-boundary matching; matched keywords are exposed in the output as `severitySignals`
5. **Sort and filter** — Entries are ordered by severity (BREAKING first), then by date; entries below your `severityFilter` threshold are dropped
6. **Summarize (optional)** — When `enableLlmSummary` is enabled, each entry receives an AI-generated impact summary via the configured LLM API; failures are non-fatal and never abort the run
7. **Report** — A single structured output document is pushed to the Apify dataset, containing all new entries plus per-source summary counts

## Input

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `sources` | array | Yes | — | List of changelog sources to monitor. Each source needs either a `template` name or a `url` + `selector`. See [Curated Templates](#curated-templates) below. |
| `since` | string | No | KV state | ISO 8601 date override. When set, the actor returns entries after this date and ignores stored KV state for the current run. |
| `severityFilter` | string | No | `"INFO"` | Minimum severity to include in output. Accepted values: `"INFO"`, `"WARNING"`, `"BREAKING"`. |
| `enableLlmSummary` | boolean | No | `false` | When `true`, each entry receives an LLM-generated impact summary. Requires `llmApiKey`. |
| `llmApiKey` | string (secret) | No | — | API key for the LLM provider. Required when `enableLlmSummary` is `true`. Stored as a secret — never logged. |
| `llmModel` | string | No | `"gpt-4o-mini"` | Model identifier passed to the LLM API. |
| `maxEntriesPerSource` | integer | No | `50` | Maximum entries to process per source per run. Range: 1–200. Use lower values to reduce run cost. |

### Source object format

Each item in the `sources` array is an object. Use either `template` (for curated sources) or `url` + `selector` (for custom sources):

```json
[
  {
    "name": "OpenAI",
    "template": "openai"
  },
  {
    "name": "My Internal API",
    "url": "https://docs.example.com/changelog",
    "selector": ".changelog-item",
    "titleSelector": "h3",
    "dateSelector": ".date",
    "contentSelector": ".body"
  }
]
```

The `name` field is required for all sources. It appears in the output and is used as the KV store key for deduplication state.

## Output

The actor pushes one record to the Apify dataset per run. The record contains a top-level summary and a full list of new entries.

```json
{
  "runDate": "2025-09-15T09:00:00.000Z",
  "sourcesChecked": 2,
  "totalNewEntries": 3,
  "totalBreaking": 1,
  "totalWarning": 1,
  "totalInfo": 1,
  "entries": [
    {
      "source": "OpenAI",
      "date": "2025-09-14",
      "title": "Deprecation of gpt-3.5-turbo-0301",
      "severity": "BREAKING",
      "severitySignals": ["deprecated"],
      "rawContent": "gpt-3.5-turbo-0301 will be deprecated on October 1, 2025. Migrate to gpt-3.5-turbo.",
      "llmSummary": "The gpt-3.5-turbo-0301 model snapshot is being retired. Teams using this model ID directly must update their code to reference gpt-3.5-turbo before October 1 to avoid request failures.",
      "url": "https://platform.openai.com/docs/changelog"
    },
    {
      "source": "Anthropic",
      "date": "2025-09-13",
      "title": "Messages API rate limit changes",
      "severity": "WARNING",
      "severitySignals": ["changed"],
      "rawContent": "Rate limits for the Messages API have been updated for Tier 1 accounts.",
      "llmSummary": null,
      "url": "https://docs.anthropic.com/en/docs/about-claude/changelog"
    }
  ],
  "sourceSummary": [
    {
      "name": "OpenAI",
      "url": "https://platform.openai.com/docs/changelog",
      "entriesFound": 25,
      "newEntries": 2,
      "severityCounts": { "BREAKING": 1, "WARNING": 1, "INFO": 0 },
      "lastSeenDate": "2025-09-12"
    }
  ],
  "meta": {
    "since": null,
    "severityFilter": "INFO",
    "enableLlmSummary": true,
    "llmModel": "gpt-4o-mini",
    "isFirstRun": false
  },
  "notes": []
}
```

**Key output fields:**

- `entries` — All new changelog entries above the severity threshold, sorted BREAKING first, then by date descending
- `severitySignals` — The specific keywords that triggered classification, making it easy to audit why an entry received its severity rating
- `sourceSummary` — Per-source counts so you can see at a glance which services had the most activity
- `meta.isFirstRun` — `true` on the first run for a given source, when no prior state exists in the KV store

## Curated Templates

The actor ships with pinned CSS selector configurations for known services. When you specify a `template` name in a source, the actor uses pre-validated selectors for that service — no manual selector configuration required.

Currently supported templates:

| Template name | Service |
|---|---|
| `openai` | OpenAI Platform changelog |
| `anthropic` | Anthropic Claude changelog |

To use a template:

```json
{
  "sources": [
    { "name": "OpenAI", "template": "openai" },
    { "name": "Anthropic", "template": "anthropic" }
  ]
}
```

For sources not in the template library, provide a `url` plus CSS selectors directly. The `selector` field (entry container selector) is required; `titleSelector`, `dateSelector`, and `contentSelector` are optional refinements that improve parse quality when the page has a consistent structure.

## LLM Summaries (Optional)

When you set `enableLlmSummary: true`, the actor calls an OpenAI-compatible LLM API to generate a plain-English impact summary for each new entry. The summary appears in the `llmSummary` field of the output entry.

To enable:

```json
{
  "sources": [{ "name": "OpenAI", "template": "openai" }],
  "enableLlmSummary": true,
  "llmApiKey": "YOUR_API_KEY",
  "llmModel": "gpt-4o-mini"
}
```

The `llmApiKey` is stored as a secret and is never written to logs or dataset output.

If summarization fails for an individual entry (network error, rate limit, invalid key), the actor sets `llmSummary: null` for that entry and continues. A single failed summary does not abort the run or affect the rest of the output.

The `llmModel` field accepts any model identifier your API key has access to. The default is `gpt-4o-mini`, which balances cost and quality for short changelog entries.

## Scheduling

The actor is designed to run on a schedule. Set it up in Apify Scheduler (or via the Apify API) to run daily, weekly, or on whatever cadence matches your team's needs.

**Stateful deduplication:** After each run, the actor stores the date and SHA-256 hashes of processed entries in the Apify Key-Value store. On the next scheduled run, only entries that are new since the last run are returned. You will never see the same changelog entry twice across runs for the same source.

Recommended schedule for most teams: daily at a fixed time (e.g., 08:00 UTC), with `severityFilter: "WARNING"` to reduce noise. Reserve `severityFilter: "INFO"` for weekly digest runs where you want full coverage.

To backfill or force a date range, use the `since` input field with an ISO 8601 date string (e.g., `"2025-09-01"`). This overrides the stored KV state for that run without deleting it, so your normal scheduled deduplication resumes on the next run.

## Error Handling

**Fetch failures** — If the actor cannot reach a changelog URL (network error, HTTP 4xx/5xx), it logs a warning, records the error in `notes`, and continues to the next source. A single unreachable source does not fail the entire run.

**Parse errors** — If the CSS selectors return no matching elements, the actor produces zero entries for that source and adds a note to the output. Check the `notes` array in the output record if a source you expect to have entries returns none.

**Invalid template name** — If you specify a `template` value not in the template library, the actor throws a validation error at startup and does not run. Check that the template name matches one listed in [Curated Templates](#curated-templates) exactly.

**Missing required fields** — If `sources` is empty or a source is missing both `template` and `url`, the actor throws a validation error at startup with a message identifying the offending source.

**LLM errors** — See [LLM Summaries (Optional)](#llm-summaries-optional). Summarization errors are non-fatal and isolated per entry.

**Debugging tip:** On a first run against a new source, set `maxEntriesPerSource: 5` and `severityFilter: "INFO"` to verify the selectors are working before committing to a schedule.

## Performance

Run cost scales with two levers you control directly:

- **`maxEntriesPerSource`** — The primary cost control. The default of 50 entries per source is appropriate for most changelogs. For very active sources or when running against many sources simultaneously, lower this to 10–20. For initial historical backfills, you can raise it up to the maximum of 200.
- **`severityFilter`** — Filtering to `"WARNING"` or `"BREAKING"` reduces both the entries processed and the LLM calls made when summarization is enabled.

On a typical scheduled run with 3–5 sources, `maxEntriesPerSource: 50`, and LLM summaries disabled, the actor completes in under 30 seconds and consumes minimal compute units. Enabling LLM summaries adds one API call per new entry — use `severityFilter: "WARNING"` alongside summarization to keep costs predictable.
