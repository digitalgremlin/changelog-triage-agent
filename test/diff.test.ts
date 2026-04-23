// test/diff.test.ts
import { describe, expect, it } from 'vitest';
import { isNewEntry, computeNewState, slugifySourceName, kvKey } from '../src/diff.js';
import { hashEntry } from '../src/hash.js';
import type { RawEntry, SourceState } from '../src/types.js';

function entry(title: string, date: string | null, rawContent = '', url = ''): RawEntry {
    return { title, date, rawContent, url };
}

describe('slugifySourceName', () => {
    it('lowercases and replaces spaces with underscores', () => {
        expect(slugifySourceName('OpenAI Platform')).toBe('openai_platform');
    });

    it('strips leading/trailing underscores', () => {
        expect(slugifySourceName(' AWS ')).toBe('aws');
    });

    it('collapses consecutive non-alphanumeric chars', () => {
        expect(slugifySourceName('Stripe API & SDK')).toBe('stripe_api_sdk');
    });
});

describe('kvKey', () => {
    it('prefixes slugified name with STATE_', () => {
        expect(kvKey('OpenAI Platform')).toBe('STATE_openai_platform');
    });
});

describe('isNewEntry', () => {
    it('returns true on first run (null state, null since)', () => {
        expect(isNewEntry(entry('title', '2025-01-14'), null, null)).toBe(true);
    });

    it('returns true when entry date is after lastSeenDate', () => {
        const state: SourceState = { lastSeenDate: '2025-01-10', lastSeenHashes: [] };
        expect(isNewEntry(entry('title', '2025-01-14'), state, null)).toBe(true);
    });

    it('returns false when entry date is before lastSeenDate', () => {
        const state: SourceState = { lastSeenDate: '2025-01-14', lastSeenHashes: [] };
        expect(isNewEntry(entry('title', '2025-01-10'), state, null)).toBe(false);
    });

    it('returns false when date equals lastSeenDate and hash is known', () => {
        const title = 'Known entry';
        const date = '2025-01-14';
        const state: SourceState = {
            lastSeenDate: date,
            lastSeenHashes: [hashEntry(title, date)],
        };
        expect(isNewEntry(entry(title, date), state, null)).toBe(false);
    });

    it('returns true when date equals lastSeenDate but hash is unknown', () => {
        const state: SourceState = {
            lastSeenDate: '2025-01-14',
            lastSeenHashes: [hashEntry('other entry', '2025-01-14')],
        };
        expect(isNewEntry(entry('new entry on same day', '2025-01-14'), state, null)).toBe(true);
    });

    it('since overrides state — returns true when date is after since', () => {
        const state: SourceState = { lastSeenDate: '2025-01-01', lastSeenHashes: [] };
        // since is earlier than state, but date is after since
        expect(isNewEntry(entry('title', '2025-01-14'), state, '2025-01-12')).toBe(true);
    });

    it('since overrides state — returns false when date is on or before since', () => {
        const state: SourceState = { lastSeenDate: '2024-01-01', lastSeenHashes: [] };
        // since is later than state, so only entries after since are new
        expect(isNewEntry(entry('title', '2025-01-10'), state, '2025-01-12')).toBe(false);
    });

    it('since set — entry on exact since boundary is not new, regardless of hash', () => {
        const title = 'boundary entry';
        const date = '2025-01-12';
        const state: SourceState = {
            lastSeenDate: '2024-01-01',
            // hash is NOT in state, but since-mode should not do hash dedup
            lastSeenHashes: [],
        };
        expect(isNewEntry(entry(title, date), state, date)).toBe(false);
    });

    it('returns true for entry with null date (cannot determine order)', () => {
        const state: SourceState = { lastSeenDate: '2025-01-14', lastSeenHashes: [] };
        expect(isNewEntry(entry('title', null), state, null)).toBe(true);
    });
});

describe('computeNewState', () => {
    it('returns null for empty entry list', () => {
        expect(computeNewState([])).toBeNull();
    });

    it('returns null when all entries have null dates', () => {
        expect(computeNewState([entry('a', null), entry('b', null)])).toBeNull();
    });

    it('sets lastSeenDate to the most recent date', () => {
        const state = computeNewState([
            entry('a', '2025-01-10'),
            entry('b', '2025-01-14'),
            entry('c', '2025-01-07'),
        ]);
        expect(state?.lastSeenDate).toBe('2025-01-14');
    });

    it('includes hashes only for entries at lastSeenDate', () => {
        const entries = [
            entry('older', '2025-01-10'),
            entry('newest one', '2025-01-14'),
            entry('also newest', '2025-01-14'),
        ];
        const state = computeNewState(entries);
        expect(state?.lastSeenHashes).toHaveLength(2);
        expect(state?.lastSeenHashes).toContain(hashEntry('newest one', '2025-01-14'));
        expect(state?.lastSeenHashes).toContain(hashEntry('also newest', '2025-01-14'));
    });

    it('lastSeenHashes is sorted', () => {
        const entries = [entry('b', '2025-01-14'), entry('a', '2025-01-14')];
        const state = computeNewState(entries);
        expect(state?.lastSeenHashes).toEqual([...(state?.lastSeenHashes ?? [])].sort());
    });
});
