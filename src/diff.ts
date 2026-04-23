import type { RawEntry, SourceState } from './types.js';
import { hashEntry } from './hash.js';

export function slugifySourceName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

export function kvKey(name: string): string {
    return `STATE_${slugifySourceName(name)}`;
}

export function isNewEntry(
    entry: RawEntry,
    state: SourceState | null,
    since: string | null,
): boolean {
    // since takes precedence over stored state for date comparison
    const effectiveSince = since ?? state?.lastSeenDate ?? null;

    if (effectiveSince === null) return true; // first run

    if (entry.date === null) return true; // cannot determine order — include

    if (entry.date > effectiveSince) return true;

    // Same date as effectiveSince: use hash-based dedup (only when comparing against state)
    if (entry.date === effectiveSince && since === null && state !== null) {
        const h = hashEntry(entry.title, entry.date);
        return !state.lastSeenHashes.includes(h);
    }

    return false;
}

export function computeNewState(entries: RawEntry[]): SourceState | null {
    const dated = entries.filter((e) => e.date !== null);
    if (dated.length === 0) return null;

    const mostRecent = dated.reduce((max, e) => (e.date! > max ? e.date! : max), '');
    const atMostRecent = dated.filter((e) => e.date === mostRecent);

    return {
        lastSeenDate: mostRecent,
        lastSeenHashes: atMostRecent.map((e) => hashEntry(e.title, e.date)).sort(),
    };
}
