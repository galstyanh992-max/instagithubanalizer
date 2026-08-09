import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import os from 'os';
import { DaemonConfig } from '../config';

const STATE_FILE_PATH = path.join(DaemonConfig.TEMP_ROOT, 'daemon-state', 'identity.json');

export interface IdentityState {
  installationId: string;
}

export class DeviceIdentity {
  private static state: IdentityState | null = null;
  public static isRegistered: boolean = false;

  public static initialize(): string {
    const dir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(STATE_FILE_PATH)) {
      try {
        const content = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
        this.state = JSON.parse(content);
      } catch (e) {
        console.warn('Failed to parse identity.json, generating new installationId');
      }
    }

    if (!this.state?.installationId) {
      this.state = { installationId: randomUUID() };
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(this.state, null, 2));
    }

    return this.state.installationId;
  }

  public static get installationId(): string {
    if (!this.state) {
      return this.initialize();
    }
    return this.state.installationId;
  }

  public static getDeviceMetadata() {
    return {
      name: DaemonConfig.DEVICE_NAME,
      platform: `${os.platform()} ${os.release()} ${os.arch()}`,
      daemonVersion: '0.1.0',
    };
  }
}
