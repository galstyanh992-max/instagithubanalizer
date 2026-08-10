#!/usr/bin/env node
// JARVIS runtime-boundary guard.
//
// Purpose: detect source files that would be bundled into the Next.js app
// (and therefore could ship to Vercel) but reach directly into local-only
// execution: child_process, local Ollama, Desktop Commander, Docker, raw
// Windows filesystem paths, PowerShell, local MCP client transports.
//
// This is a STATIC DETECTOR, not an enforced build failure. Flipping every
// flagged file to route through the daemon/task system instead of calling
// local resources in-process is a larger follow-on migration (see
// docs/jarvis/remote-architecture.md). Running this script only reports
// what exists today so the count is honest and trackable release over
// release; it does not silently "fix" anything.
//
// Usage: node scripts/check-runtime-boundary.mjs [--json]

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

// Directories that are genuinely local-only by design and are expected to
// contain these patterns — not part of the Vercel-deployed app bundle.
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'src/generated',
  'src/daemon', // local worker: intentionally local-only, separate entrypoint
  'src/local-runtime', // relocated local-only implementation modules; see src/local-runtime/README.md
  'vendor',
  'tests',
  '__tests__',
]);

// Scan the parts of the tree that DO get bundled by `next build` if deployed
// to Vercel: the Next.js app itself (routes, pages, server components) and
// the shared library code it imports.
const SCAN_ROOTS = ['src/app', 'src/components', 'src/lib', 'src/services', 'src/hooks', 'src/middleware.ts'];

const RULES = [
  // Also matches the `node:child_process` specifier and `execFileAsync(`/
  // `spawnSync(` — the promisify(execFile) convention used throughout this
  // codebase, which the bare `execFile\(` alternative alone does not catch
  // (no literal "execFile(" appears at the call site). Verified 2026-08-10
  // against a real gap: docker-service-manager.ts and
  // external-tool-adapters.ts both used `promisify(execFile)` +
  // `execFileAsync(...)` and were invisible to the original pattern.
  { id: 'CHILD_PROCESS', pattern: /\b(require\(['"](?:node:)?child_process['"]\)|from\s+['"](?:node:)?child_process['"]|\bexecSync\(|\bspawn\(|\bspawnSync\(|\bexecFile\(|\bexecFileAsync\()/ },
  { id: 'LOCAL_OLLAMA', pattern: /127\.0\.0\.1:11434|localhost:11434/ },
  // Restricted to plausible drive letters with a non-word char (or string
  // start/quote) immediately before them, so prose containing "...ry:\n"
  // (an escaped newline, not a path) doesn't false-positive.
  { id: 'WINDOWS_ABS_PATH', pattern: /(?<![A-Za-zА-Яа-я0-9_])[C-Ec-e]:\\{1,2}/ },
  { id: 'DESKTOP_COMMANDER', pattern: /desktop-?commander/i },
  { id: 'DOCKER_SOCKET', pattern: /\/var\/run\/docker\.sock|dockerode/i },
  { id: 'POWERSHELL', pattern: /powershell(\.exe)?/i },
];

// Narrow, individually-justified false-positive exclusions. Each entry is a
// specific file:line:rule triple that was manually verified to NOT reach a
// local-only resource — it's a string literal (UI text, regex pattern, form
// default, catalog label, config default, or a diagnostic echo of a value
// obtained elsewhere) that merely contains text matching a RULES pattern.
// This is not a way to silence real violations: every entry must name the
// exact line and explain why it's inert. Verified 2026-08-10.
const KNOWN_FALSE_POSITIVES = new Set([
  // Form input placeholder — never read or written to a filesystem.
  'src/app/projects/page.tsx:210:WINDOWS_ABS_PATH',
  // Client component ("use client"): shortens an already-fetched cwd string
  // for display via .startsWith() — a string compare, not a filesystem call.
  'src/components/os/TerminalPanel.tsx:18:WINDOWS_ABS_PATH',
  // Client component: static info-line text naming the shell types the
  // (separately gated) terminal API supports. No execution happens here.
  'src/components/os/TerminalPanel.tsx:39:POWERSHELL',
  // Client component: React useState default value shown in a settings
  // form field before the user edits it. No filesystem access.
  'src/components/settings/codex-subscription-card.tsx:42:WINDOWS_ABS_PATH',
  // Zod schema default value (a string) for an env var; reading the env var
  // is not a filesystem/process access by itself.
  'src/lib/env.ts:99:WINDOWS_ABS_PATH',
  // Discovery catalog label describing a known local MCP server for the
  // (Tier 4 deferred) platform catalog — descriptive metadata, not an
  // invocation of Desktop Commander.
  'src/lib/jarvis/platform/phase-a-catalog.ts:48:DESKTOP_COMMANDER',
  // Regex literal used to DETECT risky remote-script-execution patterns in
  // untrusted repository content during security curation — the word
  // appears inside a pattern being matched against, never executed.
  'src/lib/jarvis/capability-intelligence/curator.ts:19:POWERSHELL',
  // Regex literal listing OS system directories to BLOCK path access to —
  // the literal path appears inside a validation pattern, not as a path
  // actually being read or written.
  'src/lib/local-operator/workspace-policy.ts:16:WINDOWS_ABS_PATH',
]);
// Note: the jarvis/ollama/route.ts:25 entry that used to be here was
// removed 2026-08-10 (Runtime Boundary Finalization Pass) — the route no
// longer contains the literal at all. It now reads the endpoint from
// ollamaAdapter.configuration() (a lazy proxy over the relocated real
// adapter in src/local-runtime/platform/ollama-adapter.ts) instead of
// duplicating the string, so this is a genuine fix, not an exclusion.

function isExcluded(relPath) {
  const norm = relPath.split('\\').join('/');
  const segments = norm.split('/');
  for (const dir of EXCLUDED_DIRS) {
    // Path-prefix match (e.g. "src/generated", "src/daemon" — whole subtrees
    // that are legitimately local-only or generated, from the repo root).
    if (norm === dir || norm.startsWith(dir + '/')) return true;
    // Path-segment match (e.g. a "__tests__" or "tests" folder nested
    // anywhere — test harnesses are never part of the `next build` bundle).
    if (!dir.includes('/') && segments.includes(dir)) return true;
  }
  return false;
}

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if (isExcluded(rel)) continue;
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry) && !/\.(test|spec)\.(ts|tsx|js|mjs)$/.test(entry)) {
      // Test files are never part of a `next build` production bundle.
      files.push(full);
    }
  }
  return files;
}

function scanFile(file) {
  const rel = relative(ROOT, file);
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const hits = [];
  lines.forEach((line, idx) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        const key = `${rel.split('\\').join('/')}:${idx + 1}:${rule.id}`;
        if (KNOWN_FALSE_POSITIVES.has(key)) continue;
        hits.push({ file: rel, line: idx + 1, rule: rule.id, snippet: line.trim().slice(0, 160) });
      }
    }
  });
  return hits;
}

const files = [];
for (const root of SCAN_ROOTS) {
  const full = join(ROOT, root);
  try {
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (st.isFile()) files.push(full);
  } catch {
    // root doesn't exist in this checkout; skip
  }
}

const violations = files.flatMap(scanFile);

const asJson = process.argv.includes('--json');
if (asJson) {
  console.log(JSON.stringify({ count: violations.length, violations }, null, 2));
} else {
  console.log(`JARVIS runtime-boundary scan: ${files.length} files scanned in ${SCAN_ROOTS.join(', ')}`);
  console.log(`VERCEL_LOCAL_IMPORT_VIOLATIONS=${violations.length}  (+${KNOWN_FALSE_POSITIVES.size} documented false-positive exclusions)`);
  if (violations.length) {
    console.log('');
    for (const v of violations) {
      console.log(`  [${v.rule}] ${v.file}:${v.line}  ${v.snippet}`);
    }
    console.log('');
    console.log('These files reach a local-only resource directly from code that Next.js');
    console.log('would bundle for Vercel. They must run only when JARVIS_RUNTIME_ROLE !==');
    console.log('"web-control-plane", or be moved behind the daemon task/capability system.');
    console.log('See docs/jarvis/remote-architecture.md.');
  }
}

// Detection tool: report only, do not fail CI by default. A stricter mode
// can be wired in later once the flagged call sites are migrated behind
// JARVIS_RUNTIME_ROLE guards.
process.exit(0);
