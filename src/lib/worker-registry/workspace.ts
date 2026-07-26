import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TaskPayload } from './types';

export const FORBIDDEN_COPY_PATTERNS = [
  /\.env.*/i,
  /credentials/i,
  /auth_storage/i,
  /\.gemini/i,
  /browser_profiles/i,
  /id_rsa/i,
  /id_ed25519/i,
  /supabase_secret/i,
  /oauth_creds\.json/i,
  /google_accounts\.json/i
];

export class WorkerWorkspaceManager {
  private baseDir = 'D:\\JARVIS_WORKSPACES';

  constructor() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public getAntigravityWorkspacePath(projectId: string, taskId: string, runId: string): string {
    return path.join(this.baseDir, projectId, taskId, runId, 'antigravity');
  }

  public setupAntigravityWorkspace(task: TaskPayload): string {
    const projectId = task.projectId || 'phase05-e2e';
    const taskId = task.taskId || 'task-1';
    const runId = task.runId || `run-${Date.now()}`;

    const workspaceRoot = this.getAntigravityWorkspacePath(projectId, taskId, runId);

    // Escape prevention check
    const normalized = path.normalize(workspaceRoot).toLowerCase();
    if (normalized.startsWith(path.normalize('D:\\АГЕНТ\\ДЖАРВИС').toLowerCase())) {
      throw new Error('Security Violation: Antigravity workspace cannot be created inside main repository.');
    }

    if (!fs.existsSync(workspaceRoot)) {
      fs.mkdirSync(workspaceRoot, { recursive: true });
    }

    // Prepare package files
    const promptMdPath = path.join(workspaceRoot, 'prompt.md');
    fs.writeFileSync(promptMdPath, task.instructions, 'utf-8');

    const workerTaskPath = path.join(workspaceRoot, 'worker-task.json');
    const taskPackage = {
      taskId: task.taskId,
      runId: task.runId,
      projectId,
      instructions: task.instructions,
      files: task.files || [],
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(workerTaskPath, JSON.stringify(taskPackage, null, 2), 'utf-8');

    const expectedOutputPath = path.join(workspaceRoot, 'expected-output.json');
    fs.writeFileSync(expectedOutputPath, JSON.stringify({
      patchFile: 'result.patch',
      artifacts: []
    }, null, 2), 'utf-8');

    const manifestPath = path.join(workspaceRoot, 'manifest.json');
    const manifest = {
      workspaceType: 'ANTIGRAVITY_ISOLATED',
      workerId: 'ANTIGRAVITY_CLI',
      allowedFiles: ['src/sum.ts', 'src/sum.test.ts', 'result.patch'],
      forbiddenPatterns: ['.env*', 'credentials*', 'auth*']
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    const fingerprintContent = `${task.taskId}:${task.runId}:${task.instructions}`;
    const fingerprint = crypto.createHash('sha256').update(fingerprintContent).digest('hex');
    const fingerprintPath = path.join(workspaceRoot, 'fingerprint');
    fs.writeFileSync(fingerprintPath, fingerprint, 'utf-8');

    return workspaceRoot;
  }

  public isForbiddenFile(fileName: string): boolean {
    return FORBIDDEN_COPY_PATTERNS.some(pattern => pattern.test(fileName));
  }

  public async cleanup(workspaceRoot: string): Promise<void> {
    if (fs.existsSync(workspaceRoot)) {
      // Retain or delete as per lifecycle policy
    }
  }
}
