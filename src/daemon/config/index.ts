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
  
  // Optional: Vercel's "Protection Bypass for Automation" secret. Needed
  // whenever the gateway is a Vercel Preview URL with Deployment Protection
  // (Vercel Authentication / SSO) enabled -- without it, every daemon
  // request is rejected by Vercel's edge (401, plain-text "Unauthorized")
  // before it ever reaches the app's own requireDaemonAuth() check.
  // Discovered 2026-08-11 during real Preview E2E: the daemon's own token
  // was correct and irrelevant here -- Vercel's platform auth sat in front
  // of it. Not required for local dev or self-hosted gateways.
  PROTECTION_BYPASS_SECRET: process.env.JARVIS_DAEMON_PROTECTION_BYPASS_SECRET || '',

  POLL_INTERVAL_MS: parseInt(process.env.JARVIS_DAEMON_POLL_INTERVAL_MS || '2000', 10),
  HEARTBEAT_INTERVAL_MS: parseInt(process.env.JARVIS_DAEMON_HEARTBEAT_INTERVAL_MS || '30000', 10),
  // Configurable so the local health-check listener never collides with an
  // unrelated app already bound to the previously-hardcoded 3001 on this
  // machine. Discovered 2026-08-10 during real-machine E2E testing.
  HEALTH_PORT: parseInt(process.env.JARVIS_DAEMON_HEALTH_PORT || '3001', 10),
};
