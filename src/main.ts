import { Actor } from 'apify';
import { validateInput } from './validate.js';
import { fetchPage } from './fetch.js';
import { parseEntries } from './parse.js';
import { isNewEntry, computeNewState, kvKey } from './diff.js';
import { classifyEntry } from './classify.js';
import { sortEntries, filterBySeverity } from './sort.js';
import { buildReport } from './report.js';
import { summarizeEntry } from './llm.js';
import type { SourceMeta } from './report.js';
import type { Input, OutputEntry, SourceState } from './types.js';

await Actor.main(async () => {
    const input = await Actor.getInput<Input>();
    if (!input) {
        throw new Error('No input provided');
    }

    const validation = validateInput(input);
    if (!validation.valid) {
        throw new Error(`Invalid input: ${validation.errors.join('; ')}`);
    }

    const { sources, since, severityFilter, enableLlmSummary, llmApiKey, llmModel, maxEntriesPerSource } = validation;

    const storedStates = new Map<string, SourceState | null>();
    for (const source of sources) {
        const state = await Actor.getValue<SourceState>(kvKey(source.name));
        storedStates.set(source.name, state ?? null);
    }
    const isFirstRun = [...storedStates.values()].every((s) => s === null);

    const allOutputEntries: OutputEntry[] = [];
    const sourceMetas: SourceMeta[] = [];
    const notes: string[] = [];

    if (isFirstRun) {
        notes.push('First run — all entries returned');
    }

    for (const source of sources) {
        const storedState = storedStates.get(source.name) ?? null;

        let html: string;
        try {
            html = await fetchPage(source.url);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            notes.push(`Fetch failed for ${source.name}: ${msg}`);
            sourceMetas.push({
                name: source.name,
                url: source.url,
                entriesFound: 0,
                lastSeenDate: storedState?.lastSeenDate ?? null,
            });
            continue;
        }

        const { entries: rawEntries, parseError } = parseEntries(html, source, source.url, maxEntriesPerSource);
        if (parseError) {
            notes.push(`Parse error for ${source.name}: ${parseError}`);
        }

        const newRaw = rawEntries.filter((e) => isNewEntry(e, storedState, since));

        const outputEntries: OutputEntry[] = [];
        for (const raw of newRaw) {
            const { severity, signals } = classifyEntry(`${raw.title} ${raw.rawContent}`);

            let llmSummary: string | null = null;
            if (enableLlmSummary && llmApiKey) {
                llmSummary = await summarizeEntry(raw.title, raw.rawContent, {
                    apiKey: llmApiKey,
                    model: llmModel,
                });
            }

            outputEntries.push({
                source: source.name,
                date: raw.date,
                title: raw.title,
                severity,
                severitySignals: signals,
                rawContent: raw.rawContent,
                llmSummary,
                url: raw.url,
            });
        }

        allOutputEntries.push(...outputEntries);

        const newState = computeNewState(rawEntries);
        if (newState !== null) {
            await Actor.setValue(kvKey(source.name), newState);
        }

        sourceMetas.push({
            name: source.name,
            url: source.url,
            entriesFound: rawEntries.length,
            lastSeenDate: newState?.lastSeenDate ?? storedState?.lastSeenDate ?? null,
        });
    }

    const sorted = sortEntries(allOutputEntries);
    const filtered = filterBySeverity(sorted, severityFilter);

    const report = buildReport(
        filtered,
        sourceMetas,
        {
            since,
            severityFilter,
            enableLlmSummary,
            llmModel: enableLlmSummary ? llmModel : null,
            isFirstRun,
        },
        notes,
    );

    await Actor.pushData(report);

    console.log(
        `Done. ${report.totalNewEntries} new entries — ${report.totalBreaking} BREAKING, ${report.totalWarning} WARNING, ${report.totalInfo} INFO.`,
    );
});
