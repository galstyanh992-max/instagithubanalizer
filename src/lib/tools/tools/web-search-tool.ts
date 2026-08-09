// ─── Agent OS — Stage 3: Web Search Tool ──────────────────────
// Lightweight web search for the agent runtime. Resolves the long-standing
// "phantom web.search" — many agent configs referenced this toolId but no
// implementation existed.
//
// Strategy:
//   1. DuckDuckGo HTML endpoint (no API key required) — primary path.
//   2. Graceful degradation: if the network call fails, return a structured
//      error result instead of throwing, so the agent loop continues.
//
// Read-only, no side effects. Respects a result cap and truncation to keep
// tool output bounded for the model context.

import type { ITool, ToolExecutionContext, ToolExecutionResult, ToolInputSchema } from '../types';

const WEB_SEARCH_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Search query (natural language, will be URL-encoded).',
    },
    max_results: {
      type: 'number',
      description: 'Maximum number of results to return (default: 5, max: 10).',
    },
  },
  required: ['query'],
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const DDG_HTML_URL = 'https://html.duckduckgo.com/html/';
const MAX_RESULTS_CAP = 10;

async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, kp: '-2' });
  const response = await fetch(DDG_HTML_URL, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; JARVIS-Agent/0.2)',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(15_000),
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`DuckDuckGo responded ${response.status}`);
  }
  const html = await response.text();
  return parseDuckDuckGoHtml(html, maxResults);
}

// Minimal, resilient parser. DuckDuckGo HTML wraps results in
// <a class="result__a" href="...">title</a> and snippets in
// <a class="result__snippet" ...>. We avoid a full HTML parser dependency.
function parseDuckDuckGoHtml(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  const linkRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

  const links: Array<{ url: string; title: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null && links.length < maxResults) {
    const rawUrl = match[1];
    const title = stripTags(match[2]).trim();
    const url = resolveDdgRedirect(rawUrl);
    if (title && url) links.push({ url, title });
  }

  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) !== null && snippets.length < maxResults) {
    snippets.push(stripTags(match[1]).trim());
  }

  for (let i = 0; i < links.length; i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] ?? '',
    });
  }
  return results;
}

function stripTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');
}

function resolveDdgRedirect(rawUrl: string): string {
  try {
    if (rawUrl.startsWith('//')) {
      return resolveDdgRedirect('https:' + rawUrl);
    }
    if (rawUrl.includes('uddg=')) {
      const url = new URL(rawUrl, 'https://duckduckgo.com');
      const target = url.searchParams.get('uddg');
      if (target) return decodeURIComponent(target);
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export const webSearchTool: ITool = {
  id: 'web.search',
  name: 'Web Search',
  description:
    'Search the web via DuckDuckGo (no API key required). Returns titles, URLs, and snippets for the top results. Use for up-to-date information, documentation, library lookups, and fact-checking.',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: WEB_SEARCH_SCHEMA,
  functionDefinition: {
    name: 'web_search',
    description:
      'Search the web via DuckDuckGo. Returns titles, URLs, and snippets for the top results.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query.' },
        max_results: { type: 'number', description: 'Max results (default 5, max 10).' },
      },
      required: ['query'],
    },
  },

  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startedAt = Date.now();
    const { query, max_results } = context.args as { query: string; max_results?: number };
    const cleanQuery = (query ?? '').trim();

    if (!cleanQuery) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: 'Query is required.',
        error: 'Query is required.',
        durationMs: Date.now() - startedAt,
      };
    }
    const requested = Math.min(Math.max(1, Number(max_results) || 5), MAX_RESULTS_CAP);

    try {
      const results = await searchDuckDuckGo(cleanQuery, requested);
      if (results.length === 0) {
        return {
          success: true,
          toolCallId: context.toolCallId,
          functionName: context.functionName,
          content: `No web results found for "${cleanQuery}".`,
          metadata: { query: cleanQuery, count: 0, provider: 'duckduckgo' },
          durationMs: Date.now() - startedAt,
        };
      }
      const formatted = results
        .map((item, index) => `${index + 1}. ${item.title}\n   ${item.url}\n   ${item.snippet}`)
        .join('\n\n');
      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: formatted,
        metadata: { query: cleanQuery, count: results.length, provider: 'duckduckgo' },
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Web search failed: ${message}`,
        error: `Web search failed: ${message}`,
        metadata: { query: cleanQuery, provider: 'duckduckgo' },
        durationMs: Date.now() - startedAt,
      };
    }
  },
};
