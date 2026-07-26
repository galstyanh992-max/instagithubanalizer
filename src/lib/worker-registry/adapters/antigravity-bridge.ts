import { WorkerAdapter, WorkerHealth, WorkerCapabilities, TaskPayload, ExecutionPlan, NormalizedResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class AntigravityPilotAdapter implements WorkerAdapter {
  id = 'antigravity_pilot';
  displayName = 'Antigravity Manual Bridge';

  async healthCheck(): Promise<WorkerHealth> {
    // Official CLI not found, using Manual Bridge Mode
    return {
      status: 'ONLINE', // Manual bridge is always online
      version: 'bridge-1.0',
      errorMessage: 'NO_CONFIRMED_HEADLESS_CLI - running in MANUAL_BRIDGE mode.'
    };
  }

  async capabilities(): Promise<WorkerCapabilities> {
    return {
      FILES_READ: false,
      FILES_CREATE: false,
      FILES_MODIFY: false,
      ARTIFACT_CREATE: false,
      GIT_READ: false,
      PROCESS_RUN_TESTS: false,
      TASK_PACKAGE_CREATE: true,
      PROMPT_PACKAGE_CREATE: true,
      PATCH_IMPORT: true,
      ARTIFACT_IMPORT: true,
      MANUAL_REVIEW_REQUIRED: true
    };
  }

  async prepareExecutionPlan(task: TaskPayload, workspaceRoot: string): Promise<ExecutionPlan> {
    // Write prompt.md and expected-output.json for manual bridge
    const promptPath = path.join(workspaceRoot, 'prompt.md');
    fs.writeFileSync(promptPath, task.instructions, 'utf-8');

    const expectedPath = path.join(workspaceRoot, 'expected-output.json');
    fs.writeFileSync(expectedPath, JSON.stringify({
      patchFile: 'result.patch',
      artifacts: []
    }, null, 2), 'utf-8');

    return {
      command: 'echo',
      args: ['MANUAL_BRIDGE_READY: Please execute Antigravity Pilot manually in the workspace, then place result.patch.'],
      cwd: workspaceRoot
    };
  }

  async normalizeResult(rawStdout: string, rawStderr: string, exitCode: number, workspaceRoot: string): Promise<NormalizedResult> {
    const patchPath = path.join(workspaceRoot, 'result.patch');
    let patchContent = '';
    
    if (fs.existsSync(patchPath)) {
      patchContent = fs.readFileSync(patchPath, 'utf-8');
    }

    return {
      exitCode,
      stdout: rawStdout,
      stderr: rawStderr,
      patch: {
        diffContent: patchContent,
        changedFiles: [], // Would parse patch to determine files
        securityFlags: ['MANUAL_BRIDGE_UNVERIFIED']
      }
    };
  }
}
