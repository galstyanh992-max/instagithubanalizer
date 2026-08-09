import * as path from 'path';
import { PathGuard } from '../sandbox/path-guard';
import { DaemonConfig } from '../config';

export interface ExecutableDefinition {
  id: string;
  resolvedPath: string;
  allowedArguments: RegExp[];
  allowedCwdRoots: string[];
  environmentProfile: 'MINIMAL' | 'INHERIT';
  maxRuntime: number;
}

export class DaemonRegistry {
  private static readonly executables = new Map<string, ExecutableDefinition>();

  static {
    // Initial Whitelist for Phase 04 Security Validation
    this.register({
      id: 'NPM_TYPECHECK',
      resolvedPath: process.platform === 'win32' ? 'npm.cmd' : 'npm', // Ideally resolve exact path
      allowedArguments: [/^run$/, /^typecheck$/],
      allowedCwdRoots: [DaemonConfig.WORKSPACES_ROOT, process.cwd()],
      environmentProfile: 'MINIMAL',
      maxRuntime: 60000
    });

    this.register({
      id: 'NPM_TEST',
      resolvedPath: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      allowedArguments: [/^run$/, /^test$/, /^--$/, /^--run$/],
      allowedCwdRoots: [DaemonConfig.WORKSPACES_ROOT, process.cwd()],
      environmentProfile: 'MINIMAL',
      maxRuntime: 60000
    });
  }

  public static register(def: ExecutableDefinition) {
    this.executables.set(def.id, def);
  }

  public static get(id: string): ExecutableDefinition | undefined {
    return this.executables.get(id);
  }

  public static assertAllowed(id: string, args: string[], cwd: string): ExecutableDefinition {
    const def = this.get(id);
    if (!def) {
      throw new Error(`Execution Denied: Executable '${id}' is not in the allowed registry.`);
    }

    // Check args
    for (const arg of args) {
      const isAllowed = def.allowedArguments.some(pattern => pattern.test(arg));
      if (!isAllowed) {
        throw new Error(`Execution Denied: Argument '${arg}' is not allowed for executable '${id}'.`);
      }
    }

    // Check CWD
    PathGuard.assertSafePath(cwd);
    const resolvedCwd = path.resolve(cwd);
    const isAllowedCwd = def.allowedCwdRoots.some(root => {
      const resolvedRoot = path.resolve(root);
      return resolvedCwd === resolvedRoot || resolvedCwd.startsWith(resolvedRoot + path.sep);
    });

    if (!isAllowedCwd) {
      throw new Error(`Execution Denied: CWD '${cwd}' is outside allowed roots for executable '${id}'.`);
    }

    return def;
  }
}
