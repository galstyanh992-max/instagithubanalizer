// ─── Agent OS — Stage 3: HTTP/Web Tool ─────────────────────────
// An HTTP request tool that can fetch web content.
// Demonstrates a tool with side effects and 'read' permission.
// Only agents with 'read' or higher permission can use it.

import type { ITool, ToolExecutionContext, ToolExecutionResult, ToolInputSchema } from '../types';
import * as http from 'http';
import * as https from 'https';

const BLOCKED_OUTBOUND_HEADERS = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'x-api-key',
  'x-auth-token',
]);

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '0.0.0.0' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local')
  );
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === '::1' || normalized === '127.0.0.1') return true;
  if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  const parts = normalized.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 0
  );
}

async function assertPublicDestination(hostname: string): Promise<{ error: string | null, ip: string | null }> {
  if (isBlockedHostname(hostname)) {
    return { error: 'Blocked local hostname', ip: null };
  }

  try {
    const dns = await import('dns/promises');
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0) return { error: 'DNS lookup returned no addresses', ip: null };
    if (addresses.some((entry) => isPrivateIp(entry.address))) {
      return { error: 'Blocked private network destination', ip: null };
    }
    const safeIp = addresses[0].address;
    const formattedIp = safeIp.includes(':') ? `[${safeIp}]` : safeIp;
    return { error: null, ip: formattedIp };
  } catch {
    return { error: 'DNS lookup failed', ip: null };
  }
}

async function safeFetch(urlObj: URL, options: any, ip: string): Promise<{ text: string, status: number, statusText: string, headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    const reqOptions: http.RequestOptions = {
      hostname: ip,
      port: urlObj.port ? parseInt(urlObj.port, 10) : (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method,
      headers: options.headers,
      timeout: options.timeout,
    };
    
    if (isHttps) {
      (reqOptions as https.RequestOptions).servername = urlObj.hostname;
    }

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
        if (data.length > 50000) {
          req.destroy();
          resolve({ text: data.slice(0, 50000) + '\n...[Truncated for length]', status: res.statusCode || 200, statusText: res.statusMessage || 'OK', headers: res.headers });
        }
      });
      res.on('end', () => resolve({ text: data, status: res.statusCode || 200, statusText: res.statusMessage || 'OK', headers: res.headers }));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (BLOCKED_OUTBOUND_HEADERS.has(key.toLowerCase())) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

// ─── Input Schema ────────────────────────────────────────────

const HTTP_REQUEST_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      description: 'The URL to request',
    },
    method: {
      type: 'string',
      enum: ['GET', 'POST'],
      description: 'HTTP method (default: GET)',
    },
    headers: {
      type: 'object',
      description: 'Optional request headers',
    },
    body: {
      type: 'string',
      description: 'Optional request body (for POST)',
    },
    timeout_ms: {
      type: 'number',
      description: 'Request timeout in milliseconds (default: 10000, max: 30000)',
    },
  },
  required: ['url'],
};

// ─── HTTP Tool Implementation ────────────────────────────────

export const httpTool: ITool = {
  id: 'http_request',
  name: 'HTTP Request',
  description:
    'Make HTTP requests to fetch web content. Supports GET and POST. Returns response body as text.',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: HTTP_REQUEST_SCHEMA,

  functionDefinition: {
    name: 'http_request',
    description:
      'Make an HTTP request to a URL. Use GET to fetch content, POST to send data. Returns the response body.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to request',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST'],
          description: 'HTTP method (default: GET)',
        },
        headers: {
          type: 'object',
          description: 'Optional request headers',
        },
        body: {
          type: 'string',
          description: 'Optional request body (for POST)',
        },
        timeout_ms: {
          type: 'number',
          description: 'Request timeout in ms (default: 10000, max: 30000)',
        },
      },
      required: ['url'],
    },
  },

  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { url, method, headers, body, timeout_ms } = context.args as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeout_ms?: number;
    };

    const startTime = Date.now();

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Invalid URL: ${url}`,
        error: 'Invalid URL',
        durationMs: Date.now() - startTime,
      };
    }

    // Security: only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Unsupported protocol: ${parsedUrl.protocol}. Only http and https are allowed.`,
        error: 'Unsupported protocol',
        durationMs: Date.now() - startTime,
      };
    }

    if (parsedUrl.username || parsedUrl.password) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: 'URL credentials are not allowed.',
        error: 'URL credentials are not allowed',
        durationMs: Date.now() - startTime,
      };
    }

    const destinationCheck = await assertPublicDestination(parsedUrl.hostname);
    if (destinationCheck.error) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Access denied: ${destinationCheck.error}`,
        error: destinationCheck.error,
        durationMs: Date.now() - startTime,
      };
    }

    const httpMethod = (method || 'GET').toUpperCase();
    if (!['GET', 'POST'].includes(httpMethod)) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Unsupported method: ${httpMethod}. Only GET and POST are allowed.`,
        error: 'Unsupported method',
        durationMs: Date.now() - startTime,
      };
    }
    const timeoutMs = Math.min(timeout_ms || 10000, 30000);
    const sanitizedHeaders = sanitizeHeaders(headers);

    try {
      const fetchOptions: any = {
        method: httpMethod,
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'AgentOS/1.0',
          'Host': parsedUrl.hostname,
          ...sanitizedHeaders,
        },
      };

      if (httpMethod === 'POST' && body) {
        fetchOptions.body = body;
        if (!sanitizedHeaders['Content-Type']) {
          fetchOptions.headers['Content-Type'] = 'application/json';
        }
      }

      const response = await safeFetch(parsedUrl, fetchOptions, destinationCheck.ip!);
      const durationMs = Date.now() - startTime;

      // Truncate very long responses
      const maxContentLength = 5000;
      let content = response.text;
      const truncated = content.length > maxContentLength;
      if (truncated) {
        content = content.substring(0, maxContentLength) + '\n...[Truncated for length]';
      }

      const isOk = response.status >= 200 && response.status < 300;

      return {
        success: isOk,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `HTTP ${httpMethod} ${url} → ${response.status} ${response.statusText}\n\n${content}`,
        durationMs,
        metadata: {
          statusCode: response.status,
          contentType: response.headers['content-type'],
          contentLength: response.text.length,
          truncated,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          toolCallId: context.toolCallId,
          functionName: context.functionName,
          content: `Request timed out after ${timeoutMs}ms: ${url}`,
          error: 'Timeout',
          durationMs,
        };
      }

      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      };
    }
  },
};
