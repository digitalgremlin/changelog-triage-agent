// test/validate.test.ts
import { describe, expect, it } from 'vitest';
import { validateInput } from '../src/validate.js';
import type { Input } from '../src/types.js';

function minimalInput(overrides: Partial<Input> = {}): Input {
    return {
        sources: [{ name: 'GitHub', template: 'github' }],
        ...overrides,
    };
}

describe('validateInput', () => {
    it('accepts a valid template-based source', () => {
        const result = validateInput(minimalInput());
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sources).toHaveLength(1);
        expect(result.sources[0].name).toBe('GitHub');
        expect(result.sources[0].url).toBe('https://github.blog/changelog/');
    });

    it('accepts a valid custom URL source', () => {
        const result = validateInput(
            minimalInput({
                sources: [
                    {
                        name: 'Custom',
                        url: 'https://example.com/changelog',
                        selector: '.entry',
                    },
                ],
            }),
        );
        expect(result.valid).toBe(true);
        expect(result.sources[0].entrySelector).toBe('.entry');
    });

    it('rejects empty sources array', () => {
        const result = validateInput({ sources: [] });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('sources'))).toBe(true);
    });

    it('rejects more than 20 sources', () => {
        const sources = Array.from({ length: 21 }, (_, i) => ({
            name: `Source ${i}`,
            template: 'github',
        }));
        const result = validateInput({ sources });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('20'))).toBe(true);
    });

    it('rejects source with no template and no url', () => {
        const result = validateInput({
            sources: [{ name: 'Bad', url: 'https://example.com' }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('"Bad"'))).toBe(true);
    });

    it('rejects source with url but no selector', () => {
        const result = validateInput({
            sources: [{ name: 'Bad', url: 'https://example.com' }],
        });
        expect(result.valid).toBe(false);
    });

    it('rejects unknown template id', () => {
        const result = validateInput({
            sources: [{ name: 'Unknown', template: 'nonexistent' }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true);
    });

    it('rejects source name longer than 100 chars', () => {
        const result = validateInput({
            sources: [{ name: 'x'.repeat(101), template: 'github' }],
        });
        expect(result.valid).toBe(false);
    });

    it('rejects enableLlmSummary=true without llmApiKey', () => {
        const result = validateInput(
            minimalInput({ enableLlmSummary: true, llmApiKey: null }),
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('llmApiKey'))).toBe(true);
    });

    it('accepts enableLlmSummary=true with llmApiKey', () => {
        const result = validateInput(
            minimalInput({ enableLlmSummary: true, llmApiKey: 'sk-test-key' }),
        );
        expect(result.valid).toBe(true);
    });

    it('rejects maxEntriesPerSource = 0', () => {
        const result = validateInput(minimalInput({ maxEntriesPerSource: 0 }));
        expect(result.valid).toBe(false);
    });

    it('rejects maxEntriesPerSource = 201', () => {
        const result = validateInput(minimalInput({ maxEntriesPerSource: 201 }));
        expect(result.valid).toBe(false);
    });

    it('applies correct defaults', () => {
        const result = validateInput(minimalInput());
        expect(result.severityFilter).toBe('INFO');
        expect(result.enableLlmSummary).toBe(false);
        expect(result.llmModel).toBe('gpt-4o-mini');
        expect(result.maxEntriesPerSource).toBe(50);
        expect(result.since).toBeNull();
    });

    it('passes through the since date', () => {
        const result = validateInput(minimalInput({ since: '2025-01-01' }));
        expect(result.since).toBe('2025-01-01');
    });

    it('accepts dateSelector and contentSelector for custom sources', () => {
        const result = validateInput({
            sources: [
                {
                    name: 'Custom',
                    url: 'https://example.com/changelog',
                    selector: '.entry',
                    dateSelector: '.date',
                    contentSelector: '.body',
                },
            ],
        });
        expect(result.valid).toBe(true);
        expect(result.sources[0].dateSelector).toBe('.date');
        expect(result.sources[0].contentSelector).toBe('.body');
    });
});
