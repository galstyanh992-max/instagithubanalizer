import { describe, it, expect } from 'vitest';
import { orchestrate } from './orchestrator';

const TEST_RUN_ID = 'run-orchestrator-test-1';

describe('orchestrate (dry-run)', () => {
  it('plans, executes, and returns a release gate', async () => {
    const result = await orchestrate({
      runId: TEST_RUN_ID,
      goal: 'create a small React component',
      mode: 'fast',
      dryRun: true,
    });

    expect(result.runId).toBe(TEST_RUN_ID);
    expect(result.graph.tasks.length).toBeGreaterThan(0);
    expect(result.artifacts.length).toBeGreaterThanOrEqual(1);
    expect(result.releaseGate.completed.length).toBeGreaterThanOrEqual(1);
  });
});
