import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth } from '../auth';
import { db } from '@/lib/db';
import { broadcastJarvisEvent } from '@/lib/jarvis/realtime/broadcast';

export async function POST(request: NextRequest) {
  const authResult = requireDaemonAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const installationId = authResult;

  try {
    const device = await db.device.findUnique({ where: { installationId } });
    if (!device) {
      return NextResponse.json({ error: 'Device not registered' }, { status: 404 });
    }
    if (device.revokedAt) {
      return NextResponse.json({ error: 'Device is revoked' }, { status: 403 });
    }

    await db.device.update({
      where: { installationId },
      data: {
        lastHeartbeatAt: new Date(),
        status: 'online'
      }
    });

    // Transport-only signal: tells any subscribed frontend "device X had a
    // heartbeat, go refetch /api/devices/status" — never the raw row (see
    // src/lib/jarvis/realtime/broadcast.ts).
    await broadcastJarvisEvent('device.status', { id: device.id, at: new Date().toISOString() });

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Daemon Heartbeat Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
