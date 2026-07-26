import { AntigravityWorkerAdapter } from '../adapters/antigravity-cli';
import { WorkerWorkspaceManager } from '../workspace';
import * as fs from 'fs';
import * as path from 'path';

async function runE2ETest() {
  console.log('=== STARTING ANTIGRAVITY REAL E2E TEST ===');

  const adapter = new AntigravityWorkerAdapter();
  const manager = new WorkerWorkspaceManager();

  // 1. Health check & auth status
  const health = await adapter.healthCheck();
  console.log('Health check status:', health.status, 'version:', health.version);
  if (health.status !== 'ONLINE') {
    throw new Error(`ANTIGRAVITY_E2E_FAILED: CLI not online (status=${health.status}, err=${health.errorMessage})`);
  }

  // 2. Setup isolated workspace
  const taskId = 'task-e2e-sum';
  const runId = `run-e2e-${Date.now()}`;
  const projectId = 'phase05-e2e';
  const workspaceRoot = manager.getAntigravityWorkspacePath(projectId, taskId, runId);

  const taskPayload = {
    taskId,
    runId,
    projectId,
    projectRoot: workspaceRoot,
    instructions: 'Create pure addition function in src/sum.ts and unit test in src/sum.test.ts',
    files: []
  };

  const setupPath = manager.setupAntigravityWorkspace(taskPayload);
  console.log('Isolated workspace initialized at:', setupPath);

  // Check package files created
  const requiredPackageFiles = ['worker-task.json', 'prompt.md', 'expected-output.json', 'manifest.json', 'fingerprint'];
  for (const f of requiredPackageFiles) {
    if (!fs.existsSync(path.join(setupPath, f))) {
      throw new Error(`Package file missing: ${f}`);
    }
  }
  console.log('Package files verified successfully.');

  // 3. Prepare Execution Plan
  const plan = await adapter.prepareExecutionPlan(taskPayload, setupPath);
  console.log('Execution Plan prepared with command:', plan.command, 'args:', plan.args, 'shell:', plan.shell);

  if (plan.shell !== false) {
    throw new Error('Security Violation: shell must be false!');
  }

  // 4. Execute Task
  console.log('Executing task via agy...');
  const result = await adapter.execute(taskPayload, setupPath, { timeoutMs: 30000 });
  console.log('Execution completed with result:', {
    workerId: result.workerId,
    status: result.status,
    exitCode: result.exitCode,
    changedFiles: result.changedFiles,
    createdFiles: result.createdFiles,
    durationMs: result.durationMs
  });

  if (result.status !== 'SUCCESS' || result.exitCode !== 0) {
    throw new Error(`E2E task failed: status=${result.status}, exitCode=${result.exitCode}`);
  }

  // 5. Verify created files in workspace
  const sumFile = path.join(setupPath, 'src', 'sum.ts');
  const testFile = path.join(setupPath, 'src', 'sum.test.ts');

  if (!fs.existsSync(sumFile)) {
    throw new Error('Expected created file missing: src/sum.ts');
  }
  if (!fs.existsSync(testFile)) {
    throw new Error('Expected created file missing: src/sum.test.ts');
  }

  const sumContent = fs.readFileSync(sumFile, 'utf-8');
  console.log('src/sum.ts content:\n', sumContent);

  // 6. Verify main repo untouched
  const mainRepoSum = path.join('D:\\АГЕНТ\\ДЖАРВИС', 'src', 'sum.ts');
  if (fs.existsSync(mainRepoSum)) {
    throw new Error('Security Violation: File created in main repository!');
  }

  console.log('=== ANTIGRAVITY REAL E2E TEST PASSED ===');
}

runE2ETest().catch((err) => {
  console.error('E2E TEST ERROR:', err);
  process.exit(1);
});
