import { describe, expect, it } from 'vitest';
import { sortEntries, filterBySeverity } from '../src/sort.js';
import type { OutputEntry, Severity } from '../src/types.js';

function entry(
    source: string,
    severity: Severity,
    date: string | null,
    title = 'title',
): OutputEntry {
    return { source, severity, date, title, severitySignals: [], rawContent: '', llmSummary: null, url: '' };
}

describe('sortEntries', () => {
    it('sorts BREAKING before WARNING before INFO', () => {
        const entries = [
            entry('A', 'INFO', '2025-01-14'),
            entry('B', 'BREAKING', '2025-01-14'),
            entry('C', 'WARNING', '2025-01-14'),
        ];
        const sorted = sortEntries(entries);
        expect(sorted.map((e) => e.severity)).toEqual(['BREAKING', 'WARNING', 'INFO']);
    });

    it('within same severity, sorts by date descending', () => {
        const entries = [
            entry('A', 'INFO', '2025-01-10'),
            entry('B', 'INFO', '2025-01-14'),
            entry('C', 'INFO', '2025-01-07'),
        ];
        const sorted = sortEntries(entries);
        expect(sorted.map((e) => e.date)).toEqual(['2025-01-14', '2025-01-10', '2025-01-07']);
    });

    it('within same severity and date, sorts by source ascending', () => {
        const entries = [
            entry('Stripe', 'INFO', '2025-01-14'),
            entry('Anthropic', 'INFO', '2025-01-14'),
            entry('OpenAI', 'INFO', '2025-01-14'),
        ];
        const sorted = sortEntries(entries);
        expect(sorted.map((e) => e.source)).toEqual(['Anthropic', 'OpenAI', 'Stripe']);
    });

    it('places null-date entries after dated entries of same severity', () => {
        const entries = [
            entry('A', 'INFO', null),
            entry('B', 'INFO', '2025-01-14'),
        ];
        const sorted = sortEntries(entries);
        expect(sorted[0].date).toBe('2025-01-14');
        expect(sorted[1].date).toBeNull();
    });

    it('does not mutate the original array', () => {
        const entries = [entry('A', 'BREAKING', '2025-01-14'), entry('B', 'INFO', '2025-01-14')];
        const original = [...entries];
        sortEntries(entries);
        expect(entries[0].severity).toBe(original[0].severity);
    });

    it('handles empty array', () => {
        expect(sortEntries([])).toEqual([]);
    });
});

describe('filterBySeverity', () => {
    const all = [
        entry('A', 'INFO', '2025-01-14'),
        entry('B', 'WARNING', '2025-01-14'),
        entry('C', 'BREAKING', '2025-01-14'),
    ];

    it('INFO filter passes all entries', () => {
        expect(filterBySeverity(all, 'INFO')).toHaveLength(3);
    });

    it('WARNING filter excludes INFO entries', () => {
        const filtered = filterBySeverity(all, 'WARNING');
        expect(filtered).toHaveLength(2);
        expect(filtered.every((e) => e.severity !== 'INFO')).toBe(true);
    });

    it('BREAKING filter passes only BREAKING entries', () => {
        const filtered = filterBySeverity(all, 'BREAKING');
        expect(filtered).toHaveLength(1);
        expect(filtered[0].severity).toBe('BREAKING');
    });
});
