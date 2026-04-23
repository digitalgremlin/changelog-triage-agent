import type { SourceConfig } from './types.js';

type TemplateConfig = Omit<SourceConfig, 'name'>;

export const TEMPLATES: Record<string, TemplateConfig> = {
    openai: {
        url: 'https://platform.openai.com/docs/changelog',
        entrySelector: '.changelog-entry',
        titleSelector: '.entry-title',
        dateSelector: '.entry-date',
        contentSelector: '.entry-body',
    },
    anthropic: {
        url: 'https://docs.anthropic.com/en/docs/about-claude/changelog',
        entrySelector: '.changelog-item',
        titleSelector: '.item-title',
        dateSelector: '.item-date',
        contentSelector: '.item-body',
    },
};
