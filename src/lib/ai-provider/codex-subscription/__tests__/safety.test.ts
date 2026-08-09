import { describe, expect, it } from 'vitest';
import { validateCodexWorkingDirectory } from '../path-policy';
import { CodexProcessRunner } from '../process-runner';

describe('Codex local safety boundaries', () => {
  it('rejects non-D and UNC working directories before filesystem access', async () => {
    await expect(validateCodexWorkingDirectory('C:\\Users\\Admin')).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(validateCodexWorkingDirectory('\\\\server\\share\\repo')).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects non-allowlisted CLI arguments', async () => {
    const runner = new CodexProcessRunner();
    await expect(runner.run(['exec', '--dangerously-bypass-approvals-and-sandbox'])).rejects.toMatchObject({ code: 'BLOCKED' });
  });
});
