import { DaemonConfig } from './config';
import { DeviceIdentity } from './identity';
import { GatewayClient } from './api/client';
import { TaskPoller } from './poller';
import { publishRegistryProjectionIfChanged } from './registry-projection';
import http from 'http';

async function bootstrap() {
  console.log('=================================');
  console.log(`[Daemon] JARVIS Local Daemon v0.1.0`);
  console.log(`[Daemon] Node Version: ${process.version}`);
  console.log(`[Daemon] Gateway URL: ${DaemonConfig.GATEWAY_URL}`);
  console.log('=================================');

  try {
    const instId = DeviceIdentity.initialize();
    console.log(`[Daemon] Installation ID: ${instId}`);
    
    // Register device
    console.log('[Daemon] Registering device with control plane...');
    await GatewayClient.registerDevice();
    DeviceIdentity.isRegistered = true;
    console.log('[Daemon] Registration successful.');

    // Publish a fresh registry projection on every startup/reconnect
    // (force=true) so a stale snapshot from before a restart never lingers
    // as the dashboard's "latest" view. Non-fatal: the heartbeat loop will
    // retry on its own interval if this one attempt fails (e.g. registry
    // files not yet warmed up).
    try {
      const result = await publishRegistryProjectionIfChanged(true);
      console.log(`[Daemon] Registry projection published on startup (revision ${result.revision.slice(0, 12)}, ${result.programCount} programs, ${result.capabilityCount} capabilities).`);
    } catch (e: any) {
      console.warn(`[Daemon] Initial registry projection publish failed (will retry on heartbeat interval): ${e.message}`);
    }

    // Start Poller
    const poller = new TaskPoller();
    
    // Graceful Shutdown Handlers
    const shutdown = async () => {
      console.log('\n[Daemon] Received termination signal. Shutting down...');
      poller.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Health endpoint
    const server = http.createServer((req, res) => {
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          daemonVersion: '0.1.0',
          installationId: instId,
          registered: DeviceIdentity.isRegistered,
          uptime: process.uptime()
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // A bind failure here (e.g. port already claimed by an unrelated app on
    // this machine) must not crash the daemon — the health endpoint is a
    // convenience for local diagnostics, not required for heartbeat/task
    // execution. Without this handler, EADDRINUSE is an unhandled 'error'
    // event and takes the whole process down.
    server.on('error', (err: any) => {
      console.warn(`[Daemon] Health endpoint failed to bind on 127.0.0.1:${DaemonConfig.HEALTH_PORT} (${err.code || err.message}). Continuing without it — set JARVIS_DAEMON_HEALTH_PORT to use a different port.`);
    });

    server.listen(DaemonConfig.HEALTH_PORT, '127.0.0.1', () => {
      console.log(`[Daemon] Health endpoint listening on http://127.0.0.1:${DaemonConfig.HEALTH_PORT}/health`);
    });

    // Run poller (blocks until shutdown)
    await poller.start();

  } catch (error: any) {
    console.error(`[Daemon] Bootstrap Failed: ${error.message}`);
    process.exit(1);
  }
}

bootstrap();
