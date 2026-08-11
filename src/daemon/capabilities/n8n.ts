// Real n8n.{health,smoke} capability. Reuses, unchanged:
//  - src/local-runtime/jarvis/phase-b/docker-service-manager.ts (real
//    execFile-based `docker compose` control, ALLOWED_SERVICES={'n8n'})
//  - src/lib/jarvis/phase-b/n8n-workflows.ts's n8nWorkflowController, whose
//    own run() hard-throws for any workflow id other than
//    SAFE_FIXTURE_WORKFLOW_ID ('jarvisPhaseBSmoke001') — the "only the
//    approved fixture" invariant is enforced in that code, not re-implemented
//    here.
// Policy: "n8n normally STOPPED." `smoke` only stops n8n at the end if this
// call is what started it — a pre-existing legitimate RUNNING state (someone
// already using n8n for something else) is left alone rather than being
// torn down.
import type { CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';
import type { DaemonCapabilityExecutor } from './types';
import { ok, fail } from './types';

export const n8nExecutor: DaemonCapabilityExecutor = {
  id: 'n8n',
  canHandle: (capability) => capability === 'n8n',
  validate: (envelope) => {
    if (!['health', 'smoke'].includes(envelope.operation)) {
      return { ok: false, reason: `Неподдерживаемая операция n8n: ${envelope.operation}` };
    }
    return { ok: true };
  },
  async execute(envelope: CapabilityCommandEnvelope, signal: AbortSignal) {
    try {
      if (signal.aborted) return fail('Отменено до выполнения');
      const { phaseBDockerServiceManager } = await import('@/local-runtime/jarvis/phase-b/docker-service-manager');

      if (envelope.operation === 'health') {
        const available = await phaseBDockerServiceManager.available();
        if (!available) return ok({ dockerAvailable: false, running: false, status: 'Docker недоступен' });
        const state = await phaseBDockerServiceManager.state('n8n');
        return ok({ dockerAvailable: true, ...state });
      }

      // smoke
      const available = await phaseBDockerServiceManager.available();
      if (!available) return fail('Docker недоступен на этой машине — smoke-тест n8n невозможен');

      const before = await phaseBDockerServiceManager.state('n8n');
      const wasRunning = before.running;

      if (!wasRunning) {
        await phaseBDockerServiceManager.start('n8n');
      }

      const { n8nWorkflowController, SAFE_FIXTURE_WORKFLOW_ID } = await import('@/lib/jarvis/phase-b/n8n-workflows');

      let importResult: unknown;
      try {
        importResult = await n8nWorkflowController.importSafeFixture();
      } catch (error: any) {
        // Non-fatal: a prior run may have already imported the fixture.
        importResult = { imported: false, error: error?.message ?? String(error) };
      }

      let runResult: unknown;
      let runError: string | null = null;
      try {
        runResult = await n8nWorkflowController.run(SAFE_FIXTURE_WORKFLOW_ID);
      } catch (error: any) {
        runError = error?.message ?? String(error);
      }

      let after = before;
      if (!wasRunning) {
        after = await phaseBDockerServiceManager.stop('n8n');
      } else {
        after = await phaseBDockerServiceManager.state('n8n');
      }

      const payload = {
        startedFresh: !wasRunning,
        importResult,
        runResult: runResult ?? null,
        runError,
        finalState: after.running ? 'RUNNING' : 'STOPPED',
      };

      if (runError) return { status: 'failed', errorMessage: runError, resultData: JSON.stringify(payload) };
      return ok(payload);
    } catch (error: any) {
      return fail(error?.message ?? String(error));
    }
  },
};
