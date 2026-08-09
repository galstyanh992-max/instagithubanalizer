const ALIASES: Record<string, string> = {
  browse: 'browser.interaction', browser: 'browser.interaction', browsing: 'browser.interaction',
  crawl: 'web.crawl.bulk', crawler: 'web.crawl.bulk', scraping: 'web.extract',
  search: 'web.search', research: 'web.search', web_search: 'web.search',
  pdf: 'document.parse.pdf', ocr: 'document.ocr', document_processor: 'document.parse',
  filesystem: 'filesystem.read', file: 'filesystem.read', terminal: 'terminal.run',
  git: 'code.version_control', coding: 'code.edit', code: 'code.edit',
  automation: 'automation.workflow', n8n: 'automation.workflow',
  social: 'social.draft', messaging: 'communication.message.draft',
  video: 'video.render', tts: 'voice.tts', stt: 'voice.stt',
  vector: 'memory.vector', rag: 'rag.index', mcp: 'mcp.tool',
};

export function normalizeCapability(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[\s:/_-]+/g, '.').replace(/\.+/g, '.');
  return ALIASES[normalized] ?? normalized;
}

export function normalizeCapabilities(values: string[]): string[] {
  return [...new Set(values.map(normalizeCapability).filter(Boolean))].sort();
}

export function capabilityMatches(required: string, offered: string): boolean {
  const left = normalizeCapability(required);
  const right = normalizeCapability(offered);
  return left === right || left.startsWith(`${right}.`) || right.startsWith(`${left}.`);
}

const TASK_RULES: Array<{ match: RegExp; capabilities: string[]; taskClass: string }> = [
  { match: /article|стать[ья]|read url/i, capabilities: ['web.search', 'web.extract'], taskClass: 'article_read' },
  { match: /crawl|site map|сайт.*целик|массов.*страниц/i, capabilities: ['web.crawl.bulk'], taskClass: 'bulk_crawl' },
  { match: /browser|click|form|браузер|нажм/i, capabilities: ['browser.interaction'], taskClass: 'browser_interaction' },
  { match: /pdf|ocr|документ/i, capabilities: ['document.parse.pdf'], taskClass: 'document' },
  { match: /codebase|repository|код|репозитор/i, capabilities: ['code.edit', 'repository.context'], taskClass: 'codebase' },
  { match: /file|файл/i, capabilities: ['filesystem.read'], taskClass: 'file' },
  { match: /workflow|automati|n8n|автоматиза/i, capabilities: ['automation.workflow'], taskClass: 'automation' },
  { match: /social|post draft|соцсет|черновик.*пост/i, capabilities: ['social.draft'], taskClass: 'social_draft' },
  { match: /video|render|видео/i, capabilities: ['video.render'], taskClass: 'video' },
];

export function inferTaskCapabilities(task: string): { taskClass: string; capabilities: string[] } {
  const matches = TASK_RULES.filter((rule) => rule.match.test(task));
  if (matches.length === 0) return { taskClass: 'general', capabilities: ['planning'] };
  return {
    taskClass: matches[0].taskClass,
    capabilities: normalizeCapabilities(matches.flatMap((match) => match.capabilities)),
  };
}
