import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseEntries } from '../src/parse.js';
import { hashEntry } from '../src/hash.js';
import { isNewEntry, computeNewState } from '../src/diff.js';
import { classifyEntry } from '../src/classify.js';
import { sortEntries, filterBySeverity } from '../src/sort.js';
import { buildReport } from '../src/report.js';
import type { OutputEntry, SourceConfig, SourceState } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OPENAI_HTML = readFileSync(join(__dirname, 'fixtures/openai.html'), 'utf-8');
const ANTHROPIC_HTML = readFileSync(join(__dirname, 'fixtures/anthropic.html'), 'utf-8');

const OPENAI_URL = 'https://platform.openai.com/docs/changelog';
const ANTHROPIC_URL = 'https://docs.anthropic.com/en/docs/about-claude/changelog';

function makeOpenAIConfig(): SourceConfig {
    return {
        name: 'OpenAI',
        url: OPENAI_URL,
        entrySelector: '.changelog-entry',
        titleSelector: '.entry-title',
        dateSelector: '.entry-date',
        contentSelector: '.entry-body',
    };
}

function makeAnthropicConfig(): SourceConfig {
    return {
        name: 'Anthropic',
        url: ANTHROPIC_URL,
        entrySelector: '.changelog-item',
        titleSelector: '.item-title',
        dateSelector: '.item-date',
        contentSelector: '.item-body',
    };
}

function toOutputEntry(source: string, raw: { title: string; date: string | null; rawContent: string; url: string }): OutputEntry {
    const { severity, signals } = classifyEntry(`${raw.title} ${raw.rawContent}`);
    return {
        source,
        date: raw.date,
        title: raw.title,
        severity,
        severitySignals: signals,
        rawContent: raw.rawContent,
        llmSummary: null,
        url: raw.url,
    };
}

// ── parseEntries with fixtures ─────────────────────────────────────────────

describe('parseEntries — OpenAI fixture', () => {
    it('parses 3 entries', () => {
        const { entries, parseError } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        expect(parseError).toBeNull();
        expect(entries).toHaveLength(3);
    });

    it('extracts titles correctly', () => {
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        expect(entries[0].title).toBe('GPT-4 deprecated');
        expect(entries[1].title).toBe('Completions endpoint renamed');
        expect(entries[2].title).toBe('Streaming feature added');
    });

    it('parses dates to ISO format', () => {
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        expect(entries[0].date).toBe('2025-01-15');
        expect(entries[1].date).toBe('2025-01-10');
        expect(entries[2].date).toBe('2025-01-05');
    });

    it('resolves relative anchor URLs against baseUrl', () => {
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        expect(entries[0].url).toBe('https://platform.openai.com/changelog/gpt4-deprecated');
    });

    it('respects maxEntries limit', () => {
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 2);
        expect(entries).toHaveLength(2);
    });
});

describe('parseEntries — Anthropic fixture', () => {
    it('parses 2 entries', () => {
        const { entries, parseError } = parseEntries(ANTHROPIC_HTML, makeAnthropicConfig(), ANTHROPIC_URL, 50);
        expect(parseError).toBeNull();
        expect(entries).toHaveLength(2);
    });

    it('extracts titles and ISO dates', () => {
        const { entries } = parseEntries(ANTHROPIC_HTML, makeAnthropicConfig(), ANTHROPIC_URL, 50);
        expect(entries[0].title).toBe('API breaking change');
        expect(entries[0].date).toBe('2025-01-20');
        expect(entries[1].title).toBe('Claude 3 Haiku launched');
        expect(entries[1].date).toBe('2025-01-12');
    });
});

// ── isNewEntry + computeNewState ───────────────────────────────────────────

describe('isNewEntry — pipeline scenarios', () => {
    it('all entries are new on first run (null state)', () => {
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        for (const e of entries) {
            expect(isNewEntry(e, null, null)).toBe(true);
        }
    });

    it('only newer entries pass with stored state', () => {
        const state: SourceState = { lastSeenDate: '2025-01-12', lastSeenHashes: [] };
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const newOnes = entries.filter((e) => isNewEntry(e, state, null));
        expect(newOnes).toHaveLength(1);
        expect(newOnes[0].date).toBe('2025-01-15');
    });

    it('since overrides stored state', () => {
        const state: SourceState = { lastSeenDate: '2024-01-01', lastSeenHashes: [] };
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const newOnes = entries.filter((e) => isNewEntry(e, state, '2025-01-08'));
        expect(newOnes).toHaveLength(2);
        const dates = newOnes.map((e) => e.date);
        expect(dates).toContain('2025-01-15');
        expect(dates).toContain('2025-01-10');
    });
});

describe('computeNewState — from fixture entries', () => {
    it('sets lastSeenDate to most recent entry date', () => {
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const state = computeNewState(entries);
        expect(state?.lastSeenDate).toBe('2025-01-15');
    });

    it('lastSeenHashes covers only entries at lastSeenDate', () => {
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const state = computeNewState(entries);
        expect(state?.lastSeenHashes).toHaveLength(1);
        expect(state?.lastSeenHashes?.[0]).toBe(hashEntry('GPT-4 deprecated', '2025-01-15'));
    });
});

// ── classifyEntry on fixture content ──────────────────────────────────────

describe('classifyEntry — fixture entries', () => {
    it('classifies GPT-4 entry as BREAKING (deprecated + removed)', () => {
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const e = entries[0];
        const { severity, signals } = classifyEntry(`${e.title} ${e.rawContent}`);
        expect(severity).toBe('BREAKING');
        expect(signals).toContain('deprecated');
        expect(signals).toContain('removed');
    });

    it('classifies renamed entry as WARNING', () => {
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const e = entries[1];
        const { severity } = classifyEntry(`${e.title} ${e.rawContent}`);
        expect(severity).toBe('WARNING');
    });

    it('classifies streaming entry as INFO', () => {
        const { entries } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const e = entries[2];
        const { severity } = classifyEntry(`${e.title} ${e.rawContent}`);
        expect(severity).toBe('INFO');
    });

    it('classifies Anthropic breaking entry as BREAKING', () => {
        const { entries } = parseEntries(ANTHROPIC_HTML, makeAnthropicConfig(), ANTHROPIC_URL, 50);
        const e = entries[0];
        const { severity, signals } = classifyEntry(`${e.title} ${e.rawContent}`);
        expect(severity).toBe('BREAKING');
        expect(signals).toContain('breaking');
        expect(signals).toContain('removed');
    });

    it('classifies Anthropic launched entry as INFO', () => {
        const { entries } = parseEntries(ANTHROPIC_HTML, makeAnthropicConfig(), ANTHROPIC_URL, 50);
        const e = entries[1];
        const { severity } = classifyEntry(`${e.title} ${e.rawContent}`);
        expect(severity).toBe('INFO');
    });
});

// ── sortEntries + filterBySeverity ────────────────────────────────────────

describe('sortEntries — full pipeline', () => {
    it('sorts BREAKING before WARNING before INFO', () => {
        const { entries: oa } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const outputEntries = oa.map((e) => toOutputEntry('OpenAI', e));
        const sorted = sortEntries(outputEntries);
        expect(sorted[0].severity).toBe('BREAKING');
        expect(sorted[1].severity).toBe('WARNING');
        expect(sorted[2].severity).toBe('INFO');
    });

    it('filterBySeverity BREAKING retains only BREAKING entries', () => {
        const { entries: oa } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const outputEntries = oa.map((e) => toOutputEntry('OpenAI', e));
        const filtered = filterBySeverity(outputEntries, 'BREAKING');
        expect(filtered).toHaveLength(1);
        expect(filtered[0].severity).toBe('BREAKING');
    });

    it('filterBySeverity WARNING retains BREAKING and WARNING', () => {
        const { entries: oa } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const outputEntries = oa.map((e) => toOutputEntry('OpenAI', e));
        const filtered = filterBySeverity(outputEntries, 'WARNING');
        expect(filtered).toHaveLength(2);
        const severities = filtered.map((e) => e.severity);
        expect(severities).toContain('BREAKING');
        expect(severities).toContain('WARNING');
    });
});

// ── buildReport — full end-to-end ─────────────────────────────────────────

describe('buildReport — full pipeline', () => {
    it('produces a valid report across two sources', () => {
        const { entries: oa } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const { entries: an } = parseEntries(ANTHROPIC_HTML, makeAnthropicConfig(), ANTHROPIC_URL, 50);

        const allNew = [
            ...oa.filter((e) => isNewEntry(e, null, null)).map((e) => toOutputEntry('OpenAI', e)),
            ...an.filter((e) => isNewEntry(e, null, null)).map((e) => toOutputEntry('Anthropic', e)),
        ];

        const openaiState = computeNewState(oa);
        const anthropicState = computeNewState(an);

        const sourceMetas = [
            { name: 'OpenAI', url: OPENAI_URL, entriesFound: oa.length, lastSeenDate: openaiState?.lastSeenDate ?? null },
            { name: 'Anthropic', url: ANTHROPIC_URL, entriesFound: an.length, lastSeenDate: anthropicState?.lastSeenDate ?? null },
        ];

        const sorted = sortEntries(allNew);
        const report = buildReport(sorted, sourceMetas, {
            since: null,
            severityFilter: 'INFO',
            enableLlmSummary: false,
            llmModel: null,
            isFirstRun: true,
        }, ['First run — all entries returned']);

        expect(report.sourcesChecked).toBe(2);
        expect(report.totalNewEntries).toBe(5);
        expect(report.totalBreaking).toBe(2);
        expect(report.totalWarning).toBe(1);
        expect(report.totalInfo).toBe(2);
        expect(report.entries[0].severity).toBe('BREAKING');
        expect(report.meta.isFirstRun).toBe(true);
        expect(report.notes).toContain('First run — all entries returned');
        expect(report.sourceSummary).toHaveLength(2);
        expect(report.sourceSummary[0].name).toBe('OpenAI');
        expect(report.sourceSummary[0].entriesFound).toBe(3);
        expect(report.sourceSummary[1].name).toBe('Anthropic');
        expect(report.sourceSummary[1].entriesFound).toBe(2);
    });

    it('report entries are sorted: BREAKING first', () => {
        const { entries: oa } = parseEntries(OPENAI_HTML, makeOpenAIConfig(), OPENAI_URL, 50);
        const outputEntries = sortEntries(oa.map((e) => toOutputEntry('OpenAI', e)));
        const report = buildReport(outputEntries, [
            { name: 'OpenAI', url: OPENAI_URL, entriesFound: oa.length, lastSeenDate: '2025-01-15' },
        ], {
            since: null,
            severityFilter: 'INFO',
            enableLlmSummary: false,
            llmModel: null,
            isFirstRun: false,
        }, []);
        expect(report.entries[0].severity).toBe('BREAKING');
        expect(report.entries[1].severity).toBe('WARNING');
        expect(report.entries[2].severity).toBe('INFO');
    });
});
