// Thin shared-tree proxy for the Phase B Docker service manager (n8n). The
// real implementation (execFile against the local `docker` CLI) lives at
// src/local-runtime/jarvis/phase-b/docker-service-manager.ts and is
// local-runtime only. This proxy fails closed with an honest "unavailable"
// state on web-control-plane instead of ever shelling out.
import { env } from '@/lib/env';

export interface DockerServiceState {
  installed: boolean;
  running: boolean;
  containerId: string | null;
  image: string | null;
  status: string;
}

export interface PortInspection { port: number; occupied: boolean; pid: number | null; expectedService: string | null }

const FORBIDDEN_MESSAGE = 'LOCAL_EXECUTION_FORBIDDEN: Docker services run on the local JARVIS runtime only.';

function isForbidden(): boolean {
  return env.JARVIS_RUNTIME_ROLE === 'web-control-plane';
}

function forbiddenState(): DockerServiceState {
  return { installed: false, running: false, containerId: null, image: null, status: FORBIDDEN_MESSAGE };
}

type RealManager = typeof import('@/local-runtime/jarvis/phase-b/docker-service-manager')['phaseBDockerServiceManager'];

async function real(): Promise<RealManager> {
  const { phaseBDockerServiceManager } = await import('@/local-runtime/jarvis/phase-b/docker-service-manager');
  return phaseBDockerServiceManager;
}

class PhaseBDockerServiceManagerProxy {
  async available(): Promise<boolean> {
    if (isForbidden()) return false;
    return (await real()).available();
  }

  async inspectPort(port: number): Promise<PortInspection> {
    if (isForbidden()) return { port, occupied: false, pid: null, expectedService: null };
    return (await real()).inspectPort(port);
  }

  async state(service: string): Promise<DockerServiceState> {
    if (isForbidden()) return forbiddenState();
    return (await real()).state(service);
  }

  async start(service: string): Promise<DockerServiceState> {
    if (isForbidden()) return forbiddenState();
    return (await real()).start(service);
  }

  async stop(service: string): Promise<DockerServiceState> {
    if (isForbidden()) return forbiddenState();
    return (await real()).stop(service);
  }

  async restart(service: string): Promise<DockerServiceState> {
    if (isForbidden()) return forbiddenState();
    return (await real()).restart(service);
  }

  async logs(service: string): Promise<string> {
    if (isForbidden()) return FORBIDDEN_MESSAGE;
    return (await real()).logs(service);
  }

  async n8nCli(args: string[], options?: { brokerPort?: number; timeout?: number }): Promise<string> {
    if (isForbidden()) throw new Error(FORBIDDEN_MESSAGE);
    return (await real()).n8nCli(args, options);
  }

  async copyToN8n(localPath: string, containerPath: string): Promise<void> {
    if (isForbidden()) throw new Error(FORBIDDEN_MESSAGE);
    return (await real()).copyToN8n(localPath, containerPath);
  }
}

export const phaseBDockerServiceManager = new PhaseBDockerServiceManagerProxy();
