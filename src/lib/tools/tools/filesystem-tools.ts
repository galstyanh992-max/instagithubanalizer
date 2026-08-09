import type { ITool, ToolExecutionContext, ToolExecutionResult } from '../types';
import fs from 'fs/promises';
import path from 'path';

// Helper to safely resolve and check paths
async function safeResolve(targetPath: string): Promise<string> {
  const projectRoot = process.env.AGENT_WORKSPACE_ROOT 
    ? path.resolve(process.env.AGENT_WORKSPACE_ROOT) 
    : path.resolve(process.cwd());
    
  const resolved = path.isAbsolute(targetPath) ? path.resolve(targetPath) : path.resolve(projectRoot, targetPath);
  const canonicalRoot = await fs.realpath(projectRoot);
  let existingParent = resolved;
  while (existingParent !== path.dirname(existingParent)) {
    try { await fs.access(existingParent); break; } catch { existingParent = path.dirname(existingParent); }
  }
  const canonicalParent = await fs.realpath(existingParent);
  const canonicalResolved = path.resolve(canonicalParent, path.relative(existingParent, resolved));
  const relative = path.relative(canonicalRoot, canonicalResolved);
  
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path traversal detected: Access denied outside workspace root.');
  }

  // Denylist checks
  const sensitivePaths = ['.git', 'node_modules', '.env'];
  if (sensitivePaths.some(p => relative === p || relative.startsWith(p + path.sep) || relative.startsWith(p + '/'))) {
    throw new Error(`Governance violation: Access to sensitive path '${relative}' is explicitly denied.`);
  }

  return canonicalResolved;
}

export const filesystemReadTool: ITool = {
  id: 'filesystem.read',
  name: 'Filesystem Read',
  description: 'Read a file from the filesystem.',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to read' },
    },
    required: ['path'],
  },
  functionDefinition: {
    name: 'filesystem.read',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const start = Date.now();
    try {
      const target = await safeResolve(String(context.args.path));
      const content = await fs.readFile(target, 'utf-8');
      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: 'filesystem.read',
        content,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'filesystem.read',
        content: e.message,
        error: e.message,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const filesystemWriteTool: ITool = {
  id: 'filesystem.write',
  name: 'Filesystem Write',
  description: 'Write content to a file in the filesystem.',
  version: '1.0.0',
  requiredPermission: 'write',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to write' },
      content: { type: 'string', description: 'File content' },
    },
    required: ['path', 'content'],
  },
  functionDefinition: {
    name: 'filesystem.write',
    description: 'Write content to a file',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' }, content: { type: 'string' } },
      required: ['path', 'content'],
    },
  },
  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const start = Date.now();
    try {
      const target = await safeResolve(String(context.args.path));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, String(context.args.content), 'utf-8');
      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: 'filesystem.write',
        content: `Successfully wrote to ${context.args.path}`,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'filesystem.write',
        content: e.message,
        error: e.message,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const filesystemListTool: ITool = {
  id: 'filesystem.list',
  name: 'Filesystem List',
  description: 'List contents of a directory.',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Directory path' },
    },
    required: ['path'],
  },
  functionDefinition: {
    name: 'filesystem.list',
    description: 'List contents of a directory',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const start = Date.now();
    try {
      const target = await safeResolve(String(context.args.path));
      const files = await fs.readdir(target);
      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: 'filesystem.list',
        content: files.join('\n'),
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'filesystem.list',
        content: e.message,
        error: e.message,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const filesystemSearchTool: ITool = {
  id: 'filesystem.search',
  name: 'Filesystem Search',
  description: 'Search for text across files within the allowed workspace.',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Text to search for' },
      dir: { type: 'string', description: 'Directory to search within (relative to workspace root)' }
    },
    required: ['query'],
  },
  functionDefinition: {
    name: 'filesystem.search',
    description: 'Search files for text',
    parameters: {
      type: 'object',
      properties: { 
        query: { type: 'string' },
        dir: { type: 'string' } 
      },
      required: ['query'],
    },
  },
  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const start = Date.now();
    try {
      const searchDir = context.args.dir ? String(context.args.dir) : '.';
      const target = await safeResolve(searchDir);
      const query = String(context.args.query);
      
      const MAX_RESULTS = 50;
      const MAX_SCANNED_FILES = 5000;
      const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

      const results: { file: string; lineContent?: string }[] = [];
      let scannedFiles = 0;
      
      const EXTENDED_DENYLIST = [
        '.git', 'node_modules', '.env', 
        'secrets.json', 'credentials.yaml', 'keys',
        'config/secrets'
      ];

      // Very rudimentary secret detection heuristic (to prevent leakage in snippets)
      const isSecretSnippet = (line: string) => {
        const lower = line.toLowerCase();
        if (lower.includes('password=') || lower.includes('api_key=') || lower.includes('token=') || lower.includes('secret=')) {
          return true;
        }
        return false;
      };

      async function walk(dir: string) {
        if (results.length >= MAX_RESULTS || scannedFiles >= MAX_SCANNED_FILES) return;
        
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          if (results.length >= MAX_RESULTS || scannedFiles >= MAX_SCANNED_FILES) return;
          
          const fullPath = path.join(dir, file.name);
          
          // Enhanced Denylist
          if (EXTENDED_DENYLIST.some(d => file.name === d || fullPath.includes(`/${d}/`))) continue;
          
          if (file.isDirectory()) {
            await walk(fullPath);
          } else {
            scannedFiles++;
            try {
              const stat = await fs.stat(fullPath);
              if (stat.size > MAX_FILE_SIZE_BYTES) continue; // Skip oversized files

              const content = await fs.readFile(fullPath, 'utf-8');
              if (content.includes(query)) {
                // Find snippet, prevent secret leakage
                const lines = content.split('\n');
                const matchingLine = lines.find(l => l.includes(query)) || '';
                
                let snippet = matchingLine.trim();
                if (isSecretSnippet(snippet)) {
                  snippet = '[REDACTED DUE TO POTENTIAL SECRET MATCH]';
                }

                results.push({
                  file: path.relative(target, fullPath),
                  lineContent: snippet.substring(0, 200) // Truncate long lines
                });
              }
            } catch {
              // Ignore binary or unreadable files
            }
          }
        }
      }
      
      await walk(target);

      const responsePayload = {
        meta: {
          scannedFiles,
          matches: results.length,
          truncated: results.length >= MAX_RESULTS || scannedFiles >= MAX_SCANNED_FILES
        },
        results
      };

      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: 'filesystem.search',
        content: JSON.stringify(responsePayload, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: 'filesystem.search',
        content: e.message,
        error: e.message,
        durationMs: Date.now() - start,
      };
    }
  },
};
