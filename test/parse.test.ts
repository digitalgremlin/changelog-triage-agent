// test/parse.test.ts
import { describe, expect, it } from 'vitest';
import { parseDate, parseEntries } from '../src/parse.js';
import type { SourceConfig } from '../src/types.js';

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

    it('returns null for impossible ISO dates', () => {
        expect(parseDate('2025-13-45')).toBeNull();  // month > 12
        expect(parseDate('2025-00-01')).toBeNull();  // month 00
        expect(parseDate('2025-02-30')).toBeNull();  // day overflow (Feb has 28 days in 2025)
        expect(parseDate('2025-02-29')).toBeNull();  // Feb 29 in non-leap year
        expect(parseDate('2025-04-31')).toBeNull();  // day overflow (April has 30 days)
    });

    it('accepts valid leap year date Feb 29', () => {
        expect(parseDate('2024-02-29')).toBe('2024-02-29');  // 2024 is a leap year
    });

    it('trims leading/trailing whitespace', () => {
        expect(parseDate('  January 14, 2025  ')).toBe('2025-01-14');
    });

    it('parses "Jan 14,2025" (comma with no trailing space)', () => {
        expect(parseDate('Jan 14,2025')).toBe('2025-01-14');
    });
});

const SAMPLE_HTML = `<!DOCTYPE html><html><body>
<div id="changelog">
  <div class="changelog-entry">
    <span class="entry-date">January 14, 2025</span>
    <h3 class="entry-title">GPT-4o mini released</h3>
    <div class="entry-body"><p>A smaller, faster model. New and improved capabilities.</p></div>
    <a href="https://platform.openai.com/docs/changelog#2025-01-14">Permalink</a>
  </div>
  <div class="changelog-entry">
    <span class="entry-date">December 12, 2024</span>
    <h3 class="entry-title">Audio inputs deprecated</h3>
    <div class="entry-body"><p>Legacy audio format deprecated. Please migrate to the new format by March 2025.</p></div>
  </div>
</div>
</body></html>`;

const SAMPLE_CONFIG: SourceConfig = {
    name: 'Test Source',
    url: 'https://platform.openai.com/docs/changelog',
    entrySelector: '.changelog-entry',
    titleSelector: '.entry-title',
    dateSelector: '.entry-date',
    contentSelector: '.entry-body',
};

describe('parseEntries', () => {
    it('extracts correct number of entries', () => {
        const { entries } = parseEntries(SAMPLE_HTML, SAMPLE_CONFIG, SAMPLE_CONFIG.url, 50);
        expect(entries).toHaveLength(2);
    });

    it('extracts title from titleSelector', () => {
        const { entries } = parseEntries(SAMPLE_HTML, SAMPLE_CONFIG, SAMPLE_CONFIG.url, 50);
        expect(entries[0].title).toBe('GPT-4o mini released');
    });

    it('extracts and parses date from dateSelector', () => {
        const { entries } = parseEntries(SAMPLE_HTML, SAMPLE_CONFIG, SAMPLE_CONFIG.url, 50);
        expect(entries[0].date).toBe('2025-01-14');
        expect(entries[1].date).toBe('2024-12-12');
    });

    it('extracts content from contentSelector', () => {
        const { entries } = parseEntries(SAMPLE_HTML, SAMPLE_CONFIG, SAMPLE_CONFIG.url, 50);
        expect(entries[0].rawContent).toContain('smaller, faster model');
    });

    it('truncates rawContent to 2000 chars', () => {
        const long = 'x'.repeat(3000);
        const html = `<html><body>
          <div class="changelog-entry">
            <h3 class="entry-title">Long entry</h3>
            <div class="entry-body">${long}</div>
          </div></body></html>`;
        const { entries } = parseEntries(html, SAMPLE_CONFIG, SAMPLE_CONFIG.url, 50);
        expect(entries[0].rawContent.length).toBe(2000);
    });

    it('respects maxEntries limit', () => {
        const { entries } = parseEntries(SAMPLE_HTML, SAMPLE_CONFIG, SAMPLE_CONFIG.url, 1);
        expect(entries).toHaveLength(1);
    });

    it('resolves relative anchor href against baseUrl', () => {
        const html = `<html><body>
          <div class="changelog-entry">
            <h3 class="entry-title">Entry</h3>
            <div class="entry-body">content</div>
            <a href="/docs/changelog#anchor">link</a>
          </div></body></html>`;
        const { entries } = parseEntries(html, SAMPLE_CONFIG, 'https://example.com', 50);
        expect(entries[0].url).toBe('https://example.com/docs/changelog#anchor');
    });

    it('uses baseUrl when no anchor found', () => {
        const html = `<html><body>
          <div class="changelog-entry">
            <h3 class="entry-title">No link</h3>
            <div class="entry-body">content</div>
          </div></body></html>`;
        const { entries } = parseEntries(html, SAMPLE_CONFIG, 'https://base.example.com', 50);
        expect(entries[0].url).toBe('https://base.example.com');
    });

    it('returns empty entries and parseError for invalid entrySelector', () => {
        const badConfig: SourceConfig = { ...SAMPLE_CONFIG, entrySelector: '>>invalid<<' };
        const { entries, parseError } = parseEntries(SAMPLE_HTML, badConfig, SAMPLE_CONFIG.url, 50);
        expect(entries).toHaveLength(0);
        expect(parseError).toBeTruthy();
    });

    it('returns empty entries and null parseError when selector finds nothing', () => {
        const noMatchConfig: SourceConfig = { ...SAMPLE_CONFIG, entrySelector: '.no-match' };
        const { entries, parseError } = parseEntries(
            SAMPLE_HTML,
            noMatchConfig,
            SAMPLE_CONFIG.url,
            50,
        );
        expect(entries).toHaveLength(0);
        expect(parseError).toBeNull();
    });

    it('falls back to first text line for title when titleSelector is null', () => {
        const config: SourceConfig = { ...SAMPLE_CONFIG, titleSelector: null };
        const html = `<html><body>
          <div class="changelog-entry">Title Line
            <div class="entry-body">body</div>
          </div></body></html>`;
        const { entries } = parseEntries(html, config, 'https://example.com', 50);
        expect(entries[0].title).toBe('Title Line');
    });
});
