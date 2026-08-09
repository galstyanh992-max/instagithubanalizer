import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
function redactSecrets(value:string) {
  return value
    .replace(/(authorization\s*:\s*bearer\s+)[^\s,;]+/gi,'$1[СКРЫТО]')
    .replace(/(cookie\s*:\s*)[^\r\n]+/gi,'$1[СКРЫТО]')
    .replace(/(["'](?:token|secret|password|api[_-]?key)["']\s*:\s*["'])[^"']+(["'])/gi,'$1[СКРЫТО]$2')
    .replace(/([?&](?:token|secret|password|api[_-]?key)=)[^&#\s]+/gi,'$1[СКРЫТО]')
    .replace(/((?:token|secret|password|api[_-]?key)=)[^\s,;]+/gi,'$1[СКРЫТО]');
}
const PROJECT = 'jarvis-phase-b';
const ALLOWED_SERVICES = new Set(['n8n']);

export interface DockerServiceState {
  installed: boolean;
  running: boolean;
  containerId: string | null;
  image: string | null;
  status: string;
}

export interface PortInspection { port:number; occupied:boolean; pid:number|null; expectedService:string|null }

export class PhaseBDockerServiceManager {
  readonly composePath = join(process.cwd(), 'infra', 'phase-b', 'compose.yaml');

  private assertService(service: string) {
    if (!ALLOWED_SERVICES.has(service)) throw new Error(`Docker-сервис Phase B не разрешён: ${service}`);
  }

  private async docker(args: string[], timeout = 30_000) {
    return execFileAsync('docker', args, { cwd: process.cwd(), timeout, windowsHide: true, maxBuffer: 1_048_576 });
  }

  async inspectPort(port:number):Promise<PortInspection> {
    if(!Number.isInteger(port) || port<1 || port>65_535) throw new Error('Некорректный порт');
    try {
      const {stdout}=await execFileAsync('netstat',['-ano','-p','tcp'],{timeout:5_000,windowsHide:true,maxBuffer:1_048_576});
      const line=stdout.split(/\r?\n/).find((row)=>new RegExp(`(?:127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[::\\]|\\[::1\\]):${port}\\s+.*LISTENING\\s+(\\d+)`,'i').test(row));
      const pid=line ? Number(line.trim().split(/\s+/).at(-1))||null:null;
      const n8n=port===15_678 ? await this.state('n8n'):null;
      return {port,occupied:Boolean(line),pid,expectedService:n8n?.running ? 'n8n':null};
    } catch { return {port,occupied:false,pid:null,expectedService:null}; }
  }

  async available() {
    try {
      await access(this.composePath);
      await this.docker(['version', '--format', '{{.Server.Version}}'], 5_000);
      return true;
    } catch { return false; }
  }

  async state(service: string): Promise<DockerServiceState> {
    this.assertService(service);
    if (!(await this.available())) return { installed:false, running:false, containerId:null, image:null, status:'Docker недоступен' };
    try {
      const { stdout } = await this.docker(['compose','-p',PROJECT,'-f',this.composePath,'ps','-a','--format','json',service], 8_000);
      const rows = stdout.trim() ? stdout.trim().split(/\r?\n/).map((line) => JSON.parse(line) as Record<string,string>) : [];
      const row = rows[0];
      if (!row) return { installed:true, running:false, containerId:null, image:null, status:'STOPPED' };
      const running = row.State?.toLowerCase() === 'running';
      return { installed:true, running, containerId:row.ID ?? null, image:row.Image ?? null, status:row.Status ?? row.State ?? 'UNKNOWN' };
    } catch (error) {
      return { installed:true, running:false, containerId:null, image:null, status:error instanceof Error ? error.message : String(error) };
    }
  }

  async start(service: string) {
    this.assertService(service);
    const existing=await this.state(service);
    if(existing.running) return existing;
    const port=await this.inspectPort(15_678);
    if(port.occupied && port.expectedService!==service) throw new Error(`Порт 15678 уже занят процессом PID ${port.pid ?? 'unknown'}; чужой процесс не остановлен`);
    await this.docker(['compose','-p',PROJECT,'-f',this.composePath,'--profile','automation','up','-d',service], 120_000);
    return this.state(service);
  }

  async stop(service: string) {
    this.assertService(service);
    await this.docker(['compose','-p',PROJECT,'-f',this.composePath,'stop',service], 60_000);
    return this.state(service);
  }

  async restart(service: string) {
    this.assertService(service);
    await this.docker(['compose','-p',PROJECT,'-f',this.composePath,'restart',service], 90_000);
    return this.state(service);
  }

  async logs(service: string) {
    this.assertService(service);
    const { stdout, stderr } = await this.docker(['compose','-p',PROJECT,'-f',this.composePath,'logs','--no-color','--tail','100',service], 15_000);
    return redactSecrets(`${stdout}\n${stderr}`).slice(-32_000);
  }

  async n8nCli(args: string[], options?: { brokerPort?: number; timeout?: number }) {
    if (args.some((arg) => arg.length > 500 || /[\r\n\0]/.test(arg))) throw new Error('Некорректный аргумент n8n CLI');
    const brokerPort = options?.brokerPort ?? 5680;
    const dockerArgs = ['exec', '-e', `N8N_RUNNERS_BROKER_PORT=${brokerPort}`];
    dockerArgs.push('jarvis-phase-b-n8n', 'n8n', ...args);
    const { stdout, stderr } = await this.docker(dockerArgs, options?.timeout ?? 30_000);
    return `${stdout}\n${stderr}`.trim();
  }

  async copyToN8n(localPath: string, containerPath: string) {
    if (!containerPath.startsWith('/tmp/jarvis-')) throw new Error('Разрешено копирование только в /tmp/jarvis-*');
    await this.docker(['cp', localPath, `jarvis-phase-b-n8n:${containerPath}`], 15_000);
  }
}

export const phaseBDockerServiceManager = new PhaseBDockerServiceManager();
