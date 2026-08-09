import { lstat, mkdir, realpath, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { classifyLicense } from './catalog';
import type { CuratorAssessment, RepositoryFixture } from './types';

const DETECTORS: Array<{ label: string; risk: 'medium' | 'high' | 'critical'; test: (path: string, content: string) => boolean }> = [
  { label: 'install/postinstall script', risk: 'high', test: (path, content) => {
    if (!/package\.json$/i.test(path)) return false;
    try {
      const scripts = (JSON.parse(content) as { scripts?: Record<string, unknown> }).scripts ?? {};
      return Object.keys(scripts).some((key) => /^(?:preinstall|install|postinstall|prepare|prepublish|prepublishonly|prepack|postpack)$/i.test(key));
    } catch { return /(?:preinstall|postinstall)/i.test(content); }
  } },
  { label: 'environment or credential harvesting', risk: 'critical', test: (path, content) => /(^|[\\/])\.env(?:\.|$)/i.test(path) || /(?:process\s*(?:\.\s*env|\[\s*['"]env['"]\s*\])|os\s*\.\s*environ|getenv\s*\([\s\S]{0,120}(?:TOKEN|SECRET|PASSWORD|KEY)|(?:readFile|open)\s*\([^)]*\.env|\.ssh|id_rsa)/i.test(content) },
  { label: 'prompt injection instruction', risk: 'high', test: (_path, content) => /ignore[\s\S]{0,40}(?:previous|system)[\s\S]{0,30}instructions|reveal[\s\S]{0,30}(?:secret|token|system[\s_-]*prompt)/i.test(content) },
  { label: 'dangerous Docker host mount', risk: 'critical', test: (path, content) => /(?:compose|docker-compose).*ya?ml$/i.test(path) && /(?:\/var\/run\/docker\.sock|\\\\\.\\pipe\\docker_engine|type\s*:\s*['"]?bind|(?:^|[-\s\[,])['"]?\/[^\r\n:]*\s*:\s*\/|(?:\$\{[^}]+\}|\$[A-Z_][A-Z0-9_]*)\s*:\s*\/|source\s*:\s*(?:['"]?\/|\*|['"]?\$\{)|[A-Z]:\\[^\r\n]*:\s*[A-Z]?:?\\)/im.test(content) },
  { label: 'privileged Docker configuration', risk: 'critical', test: (path, content) => /(?:compose|docker-compose).*ya?ml$/i.test(path) && /(?:privileged\s*:\s*true|(?:pid|network_mode)\s*:\s*['"]?host|(?:devices|cap_add)\s*:|seccomp\s*[=:]\s*unconfined)/i.test(content) },
  { label: 'remote script execution', risk: 'high', test: (_path, content) => /(?:(?:curl|wget)[\s\S]{0,320}(?:\||&&|;|\r?\n)\s*(?:\.\/)?(?:sh|bash|powershell)(?:\s|$)|\biex\s*\([^)]*\birm\b)/i.test(content) },
];

export function fingerprintRepositoryFixture(files: Record<string, string>): string {
  const hash = createHash('sha256');
  for (const path of Object.keys(files).sort()) hash.update(path).update('\0').update(files[path]).update('\0');
  return `sha256:${hash.digest('hex')}`;
}

function detectedLicense(files: Record<string, string>): string {
  const text = Object.entries(files).filter(([path]) => /(^|[\\/])(?:license|copying)(?:\.[^\\/]*)?$/i.test(path)).map(([, content]) => content).join('\n').toUpperCase();
  if (/GNU AFFERO GENERAL PUBLIC LICENSE/.test(text)) return 'AGPL-3.0';
  if (/GNU GENERAL PUBLIC LICENSE/.test(text)) return 'GPL-3.0';
  if (/APACHE LICENSE[\s\S]*VERSION 2\.0/.test(text)) return 'Apache-2.0';
  if (/MIT LICENSE|PERMISSION IS HEREBY GRANTED/.test(text)) return 'MIT';
  return 'UNKNOWN';
}

function canonicalRepositoryIdentity(repository: string): string {
  return repository.trim().toLowerCase()
    .replace(/^git@github\.com:/, '')
    .replace(/^ssh:\/\/git@github\.com\//, '')
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '');
}

export function assessRepositoryFixture(fixture: RepositoryFixture): CuratorAssessment {
  const findings: string[] = [];
  let risk: CuratorAssessment['risk'] = 'low';
  const weight = { low: 0, medium: 1, high: 2, critical: 3 } as const;
  const excluded = canonicalRepositoryIdentity(fixture.repository) === 'galstyanh992-max/instagithubanalizer';
  if (excluded) {
    findings.push('repository is excluded by the canonical JARVIS adaptation policy');
    risk = 'critical';
  }
  for (const [path, content] of Object.entries(fixture.files)) {
    for (const detector of DETECTORS) {
      if (!detector.test(path, content)) continue;
      findings.push(`${detector.label}: ${path}`);
      if (weight[detector.risk] > weight[risk]) risk = detector.risk;
    }
  }
  const snapshotDigest = fingerprintRepositoryFixture(fixture.files);
  const snapshotComplete = fixture.provenance === 'scanner'
    && fixture.complete === true
    && /^[a-f0-9]{40}$/i.test(fixture.sourceCommit ?? '')
    && fixture.snapshotDigest === snapshotDigest;
  if (!snapshotComplete) findings.push('snapshot provenance, completeness, commit or digest is not scanner-attested');
  const license = detectedLicense(fixture.files);
  const licensePolicy = classifyLicense(license);
  if (fixture.license && classifyLicense(fixture.license) !== licensePolicy) findings.push(`claimed license does not match repository files: ${fixture.license}`);
  if (licensePolicy !== 'ALLOW') findings.push(`license requires ${licensePolicy.toLowerCase()}: ${license}`);
  const verdict: CuratorAssessment['verdict'] = risk === 'critical' ? 'REJECTED' : risk === 'high' ? 'QUARANTINED' : snapshotComplete && licensePolicy === 'ALLOW' ? 'CANDIDATE' : 'REFERENCE_ONLY';
  return {
    repository: fixture.repository,
    verdict,
    licensePolicy,
    risk,
    findings,
    inspectedFiles: Object.keys(fixture.files).sort(),
    sourceCommit: fixture.sourceCommit ?? null,
    snapshotDigest,
    snapshotComplete,
    installAllowed: false,
    activationAllowed: false,
  };
}

export async function stageAssessment(assessment: CuratorAssessment, stagingRoot = join(process.cwd(), '.jarvis', 'staging')): Promise<string> {
  if (assessment.verdict !== 'CANDIDATE') throw new Error(`Only CANDIDATE repositories may be staged; received ${assessment.verdict}`);
  if (!assessment.snapshotComplete || !/^[a-f0-9]{40}$/i.test(assessment.sourceCommit ?? '') || !/^sha256:[a-f0-9]{64}$/i.test(assessment.snapshotDigest)) {
    throw new Error('Staging requires a scanner-attested complete snapshot bound to a commit and digest');
  }
  const slug = assessment.repository.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  if (!slug) throw new Error('Invalid repository identity');
  const root = resolve(stagingRoot);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const rootStats = await lstat(root);
  if (rootStats.isSymbolicLink()) throw new Error('Staging root must not be a symlink or junction');
  const canonicalRoot = await realpath(root);
  if (resolve(canonicalRoot).toLowerCase() !== root.toLowerCase()) throw new Error('Staging root must resolve to itself');
  const directory = resolve(canonicalRoot, `${slug}-${randomUUID()}`);
  if (!directory.startsWith(`${canonicalRoot}\\`) && !directory.startsWith(`${canonicalRoot}/`)) throw new Error('Staging path escaped root');
  await mkdir(directory, { recursive: false, mode: 0o700 });
  const canonicalDirectory = await realpath(directory);
  if (!canonicalDirectory.startsWith(`${canonicalRoot}\\`) && !canonicalDirectory.startsWith(`${canonicalRoot}/`)) throw new Error('Staging directory escaped root');
  await writeFile(join(canonicalDirectory, 'assessment.json'), JSON.stringify({ ...assessment, stagedOnly: true, commandsExecuted: [] }, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  return canonicalDirectory;
}
