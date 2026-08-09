import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`FATAL: Missing required daemon configuration: ${name}`);
    process.exit(1);
  }
  return value;
}

function resolveCanonicalPath(rawPath: string): string {
  const resolved = path.resolve(rawPath);
  if (!fs.existsSync(resolved)) {
    // If not exists, attempt to create it (since these are root dirs)
    fs.mkdirSync(resolved, { recursive: true });
  }
  return fs.realpathSync(resolved);
}

export const DaemonConfig = {
  DEVICE_NAME: requireEnv('JARVIS_DAEMON_DEVICE_NAME'),
  GATEWAY_URL: requireEnv('JARVIS_DAEMON_GATEWAY_URL').replace(/\/$/, ''),
  TOKEN: requireEnv('JARVIS_DAEMON_TOKEN'),
  
  WORKSPACES_ROOT: resolveCanonicalPath(requireEnv('JARVIS_WORKSPACES_ROOT')),
  ARTIFACTS_ROOT: resolveCanonicalPath(requireEnv('JARVIS_ARTIFACTS_ROOT')),
  LOGS_ROOT: resolveCanonicalPath(requireEnv('JARVIS_LOGS_ROOT')),
  TEMP_ROOT: resolveCanonicalPath(requireEnv('JARVIS_TEMP_ROOT')),
  
  POLL_INTERVAL_MS: parseInt(process.env.JARVIS_DAEMON_POLL_INTERVAL_MS || '2000', 10),
  HEARTBEAT_INTERVAL_MS: parseInt(process.env.JARVIS_DAEMON_HEARTBEAT_INTERVAL_MS || '30000', 10),
};
