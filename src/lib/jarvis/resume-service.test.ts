import { describe, expect, it } from 'vitest';
import { claimResumeLease, ResumeConflictError, type ResumeLeaseStore } from './resume-service';

describe('resume lease', () => {
  it('allows only one concurrent claimant for the same version', async () => {
    let version = 4;
    let leased = false;
    const store: ResumeLeaseStore = {
      async claim(input) {
        if (leased || input.expectedVersion !== version) return false;
        leased = true;
        version += 1;
        return true;
      },
    };

    const attempts = await Promise.allSettled([
      claimResumeLease(store, { runId: 'run-1', expectedVersion: 4, owner: 'a' }),
      claimResumeLease(store, { runId: 'run-1', expectedVersion: 4, owner: 'b' }),
    ]);
    expect(attempts.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    const rejected = attempts.find((entry) => entry.status === 'rejected');
    expect(rejected && rejected.status === 'rejected' ? rejected.reason : null).toBeInstanceOf(ResumeConflictError);
  });
});
