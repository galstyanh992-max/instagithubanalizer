import { ok, safe } from '@/lib/api';
import { requireJarvisOwner } from '@/lib/jarvis/owner-guard';
import { db } from '@/lib/db';
import { markProjectionOffline, type RegistryProjectionPayload, type StoredRegistrySnapshot } from '@/lib/jarvis/platform/registry-projection';

// Frontend-facing (Supabase session auth, NOT the daemon token) view of
// registered devices with a computed, non-cached status. A device's `status`
// column is only ever set to "online" by the daemon's own heartbeat/register
// calls, so if nobody computes staleness the UI would show a dead machine as
// ONLINE forever. This endpoint is the single source of truth for that.
//
// STALE_MS is 3x the daemon's default heartbeat interval
// (JARVIS_DAEMON_HEARTBEAT_INTERVAL_MS, default 30s) so one or two missed
// beats don't flip the badge, but a genuinely offline machine does.
const STALE_MS = 90 * 1000;

export type DeviceStatusView = {
  id: string;
  name: string;
  platform: string;
  daemonVersion: string;
  protocolVersion: string;
  status: 'ONLINE' | 'OFFLINE' | 'DISABLED';
  lastHeartbeatAt: string | null;
  runningTaskCount: number;
  registryProjection: (Pick<RegistryProjectionPayload, 'revision' | 'generatedAt' | 'programsSummary' | 'capabilitiesSummary' | 'programs' | 'capabilities'> & { publishedAt: string }) | null;
};

// Parses the sanitized registry-projection snapshot published by the daemon
// (src/daemon/registry-projection) and stored verbatim in
// Device.capabilitiesSnapshot. When the device itself is not ONLINE, every
// program/capability health field is forced to UNKNOWN_DEVICE_OFFLINE — a
// stored snapshot from before the device went offline must never be
// presented as live green health. See docs/jarvis/remote-architecture.md.
function parseRegistryProjection(
  raw: string | null,
  deviceStatus: DeviceStatusView['status'],
): DeviceStatusView['registryProjection'] {
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredRegistrySnapshot;
    if (!stored?.payload || !Array.isArray(stored.payload.programs)) return null;
    const payload = deviceStatus === 'ONLINE' ? stored.payload : markProjectionOffline(stored.payload);
    return {
      revision: payload.revision,
      generatedAt: payload.generatedAt,
      publishedAt: stored.publishedAt,
      programsSummary: payload.programsSummary,
      capabilitiesSummary: payload.capabilitiesSummary,
      programs: payload.programs,
      capabilities: payload.capabilities,
    };
  } catch {
    return null;
  }
}

export const GET = safe(async () => {
  const accessError = await requireJarvisOwner();
  if (accessError) return accessError;

  const devices = await db.device.findMany({ orderBy: { createdAt: 'asc' } });
  const now = Date.now();

  const view: DeviceStatusView[] = await Promise.all(
    devices.map(async (device) => {
      const runningTaskCount = await db.agentTask.count({
        where: { agentId: device.id, status: { in: ['claimed', 'running'] } },
      });

      const status: DeviceStatusView['status'] = device.revokedAt
        ? 'DISABLED'
        : device.lastHeartbeatAt && now - device.lastHeartbeatAt.getTime() < STALE_MS
          ? 'ONLINE'
          : 'OFFLINE';

      return {
        id: device.id,
        name: device.name,
        platform: device.platform,
        daemonVersion: device.daemonVersion,
        protocolVersion: device.protocolVersion,
        status,
        lastHeartbeatAt: device.lastHeartbeatAt?.toISOString() ?? null,
        runningTaskCount,
        registryProjection: parseRegistryProjection(device.capabilitiesSnapshot, status),
      };
    })
  );

  return ok({ devices: view, staleMs: STALE_MS });
});
