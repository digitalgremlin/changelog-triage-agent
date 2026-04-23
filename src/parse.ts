import type { RawEntry, SourceConfig } from './types.js';
import * as cheerio from 'cheerio';

const MONTH_MAP: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
};

export function parseDate(raw: string): string | null {
    if (!raw) return null;
    const s = raw.trim();
    if (!s) return null;

    // YYYY-MM-DD or YYYY-MM-DDThh:mm... — validate calendar, reject rollovers
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const sliced = s.slice(0, 10);
        const d = new Date(sliced);
        if (isNaN(d.getTime())) return null;
        // new Date('2025-02-30') silently rolls to 2025-03-02 — reject via round-trip
        if (d.toISOString().slice(0, 10) !== sliced) return null;
        return sliced;
    }

    // "January 14, 2025" or "Jan 14, 2025" or "January 14 2025" or "Jan 14,2025"
    const mdy = /^([A-Za-z]+)\s+(\d{1,2})(?:,\s*|\s+)(\d{4})$/.exec(s);
    if (mdy) {
        const month = MONTH_MAP[mdy[1].toLowerCase()];
        if (month) return `${mdy[3]}-${month}-${mdy[2].padStart(2, '0')}`;
    }

    // "14 January 2025"
    const dmy = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s);
    if (dmy) {
        const month = MONTH_MAP[dmy[2].toLowerCase()];
        if (month) return `${dmy[3]}-${month}-${dmy[1].padStart(2, '0')}`;
    }

    return null;
}

export function parseEntries(
    html: string,
    config: SourceConfig,
    baseUrl: string,
    maxEntries: number,
): { entries: RawEntry[]; parseError: string | null } {
    const $ = cheerio.load(html);

    let elements: ReturnType<typeof $>;
    try {
        elements = $(config.entrySelector);
    } catch {
        return { entries: [], parseError: `Invalid CSS selector: ${config.entrySelector}` };
    }

    if (elements.length === 0) return { entries: [], parseError: null };

    const entries: RawEntry[] = [];

    elements.slice(0, maxEntries).each((_, el) => {
        const $el = $(el);

        const titleText = config.titleSelector
            ? $el.find(config.titleSelector).first().text().trim()
            : $el.text().split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';

        const dateRaw = config.dateSelector
            ? $el.find(config.dateSelector).first().text().trim()
            : null;

        const contentText = config.contentSelector
            ? $el.find(config.contentSelector).text().trim()
            : $el.text().trim();

        const anchor = $el.find('a[href]').first().attr('href');
        let entryUrl = baseUrl;
        if (anchor) {
            try {
                entryUrl = anchor.startsWith('http')
                    ? anchor
                    : new URL(anchor, baseUrl).href;
            } catch {
                entryUrl = baseUrl;
            }
        }

        entries.push({
            title: titleText || 'Untitled',
            date: dateRaw ? parseDate(dateRaw) : null,
            rawContent: contentText.slice(0, 2000),
            url: entryUrl,
        });
    });

    return { entries, parseError: null };
}
