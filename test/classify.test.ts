import { describe, expect, it } from 'vitest';
import { classifyEntry } from '../src/classify.js';

describe('classifyEntry', () => {
    it('returns INFO for info-only text', () => {
        const { severity, signals } = classifyEntry('New embeddings model added to the API');
        expect(severity).toBe('INFO');
        expect(signals).toContain('added');
        expect(signals).toContain('new');
    });

    it('returns WARNING for warning-only text', () => {
        const { severity, signals } = classifyEntry('The endpoint has been renamed from v1 to v2');
        expect(severity).toBe('WARNING');
        expect(signals).toContain('renamed');
    });

    it('returns BREAKING for breaking-only text', () => {
        const { severity, signals } = classifyEntry('This feature has been deprecated and removed');
        expect(severity).toBe('BREAKING');
        expect(signals).toContain('deprecated');
        expect(signals).toContain('removed');
    });

    it('highest severity wins when multiple levels match', () => {
        const { severity, signals } = classifyEntry(
            'The API key format has changed. Old format deprecated.',
        );
        expect(severity).toBe('BREAKING');
        expect(signals).toContain('changed');
        expect(signals).toContain('deprecated');
    });

    it('signals are sorted lexicographically', () => {
        const { signals } = classifyEntry('This feature is deprecated and removed');
        // word-boundary matching: 'removed' does NOT trigger 'moved'
        // 'deprecated' (d) sorts before 'removed' (r)
        expect(signals).toEqual(['deprecated', 'removed']);
    });

    it('signals include matches from ALL severity levels (not just winning)', () => {
        const { severity, signals } = classifyEntry(
            'Breaking: endpoint removed. New replacement added.',
        );
        expect(severity).toBe('BREAKING');
        expect(signals).toContain('added');
        expect(signals).toContain('breaking');
        expect(signals).toContain('removed');
    });

    it('matching is case-insensitive', () => {
        const { severity } = classifyEntry('BREAKING CHANGE in the new release');
        expect(severity).toBe('BREAKING');
    });

    it('matches multi-word keywords', () => {
        const { severity, signals } = classifyEntry(
            'This endpoint has reached end of life as of January 2025',
        );
        expect(severity).toBe('BREAKING');
        expect(signals).toContain('end of life');
    });

    it('matches end-of-life hyphenated keyword', () => {
        const { severity, signals } = classifyEntry('end-of-life notice for legacy token format');
        expect(severity).toBe('BREAKING');
        expect(signals).toContain('end-of-life');
    });

    it('returns INFO with empty signals when no keywords match', () => {
        const { severity, signals } = classifyEntry('See the documentation for details');
        expect(severity).toBe('INFO');
        expect(signals).toHaveLength(0);
    });

    it('handles empty string input', () => {
        const { severity, signals } = classifyEntry('');
        expect(severity).toBe('INFO');
        expect(signals).toHaveLength(0);
    });

    it('does not match keywords as substrings of longer words', () => {
        // 'removed' must not trigger the WARNING keyword 'moved'
        const { severity, signals } = classifyEntry('The feature has been removed');
        expect(severity).toBe('BREAKING');
        expect(signals).toContain('removed');
        expect(signals).not.toContain('moved');
    });

    // Regression: real GitHub/Cloudflare changelog titles use noun/variant
    // inflections ('deprecation', 'Removal', 'no longer available') that the
    // original exact-form keywords ('deprecated', 'removed', 'no longer
    // supported') missed — surfaced by a live run that classified all 50
    // entries INFO, including a real Python 3.9 deprecation and an API removal.

    it('classifies the noun form "deprecation" as BREAKING', () => {
        const { severity, signals } = classifyEntry(
            'Upcoming deprecation of Python 3.9 for Dependabot',
        );
        expect(severity).toBe('BREAKING');
        expect(signals).toContain('deprecated');
    });

    it('classifies "Removal" as BREAKING', () => {
        const { severity, signals } = classifyEntry(
            'Removal of code_scanning_upload field from rate_limit API endpoint',
        );
        expect(severity).toBe('BREAKING');
        expect(signals).toContain('removed');
    });

    it('classifies "no longer available" as WARNING', () => {
        const { severity, signals } = classifyEntry(
            'GitHub Classroom sign-ups are no longer available',
        );
        expect(severity).toBe('WARNING');
        expect(signals).toContain('no longer');
    });

    it('still treats "no longer supported" as BREAKING (outranks WARNING)', () => {
        const { severity } = classifyEntry('Legacy v1 tokens are no longer supported');
        expect(severity).toBe('BREAKING');
    });

    it('keeps short INFO keywords whole-word (does not fire on "newsletter")', () => {
        const { signals } = classifyEntry('Subscribe to our newsletter for updates');
        expect(signals).not.toContain('new');
    });
});
