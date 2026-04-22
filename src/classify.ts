import type { Severity } from './types.js';

const KEYWORDS: Record<Severity, readonly string[]> = {
    BREAKING: [
        'breaking',
        'removed',
        'deprecated',
        'end of life',
        'end-of-life',
        'sunset',
        'discontinued',
        'no longer supported',
    ],
    WARNING: [
        'changed',
        'renamed',
        'migration',
        'migrating',
        'updated',
        'replaced',
        'moved',
        'modified',
    ],
    INFO: ['added', 'fixed', 'improved', 'new', 'launched', 'released', 'introduced', 'resolved'],
};

const SEVERITY_ORDER: Severity[] = ['BREAKING', 'WARNING', 'INFO'];

export function classifyEntry(text: string): { severity: Severity; signals: string[] } {
    const normalized = text.toLowerCase();
    const signals = SEVERITY_ORDER.flatMap((severity) =>
        KEYWORDS[severity].filter((keyword) => normalized.includes(keyword)),
    ).sort((a, b) => a.localeCompare(b));

    const severity =
        SEVERITY_ORDER.find((level) => KEYWORDS[level].some((keyword) => normalized.includes(keyword))) ??
        'INFO';

    return { severity, signals };
}
