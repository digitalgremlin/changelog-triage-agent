import { createHash } from 'node:crypto';

/**
 * Returns a stable SHA-256 deduplication key for a changelog entry.
 * `date` is null when the source page does not publish a date.
 */
export function hashEntry(title: string, date: string | null): string {
    // Use chained .update() with a null-byte separator to avoid concatenation
    // collisions: title="A::B",date="C" must not hash the same as title="A",date="B::C".
    // Null bytes cannot appear in changelog titles or ISO date strings.
    return createHash('sha256')
        .update(title)
        .update('\x00')
        .update(date ?? '')
        .digest('hex');
}
