export type Severity = 'BREAKING' | 'WARNING' | 'INFO';

// ── Input types ──

export type SourceInput = {
    name: string;
    template?: string | null;
    url?: string | null;
    selector?: string | null;
    dateSelector?: string | null;
    contentSelector?: string | null;
};

export type Input = {
    sources: SourceInput[];
    since?: string | null;
    severityFilter?: Severity;
    enableLlmSummary?: boolean;
    llmApiKey?: string | null;
    llmModel?: string;
    maxEntriesPerSource?: number;
};

// ── Internal types ──

export type SourceConfig = {
    name: string;
    url: string;
    entrySelector: string;
    titleSelector: string | null;
    dateSelector: string | null;
    contentSelector: string | null;
};

export type RawEntry = {
    title: string;
    date: string | null;
    rawContent: string;
    url: string;
};

export type SourceState = {
    lastSeenDate: string;
    lastSeenHashes: string[];
};

// ── Output types ──

export type OutputEntry = {
    source: string;
    date: string | null;
    title: string;
    severity: Severity;
    severitySignals: string[];
    rawContent: string;
    llmSummary: string | null;
    url: string;
};

export type SourceSummary = {
    name: string;
    url: string;
    entriesFound: number;
    newEntries: number;
    severityCounts: { BREAKING: number; WARNING: number; INFO: number };
    lastSeenDate: string | null;
};

export type Output = {
    runDate: string;
    sourcesChecked: number;
    totalNewEntries: number;
    totalBreaking: number;
    totalWarning: number;
    totalInfo: number;
    entries: OutputEntry[];
    sourceSummary: SourceSummary[];
    meta: {
        since: string | null;
        severityFilter: Severity;
        enableLlmSummary: boolean;
        llmModel: string | null;
        isFirstRun: boolean;
    };
    notes: string[];
};
