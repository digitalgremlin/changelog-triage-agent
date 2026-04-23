import type { Severity } from './types.js';

const BREAKING_KEYWORDS: readonly string[] = [
    'breaking',
    'removed',
    'deprecated',
    'end of life',
    'end-of-life',
    'sunset',
    'discontinued',
    'no longer supported',
];

const WARNING_KEYWORDS: readonly string[] = [
    'changed',
    'renamed',
    'migration',
    'migrating',
    'updated',
    'replaced',
    'moved',
    'modified',
];

const INFO_KEYWORDS: readonly string[] = [
    'added',
    'fixed',
    'improved',
    'new',
    'launched',
    'released',
    'introduced',
    'resolved',
];

const SEVERITY_ORDER: readonly Severity[] = ['BREAKING', 'WARNING', 'INFO'];

const KEYWORD_MAP: Record<Severity, readonly string[]> = {
    BREAKING: BREAKING_KEYWORDS,
    WARNING: WARNING_KEYWORDS,
    INFO: INFO_KEYWORDS,
};

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches(text: string, keywords: readonly string[]): string[] {
    return keywords.filter((kw) => new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i').test(text));
}

export function classifyEntry(text: string): { severity: Severity; signals: string[] } {
    const matched = Object.fromEntries(
        SEVERITY_ORDER.map((level) => [level, findMatches(text, KEYWORD_MAP[level])]),
    ) as Record<Severity, string[]>;

    const signals = [...matched.BREAKING, ...matched.WARNING, ...matched.INFO].sort();

    let severity: Severity = 'INFO';
    for (const level of SEVERITY_ORDER) {
        if (matched[level].length > 0) {
            severity = level;
            break;
        }
    }

    return { severity, signals };
}
