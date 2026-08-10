// Daemon-side registry-projection publisher. Computes a sanitized, revision-
// hashed snapshot of the canonical HOME-PC registries (programRegistry /
// capabilityRegistry — local JSON-backed, unchanged) and publishes it to the
// control plane only when the revision actually changes, so the heartbeat
// stays light and Supabase never becomes a second authoritative registry.
// See src/lib/jarvis/platform/registry-projection.ts and
// docs/jarvis/remote-architecture.md.
import { programRegistry } from '../../lib/jarvis/platform/program-registry';
import { capabilityRegistry } from '../../lib/jarvis/platform/capability-registry';
import { assertSnapshotWithinLimit, buildRegistryProjection, type RegistryProjectionPayload } from '../../lib/jarvis/platform/registry-projection';
import { GatewayClient } from '../api/client';

let lastPublishedRevision: string | null = null;

export async function computeRegistryProjection(): Promise<RegistryProjectionPayload> {
  const [programs, capabilities, programsSummary, capabilitiesSummary] = await Promise.all([
    programRegistry.list(),
    capabilityRegistry.list(),
    programRegistry.summary(),
    capabilityRegistry.summary(),
  ]);
  return buildRegistryProjection(programs, capabilities, programsSummary, capabilitiesSummary);
}

export interface PublishResult {
  published: boolean;
  revision: string;
  programCount: number;
  capabilityCount: number;
}

// Publish-on-change: called at daemon startup (force=true, guarantees a
// fresh snapshot after every restart/reconnect) and then periodically
// alongside the heartbeat loop (force=false, only publishes when the
// computed revision differs from the last one this process published).
export async function publishRegistryProjectionIfChanged(force = false): Promise<PublishResult> {
  const payload = await computeRegistryProjection();
  assertSnapshotWithinLimit(payload);

  if (!force && payload.revision === lastPublishedRevision) {
    return {
      published: false,
      revision: payload.revision,
      programCount: payload.programs.length,
      capabilityCount: payload.capabilities.length,
    };
  }

  await GatewayClient.publishRegistrySnapshot(payload.revision, payload);
  lastPublishedRevision = payload.revision;
  return {
    published: true,
    revision: payload.revision,
    programCount: payload.programs.length,
    capabilityCount: payload.capabilities.length,
  };
}

// Exposed for tests / manual daemon debugging only.
export function __resetLastPublishedRevisionForTests(): void {
  lastPublishedRevision = null;
}
