import { describe, expect, it, vi, afterEach } from 'vitest';
import { summarizeEntry } from '../src/llm.js';

afterEach(() => {
    vi.unstubAllGlobals();
});

function mockFetch(status: number, body: unknown): void {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            ok: status >= 200 && status < 300,
            json: () => Promise.resolve(body),
        }),
    );
}

describe('summarizeEntry', () => {
    it('returns the LLM response content on success', async () => {
        mockFetch(200, {
            choices: [{ message: { content: 'This is a breaking API change.' } }],
        });
        const result = await summarizeEntry('o1 model removed', 'The o1-preview model is removed.', {
            apiKey: 'sk-test',
            model: 'gpt-4o-mini',
        });
        expect(result).toBe('This is a breaking API change.');
    });

    it('returns null on non-200 HTTP response', async () => {
        mockFetch(401, { error: { message: 'Invalid API key' } });
        const result = await summarizeEntry('title', 'content', {
            apiKey: 'bad-key',
            model: 'gpt-4o-mini',
        });
        expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
        const result = await summarizeEntry('title', 'content', {
            apiKey: 'sk-test',
            model: 'gpt-4o-mini',
        });
        expect(result).toBeNull();
    });

    it('returns null when choices array is empty', async () => {
        mockFetch(200, { choices: [] });
        const result = await summarizeEntry('title', 'content', {
            apiKey: 'sk-test',
            model: 'gpt-4o-mini',
        });
        expect(result).toBeNull();
    });

    it('sends model and apiKey in the request', async () => {
        const mockFn = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
        });
        vi.stubGlobal('fetch', mockFn);

        await summarizeEntry('title', 'content', { apiKey: 'sk-my-key', model: 'gpt-4o' });

        const [, init] = mockFn.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(init.body as string) as { model: string };
        const headers = init.headers as Record<string, string>;

        expect(body.model).toBe('gpt-4o');
        expect(headers['Authorization']).toBe('Bearer sk-my-key');
    });

    it('truncates content to ~400 chars before sending', async () => {
        const mockFn = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
        });
        vi.stubGlobal('fetch', mockFn);

        const longContent = 'x'.repeat(2000);
        await summarizeEntry('title', longContent, { apiKey: 'sk-test', model: 'gpt-4o-mini' });

        const [, init] = mockFn.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(init.body as string) as {
            messages: Array<{ role: string; content: string }>;
        };
        const userContent = body.messages.find((m) => m.role === 'user')?.content ?? '';
        expect(userContent.length).toBeLessThanOrEqual(420);
    });
});
