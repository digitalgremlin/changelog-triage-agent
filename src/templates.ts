import type { SourceConfig } from './types.js';

type TemplateConfig = Omit<SourceConfig, 'name'>;

export const TEMPLATES: Record<string, TemplateConfig> = {
    github: {
        url: 'https://github.blog/changelog/',
        entrySelector: 'article',
        titleSelector: '.ChangelogItem-title',
        dateSelector: 'time',
        contentSelector: '.ChangelogItem-content-inner',
    },
    cloudflare: {
        url: 'https://blog.cloudflare.com/',
        entrySelector: 'article',
        titleSelector: '[data-testid="post-title"] h2',
        dateSelector: '[data-testid="post-date"]',
        contentSelector: '[data-testid="post-content"]',
    },
};
