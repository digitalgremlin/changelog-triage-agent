import type { Severity } from './types.js';

// A keyword's `stem` is what we match against the text; its `label` is the
// human-readable signal we report. Separating them lets us match real-world
// inflections (deprecation/deprecating, Removal/removing) via a word-prefix
// stem while still surfacing a clean signal label in the output.
interface Keyword {
    stem: string;
    label: string;
    /** 'prefix' matches at a word start (catches inflections); 'word' is whole-word. */
    mode: 'prefix' | 'word';
}

// BREAKING signals are matched as word-prefix STEMS so the noun/variant forms
// that actually appear in changelog titles are caught — 'deprecat' matches
// deprecated/deprecation/deprecating, 'remov' matches removed/Removal/removing.
// (A live run classified a real "deprecation of Python 3.9" and a "Removal of
// <field> from API endpoint" as INFO before this fix.)
const BREAKING_KEYWORDS: readonly Keyword[] = [
    { stem: 'breaking', label: 'breaking', mode: 'word' },
    { stem: 'remov', label: 'removed', mode: 'prefix' },
    { stem: 'deprecat', label: 'deprecated', mode: 'prefix' },
    { stem: 'end of life', label: 'end of life', mode: 'word' },
    { stem: 'end-of-life', label: 'end-of-life', mode: 'word' },
    { stem: 'sunset', label: 'sunset', mode: 'prefix' },
    { stem: 'discontinu', label: 'discontinued', mode: 'prefix' },
    { stem: 'no longer supported', label: 'no longer supported', mode: 'word' },
];

// WARNING / INFO stay whole-word: their keywords include short, common words
// ('new', 'moved') that prefix-matching would over-trigger ('news', 'removed').
const WARNING_KEYWORDS: readonly Keyword[] = [
    { stem: 'changed', label: 'changed', mode: 'word' },
    { stem: 'renamed', label: 'renamed', mode: 'word' },
    { stem: 'migration', label: 'migration', mode: 'word' },
    { stem: 'migrating', label: 'migrating', mode: 'word' },
    { stem: 'updated', label: 'updated', mode: 'word' },
    { stem: 'replaced', label: 'replaced', mode: 'word' },
    { stem: 'moved', label: 'moved', mode: 'word' },
    { stem: 'modified', label: 'modified', mode: 'word' },
    { stem: 'no longer', label: 'no longer', mode: 'word' },
];

const INFO_KEYWORDS: readonly Keyword[] = [
    { stem: 'added', label: 'added', mode: 'word' },
    { stem: 'fixed', label: 'fixed', mode: 'word' },
    { stem: 'improved', label: 'improved', mode: 'word' },
    { stem: 'new', label: 'new', mode: 'word' },
    { stem: 'launched', label: 'launched', mode: 'word' },
    { stem: 'released', label: 'released', mode: 'word' },
    { stem: 'introduced', label: 'introduced', mode: 'word' },
    { stem: 'resolved', label: 'resolved', mode: 'word' },
];

const SEVERITY_ORDER: readonly Severity[] = ['BREAKING', 'WARNING', 'INFO'];

const KEYWORD_MAP: Record<Severity, readonly Keyword[]> = {
    BREAKING: BREAKING_KEYWORDS,
    WARNING: WARNING_KEYWORDS,
    INFO: INFO_KEYWORDS,
};

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches(text: string, keywords: readonly Keyword[]): string[] {
    return keywords
        .filter((kw) => {
            // 'prefix' anchors at a word start but allows trailing letters
            // (stem → inflections); 'word' requires a trailing boundary too.
            const suffix = kw.mode === 'prefix' ? '' : '\\b';
            return new RegExp(`\\b${escapeRegex(kw.stem)}${suffix}`, 'i').test(text);
        })
        .map((kw) => kw.label);
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
