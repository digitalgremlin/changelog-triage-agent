export async function fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: { 'User-Agent': 'ApifyActor/changelog-triage-agent' },
        signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }

    return response.text();
}
