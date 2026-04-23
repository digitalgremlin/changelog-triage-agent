import type { Output, OutputEntry, Severity, SourceSummary } from './types.js';

export type SourceMeta = {
    name: string;
    url: string;
    entriesFound: number;
    lastSeenDate: string | null;
};

export function buildReport(
    entries: OutputEntry[],
    sourceMetas: SourceMeta[],
    options: {
        since: string | null;
        severityFilter: Severity;
        enableLlmSummary: boolean;
        llmModel: string | null;
        isFirstRun: boolean;
    },
    notes: string[],
): Output {
    const totalBreaking = entries.filter((e) => e.severity === 'BREAKING').length;
    const totalWarning = entries.filter((e) => e.severity === 'WARNING').length;
    const totalInfo = entries.filter((e) => e.severity === 'INFO').length;

    const sourceSummary: SourceSummary[] = sourceMetas.map((meta) => {
        const sourceEntries = entries.filter((e) => e.source === meta.name);
        return {
            name: meta.name,
            url: meta.url,
            entriesFound: meta.entriesFound,
            newEntries: sourceEntries.length,
            severityCounts: {
                BREAKING: sourceEntries.filter((e) => e.severity === 'BREAKING').length,
                WARNING: sourceEntries.filter((e) => e.severity === 'WARNING').length,
                INFO: sourceEntries.filter((e) => e.severity === 'INFO').length,
            },
            lastSeenDate: meta.lastSeenDate,
        };
    });

    return {
        runDate: new Date().toISOString(),
        sourcesChecked: sourceMetas.length,
        totalNewEntries: entries.length,
        totalBreaking,
        totalWarning,
        totalInfo,
        entries,
        sourceSummary,
        meta: {
            since: options.since,
            severityFilter: options.severityFilter,
            enableLlmSummary: options.enableLlmSummary,
            llmModel: options.llmModel,
            isFirstRun: options.isFirstRun,
        },
        notes,
    };
}
