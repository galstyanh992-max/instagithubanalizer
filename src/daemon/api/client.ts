import { DaemonConfig } from '../config';
import { DeviceIdentity } from '../identity';

export class GatewayClient {
  private static async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const url = `${DaemonConfig.GATEWAY_URL}${endpoint}`;
    
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${DaemonConfig.TOKEN}`);
    headers.set('Content-Type', 'application/json');
    
    // Installation ID helps identify the device even without a body
    headers.set('X-Installation-Id', DeviceIdentity.installationId);

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errMessage = response.statusText;
      try {
        const errJson = await response.json();
        errMessage = errJson.error || errMessage;
      } catch (e) {
        // ignore
      }
      throw new Error(`Gateway Error (${response.status}): ${errMessage}`);
    }

    return response.json();
  }

  public static async registerDevice(): Promise<{ status: string }> {
    return this.fetchWithAuth('/api/daemon/register', {
      method: 'POST',
      body: JSON.stringify({
        installationId: DeviceIdentity.installationId,
        metadata: DeviceIdentity.getDeviceMetadata()
      })
    });
  }

  public static async heartbeat(): Promise<{ status: string }> {
    return this.fetchWithAuth('/api/daemon/heartbeat', {
      method: 'POST'
    });
  }

  public static async claimTask(): Promise<{ task: any | null, plan?: any }> {
    return this.fetchWithAuth('/api/daemon/tasks/claim', {
      method: 'POST'
    });
  }

  public static async reportEvent(taskId: string, eventType: string, payload: any): Promise<void> {
    await this.fetchWithAuth(`/api/daemon/tasks/${taskId}/events`, {
      method: 'POST',
      body: JSON.stringify({ eventType, payload })
    });
  }

  public static async completeTask(taskId: string, result: string, artifacts?: string[]): Promise<void> {
    await this.fetchWithAuth(`/api/daemon/tasks/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ result, artifacts })
    });
  }

  public static async failTask(taskId: string, errorMessage: string): Promise<void> {
    await this.fetchWithAuth(`/api/daemon/tasks/${taskId}/fail`, {
      method: 'POST',
      body: JSON.stringify({ errorMessage })
    });
  }

  public static async registerArtifact(taskId: string, metadata: any): Promise<{ id: string }> {
    return this.fetchWithAuth(`/api/daemon/artifacts`, {
      method: 'POST',
      body: JSON.stringify({ taskId, metadata })
    });
  }
}
