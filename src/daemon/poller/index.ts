import * as path from 'path';
import { DaemonConfig } from '../config';
import { GatewayClient } from '../api/client';
import { MockExecutors } from '../executors';
import { publishRegistryProjectionIfChanged } from '../registry-projection';

export class TaskPoller {
  private isRunning: boolean = false;
  private abortController: AbortController = new AbortController();
  
  public async start() {
    this.isRunning = true;
    console.log(`[Daemon] Polling started. Interval: ${DaemonConfig.POLL_INTERVAL_MS}ms`);

    let consecutiveErrors = 0;

    // Heartbeat loop. Kept intentionally light (device state + lastSeen
    // only, per src/app/api/daemon/heartbeat/route.ts). The registry
    // projection is publish-on-change, not sent every tick — most ticks are
    // a no-op revision comparison against the last snapshot this process
    // published, so it does not turn the heartbeat into a full-blast sync.
    const heartbeatTimer = setInterval(async () => {
      try {
        await GatewayClient.heartbeat();
      } catch (e: any) {
        console.warn(`[Daemon] Heartbeat failed: ${e.message}`);
      }

      try {
        const result = await publishRegistryProjectionIfChanged(false);
        if (result.published) {
          console.log(`[Daemon] Registry projection published (revision ${result.revision.slice(0, 12)}, ${result.programCount} programs, ${result.capabilityCount} capabilities).`);
        }
      } catch (e: any) {
        console.warn(`[Daemon] Registry projection publish failed: ${e.message}`);
      }
    }, DaemonConfig.HEARTBEAT_INTERVAL_MS);

    // Polling loop
    while (this.isRunning && !this.abortController.signal.aborted) {
      try {
        const { task, plan } = await GatewayClient.claimTask();

        if (task) {
          console.log(`[Daemon] Claimed task ${task.id} (${task.title})`);
          await this.executeTask(task, plan);
          consecutiveErrors = 0; // reset on success
        } else {
          // No task, backoff normally
          await this.sleep(DaemonConfig.POLL_INTERVAL_MS);
        }
      } catch (e: any) {
        consecutiveErrors++;
        const backoffMs = Math.min(DaemonConfig.POLL_INTERVAL_MS * Math.pow(2, consecutiveErrors), 60000);
        console.error(`[Daemon] Polling error: ${e.message}. Retrying in ${backoffMs}ms...`);
        await this.sleep(backoffMs);
      }
    }

    clearInterval(heartbeatTimer);
    console.log('[Daemon] Polling stopped gracefully.');
  }

  public stop() {
    console.log('[Daemon] Shutdown requested...');
    this.isRunning = false;
    this.abortController.abort();
  }

  private async executeTask(task: any, plan?: any) {
    try {
      await GatewayClient.reportEvent(task.id, 'TASK_STARTED', { message: 'Daemon is executing task.' });

      if (plan) {
        await this.executePlan(task.id, plan);
        return;
      }

      // Determine mock command
      let result;
      const cmd = task.title; 
      
      if (cmd === 'NOOP') {
        result = MockExecutors.executeNoop();
      } else if (cmd.startsWith('WRITE_TEST_ARTIFACT')) {
        const args = cmd.split(' ');
        const filename = args[1] || `test-${Date.now()}.txt`;
        result = await MockExecutors.executeWriteTestArtifact(filename);
      } else if (cmd.startsWith('HEALTH_CHECK')) {
        result = MockExecutors.executeHealthCheck();
      } else if (cmd.startsWith('READ_METADATA')) {
        const args = cmd.split(' ');
        result = await MockExecutors.executeReadAllowedFileMetadata(args[1] || '');
      } else {
        result = { status: 'failed', errorMessage: 'Unknown mock command' };
      }

      await GatewayClient.reportEvent(task.id, 'TASK_PROGRESS', { status: result.status });

      if (result.status === 'succeeded') {
        // Register artifacts
        const artifactIds: string[] = [];
        if (result.artifacts) {
          for (const a of result.artifacts) {
            const { id } = await GatewayClient.registerArtifact(task.id, a);
            artifactIds.push(id);
            await GatewayClient.reportEvent(task.id, 'ARTIFACT_CREATED', { artifactId: id, metadata: a });
          }
        }
        await GatewayClient.completeTask(task.id, result.resultData || 'Success', artifactIds);
        await GatewayClient.reportEvent(task.id, 'TASK_SUCCEEDED', { result: result.resultData });
      } else {
        await GatewayClient.failTask(task.id, result.errorMessage || 'Failed');
        await GatewayClient.reportEvent(task.id, 'TASK_FAILED', { error: result.errorMessage });
      }

    } catch (e: any) {
      console.error(`[Daemon] Execution error for task ${task.id}:`, e);
      try {
        await GatewayClient.failTask(task.id, e.message);
        await GatewayClient.reportEvent(task.id, 'TASK_FAILED', { error: e.message });
      } catch (fatalErr) {
        console.error(`[Daemon] FATAL: Could not report failure to Gateway:`, fatalErr);
      }
    }
  }

  private async executePlan(taskId: string, plan: any) {
    try {
      await GatewayClient.reportEvent(taskId, 'PLAN_STARTED', { fingerprint: plan.fingerprint });

      let currentSequence = 0;
      let hasFailed = false;
      const artifactIds: string[] = [];

      for (const step of plan.steps) {
        if (hasFailed) break;
        currentSequence = step.sequence;
        
        await GatewayClient.reportEvent(taskId, 'STEP_STARTED', { sequence: currentSequence, type: step.type });

        try {
          const def = (await import('../executors/registry')).DaemonRegistry.assertAllowed(step.executableId, JSON.parse(step.args), step.cwdRelative);
          const { ProcessRunner } = await import('../executors/process-runner');

          const result = await ProcessRunner.executeSafe({
            executableId: step.executableId,
            resolvedPath: def.resolvedPath,
            args: JSON.parse(step.args),
            cwd: path.resolve(step.cwdRelative),
            environmentProfile: def.environmentProfile,
            timeoutMs: step.timeoutMs || def.maxRuntime
          });

          await GatewayClient.reportEvent(taskId, 'STEP_COMPLETED', {
            sequence: currentSequence,
            status: result.status,
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
            durationMs: result.durationMs
          });

          if (result.status !== 'succeeded') {
            hasFailed = true;
            await GatewayClient.failTask(taskId, `Step ${currentSequence} failed: ${result.errorMessage || 'Non-zero exit code'}`);
          }
        } catch (e: any) {
          hasFailed = true;
          await GatewayClient.reportEvent(taskId, 'STEP_ERROR', { sequence: currentSequence, error: e.message });
          await GatewayClient.failTask(taskId, `Step ${currentSequence} error: ${e.message}`);
        }
      }

      if (!hasFailed) {
        await GatewayClient.completeTask(taskId, `Plan completed successfully`, artifactIds);
        await GatewayClient.reportEvent(taskId, 'PLAN_SUCCEEDED', {});
      }
    } catch (e: any) {
      console.error(`[Daemon] Plan Execution error for task ${taskId}:`, e);
      await GatewayClient.failTask(taskId, e.message);
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, ms);
      this.abortController.signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }
}
