import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth, OWNER_ID } from '../auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const authResult = requireDaemonAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const installationId = authResult;

  try {
    const body = await request.json();
    const metadata = body.metadata || {};

    const device = await db.device.upsert({
      where: { installationId },
      update: {
        name: metadata.name || 'Unknown Device',
        platform: metadata.platform || 'Unknown',
        daemonVersion: metadata.daemonVersion || '0.0.0',
        status: 'online',
        lastHeartbeatAt: new Date(),
      },
      create: {
        installationId,
        ownerUserId: OWNER_ID,
        name: metadata.name || 'Unknown Device',
        platform: metadata.platform || 'Unknown',
        daemonVersion: metadata.daemonVersion || '0.0.0',
        status: 'online',
        lastHeartbeatAt: new Date(),
      }
    });

    return NextResponse.json({ status: 'registered', deviceId: device.id });
  } catch (error: any) {
    console.error('Daemon Register Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
