// test/hash.test.ts
import { describe, expect, it } from 'vitest';
import { hashEntry } from '../src/hash.js';

describe('hashEntry', () => {
    it('returns a 64-character hex string', () => {
        const h = hashEntry('GPT-4o released', '2025-01-14');
        expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic — same inputs produce same hash', () => {
        const h1 = hashEntry('GPT-4o released', '2025-01-14');
        const h2 = hashEntry('GPT-4o released', '2025-01-14');
        expect(h1).toBe(h2);
    });

    it('different titles produce different hashes', () => {
        const h1 = hashEntry('GPT-4o released', '2025-01-14');
        const h2 = hashEntry('GPT-4o mini released', '2025-01-14');
        expect(h1).not.toBe(h2);
    });

    it('different dates produce different hashes', () => {
        const h1 = hashEntry('GPT-4o released', '2025-01-14');
        const h2 = hashEntry('GPT-4o released', '2025-01-15');
        expect(h1).not.toBe(h2);
    });

    it('null date is handled (does not throw)', () => {
        expect(() => hashEntry('entry title', null)).not.toThrow();
        const h = hashEntry('entry title', null);
        expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it('null date entries produce consistent hashes', () => {
        expect(hashEntry('entry title', null)).toBe(hashEntry('entry title', null));
    });
});
