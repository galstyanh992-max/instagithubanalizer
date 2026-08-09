import { describe, it, expect } from 'vitest';
import { selectAgentsForGoal, buildPlan } from './planner';

const TEST_RUN_ID = 'run-test-1';

describe('selectAgentsForGoal', () => {
  it('always includes orchestrator', () => {
    const selected = selectAgentsForGoal('create a simple landing page');
    const roles = selected.map((s) => s.agent.role);
    expect(roles).toContain('orchestrator');
  });

  it('selects frontend and designer for UI goals', () => {
    const selected = selectAgentsForGoal('build a React dashboard UI with mockups');
    const roles = selected.map((s) => s.agent.role);
    expect(roles).toContain('frontend_engineer');
    expect(roles).toContain('designer');
  });

  it('selects data engineer for database goals', () => {
    const selected = selectAgentsForGoal('design a Prisma schema for users');
    const roles = selected.map((s) => s.agent.role);
    expect(roles).toContain('data_engineer');
  });

  it('returns fallback agents for vague goals', () => {
    const selected = selectAgentsForGoal('do something useful');
    expect(selected.length).toBeGreaterThanOrEqual(2);
  });
});

describe('buildPlan', () => {
  it('produces a graph with sequential tasks', async () => {
    const result = await buildPlan({ runId: TEST_RUN_ID, goal: 'implement a feature' });
    expect(result.graph.tasks.length).toBeGreaterThanOrEqual(3);
    expect(result.planArtifact.type).toBe('plan');
  });
});
