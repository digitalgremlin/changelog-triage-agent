import type { Input, SourceConfig, Severity } from './types.js';
import { TEMPLATES } from './templates.js';

export type ValidationResult = {
    valid: boolean;
    errors: string[];
    sources: SourceConfig[];
    since: string | null;
    severityFilter: Severity;
    enableLlmSummary: boolean;
    llmApiKey: string | null;
    llmModel: string;
    maxEntriesPerSource: number;
};

export function validateInput(input: Input): ValidationResult {
    const errors: string[] = [];
    const sources: SourceConfig[] = [];

    if (!input.sources || input.sources.length === 0) {
        errors.push('sources must be a non-empty array');
    } else if (input.sources.length > 20) {
        errors.push('sources cannot exceed 20 entries');
    } else {
        for (const src of input.sources) {
            if (!src.name || src.name.length > 100) {
                errors.push(`source name must be 1–100 chars, got: "${src.name ?? ''}"`);
                continue;
            }

            if (src.template) {
                const tpl = TEMPLATES[src.template];
                if (!tpl) {
                    errors.push(
                        `unknown template: "${src.template}". Valid: ${Object.keys(TEMPLATES).join(', ')}`,
                    );
                } else {
                    sources.push({ ...tpl, name: src.name });
                }
            } else if (src.url && src.selector) {
                sources.push({
                    name: src.name,
                    url: src.url,
                    entrySelector: src.selector,
                    titleSelector: null,
                    dateSelector: src.dateSelector ?? null,
                    contentSelector: src.contentSelector ?? null,
                });
            } else {
                errors.push(`source "${src.name}": must have template OR (url + selector)`);
            }
        }
    }

    const severityFilter: Severity = input.severityFilter ?? 'INFO';
    if (!['INFO', 'WARNING', 'BREAKING'].includes(severityFilter)) {
        errors.push('severityFilter must be INFO, WARNING, or BREAKING');
    }

    const enableLlmSummary = input.enableLlmSummary ?? false;
    const llmApiKey = input.llmApiKey ?? null;
    if (enableLlmSummary && !llmApiKey) {
        errors.push('llmApiKey is required when enableLlmSummary is true');
    }

    const maxEntriesPerSource = input.maxEntriesPerSource ?? 50;
    if (maxEntriesPerSource < 1 || maxEntriesPerSource > 200) {
        errors.push('maxEntriesPerSource must be between 1 and 200');
    }

    return {
        valid: errors.length === 0,
        errors,
        sources,
        since: input.since ?? null,
        severityFilter,
        enableLlmSummary,
        llmApiKey,
        llmModel: input.llmModel ?? 'gpt-4o-mini',
        maxEntriesPerSource,
    };
}
