// test/parse.test.ts
import { describe, expect, it } from 'vitest';
import { parseDate } from '../src/parse.js';

describe('parseDate', () => {
    it('returns ISO date as-is (YYYY-MM-DD)', () => {
        expect(parseDate('2025-01-14')).toBe('2025-01-14');
    });

    it('truncates ISO datetime to date portion', () => {
        expect(parseDate('2025-01-14T10:30:00Z')).toBe('2025-01-14');
    });

    it('parses "January 14, 2025"', () => {
        expect(parseDate('January 14, 2025')).toBe('2025-01-14');
    });

    it('parses "Jan 14, 2025" (abbreviated month)', () => {
        expect(parseDate('Jan 14, 2025')).toBe('2025-01-14');
    });

    it('parses "January 14 2025" (no comma)', () => {
        expect(parseDate('January 14 2025')).toBe('2025-01-14');
    });

    it('parses "14 January 2025"', () => {
        expect(parseDate('14 January 2025')).toBe('2025-01-14');
    });

    it('pads single-digit days with leading zero', () => {
        expect(parseDate('March 5, 2025')).toBe('2025-03-05');
    });

    it('handles all 12 months', () => {
        const pairs: [string, string][] = [
            ['February 1, 2025', '2025-02-01'],
            ['March 1, 2025', '2025-03-01'],
            ['April 1, 2025', '2025-04-01'],
            ['May 1, 2025', '2025-05-01'],
            ['June 1, 2025', '2025-06-01'],
            ['July 1, 2025', '2025-07-01'],
            ['August 1, 2025', '2025-08-01'],
            ['September 1, 2025', '2025-09-01'],
            ['October 1, 2025', '2025-10-01'],
            ['November 1, 2025', '2025-11-01'],
            ['December 1, 2025', '2025-12-01'],
        ];
        for (const [input, expected] of pairs) {
            expect(parseDate(input)).toBe(expected);
        }
    });

    it('returns null for unparseable date', () => {
        expect(parseDate('recently')).toBeNull();
        expect(parseDate('Q1 2025')).toBeNull();
        expect(parseDate('')).toBeNull();
    });

    it('trims leading/trailing whitespace', () => {
        expect(parseDate('  January 14, 2025  ')).toBe('2025-01-14');
    });

    it('parses "Jan 14,2025" (comma with no trailing space)', () => {
        expect(parseDate('Jan 14,2025')).toBe('2025-01-14');
    });
});
