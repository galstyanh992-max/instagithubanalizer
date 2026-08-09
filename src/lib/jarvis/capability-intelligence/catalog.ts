import type { RepositoryKnowledgeRecord } from './types';

type Seed = [repository: string, capabilities: string[], mode: RepositoryKnowledgeRecord['integrationMode'], license?: string];

const C1: Seed[] = [
  ['firecrawl/firecrawl', ['web.crawl.bulk', 'web.extract.markdown'], 'api', 'AGPL-3.0'],
  ['ComposioHQ/composio', ['integration.catalog', 'tool.connect'], 'api', 'Apache-2.0'],
  ['crewAIInc/crewAI', ['agent.patterns', 'task.decomposition'], 'reference', 'MIT'],
  ['microsoft/autogen', ['agent.patterns', 'multi_agent.reference'], 'reference', 'CC-BY-4.0'],
  ['continuedev/continue', ['code.assistance', 'repository.context'], 'reference', 'Apache-2.0'],
  ['cline/cline', ['code.assistance', 'tool.use.reference'], 'reference', 'Apache-2.0'],
  ['RooVetGit/Roo-Code', ['code.assistance', 'tool.use.reference'], 'reference', 'Apache-2.0'],
  ['qdrant/qdrant', ['memory.vector', 'search.semantic'], 'api', 'Apache-2.0'],
  ['chroma-core/chroma', ['memory.vector', 'search.semantic'], 'api', 'Apache-2.0'],
  ['lancedb/lancedb', ['memory.vector', 'search.semantic'], 'api', 'Apache-2.0'],
  ['run-llama/llama_index', ['rag.index', 'document.ingest'], 'reference', 'MIT'],
  ['deepset-ai/haystack', ['rag.pipeline', 'document.ingest'], 'reference', 'Apache-2.0'],
  ['temporalio/temporal', ['workflow.durable', 'automation.queue'], 'api', 'MIT'],
  ['Unstructured-IO/unstructured', ['document.parse', 'document.ocr'], 'api', 'Apache-2.0'],
  ['microsoft/markitdown', ['document.convert.markdown'], 'cli', 'MIT'],
  ['microsoft/OmniParser', ['vision.ui.parse', 'browser.interaction'], 'api', 'CC-BY-4.0'],
  ['remotion-dev/remotion', ['video.render', 'media.compose'], 'cli', 'SEE-REPOSITORY'],
  ['rhasspy/piper', ['voice.tts', 'audio.local'], 'cli', 'MIT'],
  ['APIs-guru/openapi-directory', ['api.discovery', 'openapi.catalog'], 'reference', 'MIT'],
  ['VoltAgent/awesome-mcp-servers', ['mcp.discovery', 'tool.discovery'], 'reference', 'CC0-1.0'],
  ['punkpeye/awesome-mcp-servers', ['mcp.discovery', 'tool.discovery'], 'reference', 'MIT'],
  ['openclaw/clawhub', ['skill.discovery'], 'reference', 'MIT'],
  ['smithery-ai/cli', ['mcp.discovery', 'tool.discovery'], 'cli', 'AGPL-3.0'],
];

const C2: Seed[] = [
  ['OpenHands/OpenHands', ['coding_agent.reference'], 'reference', 'MIT'],
  ['FoundationAgents/OpenManus', ['agent.patterns'], 'reference', 'MIT'],
  ['Fosowl/agenticSeek', ['agent.patterns', 'research.reference'], 'reference', 'GPL-3.0'],
  ['microsoft/semantic-kernel', ['agent.patterns', 'provider.routing.reference'], 'reference', 'MIT'],
  ['langgenius/dify', ['workflow.reference', 'agent.platform.reference'], 'reference', 'Apache-2.0'],
  ['danny-avila/LibreChat', ['chat.ui.reference', 'provider.routing.reference'], 'reference', 'MIT'],
  ['open-webui/open-webui', ['chat.ui.reference'], 'reference', 'BSD-3-Clause'],
  ['PromtEngineer/localGPT', ['rag.reference', 'local_ai.reference'], 'reference', 'Apache-2.0'],
  ['openinterpreter/open-interpreter', ['computer_use.reference'], 'reference', 'AGPL-3.0'],
  ['clawdbot/openclaw', ['agent.patterns'], 'reference', 'UNKNOWN'],
  ['browseros-ai/BrowserOS', ['browser.reference'], 'reference', 'AGPL-3.0'],
  ['FSoft-AI4Code/CodeGraph', ['code.graph.reference'], 'reference', 'MIT'],
  ['NexaAI/OmniRoute', ['provider.routing.reference'], 'reference', 'UNKNOWN'],
  ['Dokploy/dokploy', ['deployment.reference'], 'reference', 'Apache-2.0'],
];

export function classifyLicense(license: string): RepositoryKnowledgeRecord['licensePolicy'] {
  const normalized = license.trim().toUpperCase();
  if (/^(MIT|APACHE-2\.0|BSD-2-CLAUSE|BSD-3-CLAUSE|ISC|CC0-1\.0)$/.test(normalized)) return 'ALLOW';
  if (/GPL|AGPL|LGPL|CC-BY|SEE-REPOSITORY/.test(normalized)) return 'REVIEW';
  if (/PROPRIETARY|UNLICENSED/.test(normalized)) return 'BLOCK';
  return 'UNKNOWN';
}

function make(seed: Seed, tier: 'C1' | 'C2'): RepositoryKnowledgeRecord {
  const [repository, capabilities, integrationMode, license = 'UNKNOWN'] = seed;
  const name = repository.split('/').at(-1) ?? repository;
  return {
    id: repository.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    repository,
    url: `https://github.com/${repository}`,
    description: `${tier} repository knowledge record for ${capabilities.join(', ')}`,
    lifecycle: tier === 'C2' || integrationMode === 'reference' ? 'REFERENCE_ONLY' : 'UNVERIFIED',
    tier,
    capabilities,
    integrationMode,
    license,
    licensePolicy: classifyLicense(license),
    trust: 'community',
    localFirst: !['api'].includes(integrationMode),
    requiresDocker: ['api'].includes(integrationMode),
    requiresGpu: repository.toLowerCase().includes('omniparser'),
    hasInstallScripts: integrationMode !== 'reference',
    securityFindings: [],
    compatibilityNotes: ['Catalog metadata only; verify source, release and digest before staging.'],
    sourceCommit: null,
    artifactDigest: null,
    lastVerifiedAt: null,
    autoInstallAllowed: false,
    autoActivationAllowed: false,
  };
}

export const KNOWN_REPOSITORIES: RepositoryKnowledgeRecord[] = [
  ...C1.map((seed) => make(seed, 'C1')),
  ...C2.map((seed) => make(seed, 'C2')),
];

export function repositoryKnowledgeSummary(records = KNOWN_REPOSITORIES) {
  return {
    total: records.length,
    verified: records.filter((record) => record.lifecycle === 'VERIFIED').length,
    referenceOnly: records.filter((record) => record.lifecycle === 'REFERENCE_ONLY').length,
    candidates: records.filter((record) => record.lifecycle === 'CANDIDATE').length,
    quarantined: records.filter((record) => record.lifecycle === 'QUARANTINED').length,
    rejected: records.filter((record) => record.lifecycle === 'REJECTED').length,
  };
}
