const SYSTEM_PROMPT =
    'You are a technical writer analyzing API changelog entries. ' +
    'Summarize the impact in 1–2 sentences: what changed, who is affected, and any action required. ' +
    'Be concise and technical.';

export type LlmOptions = {
    apiKey: string;
    model: string;
};

export async function summarizeEntry(
    title: string,
    content: string,
    options: LlmOptions,
): Promise<string | null> {
    const userContent = `${title}\n\n${content.slice(0, 400)}`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${options.apiKey}`,
            },
            body: JSON.stringify({
                model: options.model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userContent },
                ],
                max_tokens: 150,
                temperature: 0,
            }),
            signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) return null;

        const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
        };

        return data.choices?.[0]?.message?.content?.trim() ?? null;
    } catch {
        return null;
    }
}
