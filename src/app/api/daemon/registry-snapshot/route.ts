import { NextRequest, NextResponse } from 'next/server';
import { requireDaemonAuth } from '../auth';
import { db } from '@/lib/db';
import { assertSnapshotWithinLimit, type RegistryProjectionPayload } from '@/lib/jarvis/platform/registry-projection';

// Publish-on-change registry projection endpoint. Stores a sanitized
// snapshot of the daemon's canonical local registries in the existing
// Device.capabilitiesSnapshot column (no new table/migration — see
// src/lib/jarvis/platform/registry-projection.ts). This is a pure data-store
// operation: the route never executes anything locally, and Supabase never
// becomes a second authoritative registry — HOME-PC's local JSON registries
// remain canonical; this is a read-only-for-the-dashboard projection of them.
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

    const body = await request.json();
    const revision: unknown = body.revision;
    const payload: RegistryProjectionPayload | undefined = body.payload;

    if (typeof revision !== 'string' || !revision) {
      return NextResponse.json({ error: 'Missing or invalid revision' }, { status: 400 });
    }
    if (!payload || typeof payload !== 'object' || payload.revision !== revision) {
      return NextResponse.json({ error: 'Missing or mismatched payload.revision' }, { status: 400 });
    }
    if (!Array.isArray(payload.programs) || !Array.isArray(payload.capabilities)) {
      return NextResponse.json({ error: 'Malformed registry projection payload' }, { status: 400 });
    }

    try {
      assertSnapshotWithinLimit(payload);
    } catch (sizeError: any) {
      return NextResponse.json({ error: sizeError.message }, { status: 413 });
    }

    const stored = {
      revision,
      publishedAt: new Date().toISOString(),
      payload,
    };

    await db.device.update({
      where: { installationId },
      data: { capabilitiesSnapshot: JSON.stringify(stored) },
    });

    return NextResponse.json({ status: 'ok', revision });
  } catch (error: any) {
    console.error('Daemon Registry Snapshot Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
