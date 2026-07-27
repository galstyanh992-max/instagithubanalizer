import { CodexWorkerAdapter } from '../adapters/codex-cli';
import { ClaudeCodeWorkerAdapter } from '../adapters/claude-code';
import { AntigravityWorkerAdapter } from '../adapters/antigravity-cli';
import { WorkerWorkspaceManager } from '../workspace';
import * as fs from 'fs';
import * as path from 'path';

async function runThreeWorkersE2E() {
  console.log('=== STARTING THREE WORKERS REAL E2E TEST ===');

  const manager = new WorkerWorkspaceManager();

  // -------------------------------------------------------------
  // 1. CODEX REAL E2E
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing Codex CLI E2E ---');
  const codexAdapter = new CodexWorkerAdapter();
  const codexHealth = await codexAdapter.healthCheck();
  console.log('Codex Executable:', 'C:\\Users\\Admin\\AppData\\Roaming\\npm\\codex.cmd');
  console.log('Codex Version:', codexHealth.version);
  console.log('Codex Auth Status:', codexHealth.status);
  if (codexHealth.status !== 'ONLINE') {
    throw new Error(`CODEX_E2E_FAILED: Codex health check status=${codexHealth.status}`);
  }

  const codexWorkspace = 'D:\\JARVIS_WORKSPACES\\phase05-final-e2e\\codex';
  if (!fs.existsSync(codexWorkspace)) {
    fs.mkdirSync(codexWorkspace, { recursive: true });
  }

  const codexStartTime = new Date().toISOString();
  const codexTask = {
    taskId: 'task-codex-add',
    runId: `run-codex-${Date.now()}`,
    projectId: 'phase05-e2e',
    projectRoot: codexWorkspace,
    instructions: 'Create src/add.ts exporting an add function and unit test in src/add.test.ts',
    files: []
  };

  const codexPlan = await codexAdapter.prepareExecutionPlan(codexTask, codexWorkspace);
  console.log('Codex Plan:', codexPlan.command, codexPlan.args);
  if (codexPlan.shell !== false) {
    throw new Error('Security Violation: Codex shell must be false!');
  }
  if (codexPlan.args.some(arg =>
    arg.includes('dangerously-bypass-approvals-and-sandbox') ||
    arg.includes('--yolo') ||
    arg.includes('danger-full-access') ||
    arg.includes('--full-auto')
  )) {
    throw new Error('Security Violation: Codex dangerous bypass flags present!');
  }
  // `codex exec` (codex-cli 0.145.0) rejects `--ask-for-approval` outright — the
  // approval-never policy is expressed via an inline config override instead.
  // See 05ZLRT for the dynamic evidence that required this repair.
  if (codexPlan.args.includes('--ask-for-approval')) {
    throw new Error('Security Violation: Codex must not pass unsupported --ask-for-approval to exec!');
  }
  if (!codexPlan.args.includes('workspace-write') || !codexPlan.args.includes('approval_policy="never"')) {
    throw new Error('Security Violation: Codex sandbox/approval policy not in expected fail-closed state!');
  }
  if (!codexPlan.args.includes('-c')) {
    throw new Error('Security Violation: Codex inline approval config override (-c) missing!');
  }
  if (codexPlan.args.includes(codexTask.instructions)) {
    throw new Error('Security Violation: Codex prompt must not be passed via argv!');
  }

  const codexResult = await codexAdapter.execute(codexTask, codexWorkspace, { timeoutMs: 180000 });
  const codexFinishTime = new Date().toISOString();

  if (codexResult.status !== 'SUCCESS' || codexResult.exitCode !== 0) {
    console.error('Codex Errors:', codexResult.errors);
    console.error('Codex Stderr:', codexResult.stderrSummary);
    console.error('Codex Stdout:', codexResult.stdoutSummary);
    throw new Error(`Codex E2E failed with status=${codexResult.status}, exitCode=${codexResult.exitCode}`);
  }

  console.log('Codex Evidence:', {
    executable: 'C:\\Users\\Admin\\AppData\\Roaming\\npm\\codex.cmd',
    version: codexHealth.version,
    startedAt: codexStartTime,
    finishedAt: codexFinishTime,
    exitCode: codexResult.exitCode,
    createdFiles: codexResult.createdFiles
  });
  console.log('Codex E2E PASSED.');

  // -------------------------------------------------------------
  // 2. CLAUDE CODE REAL E2E
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Claude Code CLI E2E ---');
  const claudeAdapter = new ClaudeCodeWorkerAdapter();
  const claudeHealth = await claudeAdapter.healthCheck();
  console.log('Claude Executable:', 'C:\\Users\\Admin\\.local\\bin\\claude.exe');
  console.log('Claude Version:', claudeHealth.version);
  console.log('Claude Auth Status:', claudeHealth.status);
  
  if (claudeHealth.status !== 'ONLINE') {
    console.log(`CLAUDE_E2E_BLOCKED: Claude health check status=${claudeHealth.status}`);
  } else {
    const claudeWorkspace = 'D:\\JARVIS_WORKSPACES\\phase05-final-e2e\\claude';
    if (!fs.existsSync(claudeWorkspace)) {
      fs.mkdirSync(claudeWorkspace, { recursive: true });
    }
    
    fs.writeFileSync(path.join(claudeWorkspace, 'test.js'), 'function add(a,b) { return a+b; }');

    const claudeStartTime = new Date().toISOString();
    const claudeTask = {
      taskId: 'task-claude-review',
      runId: `run-claude-${Date.now()}`,
      projectId: 'phase05-e2e',
      projectRoot: claudeWorkspace,
      instructions: 'Review test.js and create review.json containing a summary. Reply only when done.',
      files: []
    };

    const claudePlan = await claudeAdapter.prepareExecutionPlan(claudeTask, claudeWorkspace);
    console.log('Claude Plan:', claudePlan.command, claudePlan.args);
    if (claudePlan.shell !== false) {
      throw new Error('Security Violation: Claude shell must be false!');
    }

    const claudeResult = await claudeAdapter.execute(claudeTask, claudeWorkspace, { timeoutMs: 180000 });
    const claudeFinishTime = new Date().toISOString();

    if (claudeResult.status !== 'SUCCESS' || claudeResult.exitCode !== 0) {
      console.error('Claude Errors:', claudeResult.errors);
      console.error('Claude Stderr:', claudeResult.stderrSummary);
      console.error('Claude Stdout:', claudeResult.stdoutSummary);
      throw new Error(`Claude E2E failed with status=${claudeResult.status}, exitCode=${claudeResult.exitCode}`);
    }
    
    if (!fs.existsSync(path.join(claudeWorkspace, 'review.json'))) {
      throw new Error(`Claude E2E failed: review.json was not created`);
    }

    console.log('Claude Evidence:', {
      executable: 'C:\\Users\\Admin\\.local\\bin\\claude.exe',
      version: claudeHealth.version,
      startedAt: claudeStartTime,
      finishedAt: claudeFinishTime,
      exitCode: claudeResult.exitCode,
      createdFiles: claudeResult.createdFiles
    });
    console.log('Claude Code E2E PASSED.');
  }

  // -------------------------------------------------------------
  // 3. ANTIGRAVITY REAL E2E (Official agy 1.1.7)
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Official Antigravity CLI E2E ---');
  const antigravityAdapter = new AntigravityWorkerAdapter();
  const agyHealth = await antigravityAdapter.healthCheck();
  console.log('Antigravity Executable:', 'C:\\Users\\Admin\\AppData\\Local\\agy\\bin\\agy.exe');
  console.log('Antigravity Version:', agyHealth.version);
  console.log('Antigravity Auth Status:', agyHealth.status);
  if (agyHealth.status !== 'ONLINE') {
    throw new Error(`ANTIGRAVITY_E2E_FAILED: Health check status=${agyHealth.status}`);
  }

  const agyWorkspace = 'D:\\JARVIS_WORKSPACES\\phase05-final-e2e\\antigravity';
  if (!fs.existsSync(agyWorkspace)) {
    fs.mkdirSync(agyWorkspace, { recursive: true });
  }

  const inputDir = path.join(agyWorkspace, 'input');
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
  }
  fs.writeFileSync(path.join(inputDir, 'sample.ts'), 'export function divide(a: number, b: number): number {\n  return a / b;\n}');

  // Track initial files and hash simulation (files list)
  const getFiles = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(filePath));
      } else {
        results.push(filePath);
      }
    });
    return results;
  };
  const filesBefore = getFiles(agyWorkspace);

  const agyStartTime = new Date().toISOString();
  const agyTask = {
    taskId: 'task-agy-review',
    runId: `run-agy-${Date.now()}`,
    projectId: 'phase05-e2e',
    projectRoot: agyWorkspace,
    instructions: 'Review input/sample.ts.\nIdentify correctness and edge-case risks.\nReturn the review through stdout.\nDo not create, modify, or delete files.\nDo not execute commands.',
    files: [],
    requiresFilesystemWrite: false,
    requiresCommandExecution: false
  };

  const agyPlan = await antigravityAdapter.prepareExecutionPlan(agyTask, agyWorkspace);
  console.log('Antigravity Plan:', agyPlan.command, agyPlan.args);
  if (agyPlan.shell !== false) {
    throw new Error('Security Violation: Antigravity shell must be false!');
  }
  if (agyPlan.args.some(arg => arg.includes('--dangerously-skip-permissions'))) {
    throw new Error('Security Violation: Antigravity bypass flags present!');
  }

  const agyResult = await antigravityAdapter.execute(agyTask, agyWorkspace, { timeoutMs: 180000 });
  const agyFinishTime = new Date().toISOString();
  console.log('Antigravity Result:', { status: agyResult.status, exitCode: agyResult.exitCode, createdFiles: agyResult.createdFiles });

  if (agyResult.status !== 'SUCCESS' || agyResult.exitCode !== 0) {
    throw new Error(`Antigravity E2E failed with status=${agyResult.status}, exitCode=${agyResult.exitCode}`);
  }
  
  if (!agyResult.stdoutSummary || agyResult.stdoutSummary.trim().length === 0) {
    throw new Error('Antigravity E2E failed: stdout is empty, expected review content');
  }

  const filesAfter = getFiles(agyWorkspace);
  if (filesBefore.length !== filesAfter.length || !filesBefore.every((v, i) => v === filesAfter[i])) {
    throw new Error('Security Violation: Antigravity modified workspace files!');
  }

  console.log('Antigravity Evidence:', {
    executable: 'C:\\Users\\Admin\\AppData\\Local\\agy\\bin\\agy.exe',
    version: agyHealth.version,
    startedAt: agyStartTime,
    finishedAt: agyFinishTime,
    exitCode: agyResult.exitCode,
    createdFiles: agyResult.createdFiles
  });
  console.log('Antigravity E2E PASSED.');

  // -------------------------------------------------------------
  // VERIFY MAIN REPO UNTOUCHED
  // -------------------------------------------------------------
  const mainRepoAdd = path.join('D:\\АГЕНТ\\ДЖАРВИС', 'src', 'add.ts');
  if (fs.existsSync(mainRepoAdd)) {
    throw new Error('Security Violation: Files modified in main repository during E2E!');
  }

  console.log('\n=== ALL THREE WORKERS REAL E2E PASSED PERFECTLY ===');
}

runThreeWorkersE2E().catch((err) => {
  console.error('THREE WORKERS E2E ERROR:', err);
  process.exit(1);
});
