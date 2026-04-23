import type { OutputEntry, Severity } from './types.js';

const SEVERITY_RANK: Record<Severity, number> = { BREAKING: 3, WARNING: 2, INFO: 1 };

export function sortEntries(entries: OutputEntry[]): OutputEntry[] {
    return [...entries].sort((a, b) => {
        const sevDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        if (sevDiff !== 0) return sevDiff;

        if (a.date === null && b.date === null) return a.source.localeCompare(b.source);
        if (a.date === null) return 1;
        if (b.date === null) return -1;

        const dateDiff = b.date.localeCompare(a.date);
        if (dateDiff !== 0) return dateDiff;

        return a.source.localeCompare(b.source);
    });
}

export function filterBySeverity(entries: OutputEntry[], minSeverity: Severity): OutputEntry[] {
    const minRank = SEVERITY_RANK[minSeverity];
    return entries.filter((e) => SEVERITY_RANK[e.severity] >= minRank);
}
