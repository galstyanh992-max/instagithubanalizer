import { DaemonConfig } from './config';
import { DeviceIdentity } from './identity';
import { GatewayClient } from './api/client';
import { TaskPoller } from './poller';
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

    server.listen(3001, '127.0.0.1', () => {
      console.log('[Daemon] Health endpoint listening on http://127.0.0.1:3001/health');
    });

    // Run poller (blocks until shutdown)
    await poller.start();

  } catch (error: any) {
    console.error(`[Daemon] Bootstrap Failed: ${error.message}`);
    process.exit(1);
  }
}

bootstrap();
