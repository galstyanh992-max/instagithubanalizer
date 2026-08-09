import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PathGuard } from '../sandbox/path-guard';
import { DaemonConfig } from '../config';

export interface ExecutorResult {
  status: 'succeeded' | 'failed';
  resultData?: string;
  errorMessage?: string;
  artifacts?: Array<{ type: string, filename: string, path: string, size: number, hash: string }>;
}

export class MockExecutors {
  public static executeNoop(): ExecutorResult {
    return { status: 'succeeded', resultData: 'NOOP executed successfully' };
  }

  public static executeHealthCheck(): ExecutorResult {
    const isTempSafe = PathGuard.isSafePath(DaemonConfig.TEMP_ROOT);
    return { 
      status: 'succeeded', 
      resultData: JSON.stringify({ tempRootSafe: isTempSafe }) 
    };
  }

  public static async executeWriteTestArtifact(filename: string): Promise<ExecutorResult> {
    try {
      const targetPath = path.join(DaemonConfig.ARTIFACTS_ROOT, filename);
      PathGuard.assertSafePath(targetPath);

      const content = `Test artifact generated at ${new Date().toISOString()}`;
      await fs.promises.writeFile(targetPath, content, 'utf-8');

      const stat = await fs.promises.stat(targetPath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      return {
        status: 'succeeded',
        resultData: `Artifact written to ${targetPath}`,
        artifacts: [{
          type: 'file',
          filename,
          path: targetPath,
          size: stat.size,
          hash
        }]
      };
    } catch (e: any) {
      return { status: 'failed', errorMessage: e.message };
    }
  }

  public static async executeReadAllowedFileMetadata(targetPath: string): Promise<ExecutorResult> {
    try {
      PathGuard.assertSafePath(targetPath, true);
      const stat = await fs.promises.stat(targetPath);
      const content = await fs.promises.readFile(targetPath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      return {
        status: 'succeeded',
        resultData: JSON.stringify({ size: stat.size, hash })
      };
    } catch (e: any) {
      return { status: 'failed', errorMessage: e.message };
    }
  }
}
