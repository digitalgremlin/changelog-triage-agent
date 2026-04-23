import { createHash } from 'node:crypto';

export function hashEntry(title: string, date: string | null): string {
    return createHash('sha256').update(`${title}::${date ?? ''}`).digest('hex');
}
