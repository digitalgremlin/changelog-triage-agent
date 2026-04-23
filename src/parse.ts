import type { RawEntry, SourceConfig } from './types.js';

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

// parseEntries is added in Task 7
export type { RawEntry, SourceConfig };
