import { describe, expect, it } from 'vitest';
import { buildReport } from '../src/report.js';
import type { OutputEntry, Severity } from '../src/types.js';

function entry(source: string, severity: Severity, date: string | null): OutputEntry {
    return {
        source,
        severity,
        date,
        title: `${severity} entry from ${source}`,
        severitySignals: ['breaking'],
        rawContent: 'content',
        llmSummary: null,
        url: `https://example.com/${source}`,
    };
}

const SOURCES = [
    { name: 'OpenAI', url: 'https://platform.openai.com/docs/changelog', entriesFound: 5, lastSeenDate: '2025-01-14' },
    { name: 'Anthropic', url: 'https://docs.anthropic.com', entriesFound: 2, lastSeenDate: '2024-12-19' },
];

const DEFAULT_OPTIONS = {
    since: null,
    severityFilter: 'INFO' as Severity,
    enableLlmSummary: false,
    llmModel: null,
    isFirstRun: false,
};

describe('buildReport', () => {
    it('counts total entries correctly', () => {
        const entries = [
            entry('OpenAI', 'BREAKING', '2025-01-14'),
            entry('OpenAI', 'WARNING', '2025-01-14'),
            entry('Anthropic', 'INFO', '2024-12-19'),
        ];
        const report = buildReport(entries, SOURCES, DEFAULT_OPTIONS, []);
        expect(report.totalNewEntries).toBe(3);
        expect(report.totalBreaking).toBe(1);
        expect(report.totalWarning).toBe(1);
        expect(report.totalInfo).toBe(1);
    });

    it('sets sourcesChecked to source count', () => {
        const report = buildReport([], SOURCES, DEFAULT_OPTIONS, []);
        expect(report.sourcesChecked).toBe(2);
    });

    it('builds sourceSummary in source order', () => {
        const entries = [
            entry('OpenAI', 'BREAKING', '2025-01-14'),
            entry('Anthropic', 'INFO', '2024-12-19'),
        ];
        const report = buildReport(entries, SOURCES, DEFAULT_OPTIONS, []);
        expect(report.sourceSummary[0].name).toBe('OpenAI');
        expect(report.sourceSummary[1].name).toBe('Anthropic');
    });

    it('counts per-source severity correctly', () => {
        const entries = [
            entry('OpenAI', 'BREAKING', '2025-01-14'),
            entry('OpenAI', 'INFO', '2025-01-14'),
        ];
        const report = buildReport(entries, SOURCES, DEFAULT_OPTIONS, []);
        expect(report.sourceSummary[0].severityCounts).toEqual({ BREAKING: 1, WARNING: 0, INFO: 1 });
        expect(report.sourceSummary[1].severityCounts).toEqual({ BREAKING: 0, WARNING: 0, INFO: 0 });
    });

    it('passes through meta fields', () => {
        const opts = { ...DEFAULT_OPTIONS, isFirstRun: true, since: '2025-01-01', enableLlmSummary: true, llmModel: 'gpt-4o' };
        const report = buildReport([], SOURCES, opts, []);
        expect(report.meta.isFirstRun).toBe(true);
        expect(report.meta.since).toBe('2025-01-01');
        expect(report.meta.enableLlmSummary).toBe(true);
        expect(report.meta.llmModel).toBe('gpt-4o');
    });

    it('includes notes in output', () => {
        const report = buildReport([], SOURCES, DEFAULT_OPTIONS, ['First run — all entries returned']);
        expect(report.notes).toContain('First run — all entries returned');
    });

    it('runDate is an ISO 8601 timestamp', () => {
        const report = buildReport([], SOURCES, DEFAULT_OPTIONS, []);
        expect(() => new Date(report.runDate).toISOString()).not.toThrow();
    });

    it('entries field reflects the passed entries', () => {
        const entries = [entry('OpenAI', 'BREAKING', '2025-01-14')];
        const report = buildReport(entries, SOURCES, DEFAULT_OPTIONS, []);
        expect(report.entries).toHaveLength(1);
        expect(report.entries[0].source).toBe('OpenAI');
    });

    it('sourceSummary newEntries counts only entries for that source', () => {
        const entries = [
            entry('OpenAI', 'INFO', '2025-01-14'),
            entry('OpenAI', 'INFO', '2025-01-10'),
        ];
        const report = buildReport(entries, SOURCES, DEFAULT_OPTIONS, []);
        expect(report.sourceSummary[0].newEntries).toBe(2);
        expect(report.sourceSummary[1].newEntries).toBe(0);
    });
});
