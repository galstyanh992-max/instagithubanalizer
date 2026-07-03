// src/lib/preview/types.ts

export type PreviewStatus =
  | 'idle'        // not started
  | 'starting'    // process spawned, waiting for ready signal
  | 'running'     // confirmed ready (port open)
  | 'stopping'    // SIGTERM sent
  | 'stopped'     // process exited cleanly
  | 'error'       // process exited with non-zero code or failed to start
  | 'port_in_use' // could not bind port

export interface PreviewLogEntry {
  ts: number;       // Date.now()
  stream: 'stdout' | 'stderr';
  line: string;
}

export interface PreviewState {
  status: PreviewStatus;
  port: number;
  pid: number | null;
  startedAt: number | null;
  stoppedAt: number | null;
  lastError: string | null;
  previewDir: string | null;  // absolute path to the project being previewed
  url: string | null;         // http://localhost:{port}
}

export interface StartPreviewInput {
  /** Absolute path to the project to preview. Must be under WORKSPACE_ROOT. */
  projectPath: string;
  /** Port to run on. Defaults to 3100. */
  port?: number;
  /** Optional env overrides (whitelisted keys only). */
  env?: Record<string, string>;
}

export interface PreviewApiResponse {
  ok: boolean;
  state: PreviewState;
  error?: string;
}

export interface PreviewLogsResponse {
  logs: PreviewLogEntry[];
  total: number;
}
