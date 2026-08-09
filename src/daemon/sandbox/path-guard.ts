import path from 'path';
import fs from 'fs';
import { DaemonConfig } from '../config';

export class PathGuard {
  public static getAllowedRoots(): string[] {
    return [
      DaemonConfig.WORKSPACES_ROOT,
      DaemonConfig.ARTIFACTS_ROOT,
      DaemonConfig.LOGS_ROOT,
      DaemonConfig.TEMP_ROOT,
      path.resolve(process.cwd()) // D:\АГЕНТ\ДЖАРВИС
    ].map(p => {
      try {
        return fs.realpathSync(p);
      } catch (e) {
        return p;
      }
    });
  }

  public static isSafePath(targetPath: string, requireExists: boolean = false): boolean {
    try {
      // 1. Resolve to absolute path
      const resolvedPath = path.resolve(targetPath);
      
      // 2. Prevent UNC paths
      if (resolvedPath.startsWith('\\\\') || resolvedPath.startsWith('//')) {
        return false;
      }

      let real: string;
      if (fs.existsSync(resolvedPath)) {
        // 3. realpath to resolve symlinks and junctions
        real = fs.realpathSync(resolvedPath);
      } else {
        if (requireExists) return false;
        // If it doesn't exist, check its nearest existing parent
        let current = path.dirname(resolvedPath);
        while (!fs.existsSync(current) && current !== path.dirname(current)) {
          current = path.dirname(current);
        }
        if (!fs.existsSync(current)) return false;
        const realParent = fs.realpathSync(current);
        real = path.join(realParent, path.basename(resolvedPath));
      }

      // 4. Verify the path is within an allowed root
      const roots = this.getAllowedRoots();
      for (const root of roots) {
        if (real === root || real.startsWith(root + path.sep)) {
          return true;
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  public static assertSafePath(targetPath: string, requireExists: boolean = false): string {
    if (!this.isSafePath(targetPath, requireExists)) {
      throw new Error(`PathGuard Exception: Access to path ${targetPath} is denied or path is invalid.`);
    }
    return path.resolve(targetPath);
  }
}
