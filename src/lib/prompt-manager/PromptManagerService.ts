import { db } from '../db';
import { eventBus } from '../event-bus';
import { EventTypes } from '../types/events';
import { promptGeneratorService, TaskSpecification } from './PromptGeneratorService';

export class PromptOpsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptOpsError';
  }
}

export class InvalidPromotionError extends PromptOpsError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPromotionError';
  }
}

export class PromptNotFoundError extends PromptOpsError {
  constructor(message: string) {
    super(message);
    this.name = 'PromptNotFoundError';
  }
}

export interface CreatePromptTemplateInput {
  key: string;
  name: string;
  description?: string;
  type?: string;
  targetAgentId?: string;
  createdByAgentId?: string;
}

export interface CreatePromptVersionInput {
  promptTemplateId: string;
  systemPrompt?: string;
  developerPrompt?: string;
  userPrompt?: string;
  templateVariables?: any;
  outputContract?: any;
  providerAdapter?: string;
  metadata?: any;
  createdByAgentId?: string;
}

class PromptManagerService {
  private static instance: PromptManagerService | null = null;

  private constructor() {}

  static getInstance(): PromptManagerService {
    if (!PromptManagerService.instance) {
      PromptManagerService.instance = new PromptManagerService();
    }
    return PromptManagerService.instance;
  }

  async listTemplates() {
    return await db.promptTemplate.findMany({
      where: { archivedAt: null },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 5
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getTemplate(key: string) {
    return db.promptTemplate.findUnique({
      where: { key },
      include: {
        versions: {
          orderBy: { version: 'desc' }
        }
      }
    });
  }

  async createTemplate(data: CreatePromptTemplateInput) {
    const template = await db.promptTemplate.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        type: data.type || 'system',
        status: 'draft',
        targetAgentId: data.targetAgentId
      }
    });

    await db.promptAuditLog.create({
      data: {
        promptTemplateId: template.id,
        action: 'create',
        agentId: data.createdByAgentId || 'system',
        details: JSON.stringify({ key: data.key, name: data.name })
      }
    });

    return template;
  }

  async addVersion(data: CreatePromptVersionInput) {
    const lastVersion = await db.promptVersion.findFirst({
      where: { promptTemplateId: data.promptTemplateId },
      orderBy: { version: 'desc' }
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    const newVer = await db.promptVersion.create({
      data: {
        promptTemplateId: data.promptTemplateId,
        version: nextVersion,
        systemPrompt: data.systemPrompt,
        developerPrompt: data.developerPrompt,
        userPrompt: data.userPrompt,
        templateVariables: data.templateVariables ? JSON.stringify(data.templateVariables) : null,
        outputContract: data.outputContract ? JSON.stringify(data.outputContract) : null,
        providerAdapter: data.providerAdapter,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        environment: 'draft',
        createdByAgentId: data.createdByAgentId,
      }
    });

    await db.promptAuditLog.create({
      data: {
        promptTemplateId: data.promptTemplateId,
        promptVersionId: newVer.id,
        action: 'add_version',
        agentId: data.createdByAgentId || 'system',
        details: JSON.stringify({ version: nextVersion })
      }
    });

    return newVer;
  }

  async generateAndAddVariants(templateId: string, task: TaskSpecification, createdByAgentId?: string) {
    const variants = promptGeneratorService.generateVariants(task);
    const addedVersions: any[] = [];

    // Map each provider's variant into a distinct version under this template
    for (const [provider, structuredPrompt] of Object.entries(variants)) {
      const version = await this.addVersion({
        promptTemplateId: templateId,
        systemPrompt: structuredPrompt.system,
        developerPrompt: structuredPrompt.developer,
        userPrompt: structuredPrompt.user,
        providerAdapter: provider,
        createdByAgentId
      });
      addedVersions.push(version);
    }

    return addedVersions;
  }

  async promoteVersion(templateId: string, versionId: string, targetEnvironment: 'staging' | 'production', updatedByAgentId?: string) {
    return db.$transaction(async (tx) => {
      const version = await tx.promptVersion.findUnique({ where: { id: versionId } });
      if (!version) throw new PromptNotFoundError(`Version ${versionId} not found`);

      // Validation
      if (targetEnvironment === 'production') {
        if (!version.systemPrompt && !version.developerPrompt && !version.userPrompt) {
          throw new InvalidPromotionError('Cannot promote to production: Pack is empty (needs system, developer, or user prompt)');
        }
        if (version.environment !== 'staging') {
          throw new InvalidPromotionError(`Cannot promote to production: Version must be in staging first, current is ${version.environment}`);
        }
      } else if (targetEnvironment === 'staging') {
        if (version.environment !== 'draft') {
          throw new InvalidPromotionError(`Cannot promote to staging: Version must be in draft first, current is ${version.environment}`);
        }
      }

      // Demote existing in target environment
      await tx.promptVersion.updateMany({
        where: { promptTemplateId: templateId, environment: targetEnvironment },
        data: { environment: 'archived' }
      });

      const auditData = { promotedAt: new Date().toISOString(), promotedTo: targetEnvironment };

      const promoted = await tx.promptVersion.update({
        where: { id: versionId },
        data: { 
          environment: targetEnvironment,
          updatedByAgentId,
          auditMetadata: JSON.stringify(auditData)
        }
      });

      // Sync template status
      await tx.promptTemplate.update({
        where: { id: templateId },
        data: { status: targetEnvironment }
      });

      await tx.promptAuditLog.create({
        data: {
          promptTemplateId: templateId,
          promptVersionId: version.id,
          action: 'promote',
          agentId: updatedByAgentId || 'system',
          environment: targetEnvironment,
          details: JSON.stringify({ version: version.version, target: targetEnvironment })
        }
      });

      return promoted;
    });
  }

  async rollbackVersion(templateId: string, targetVersion: number, updatedByAgentId?: string) {
    return db.$transaction(async (tx) => {
      const target = await tx.promptVersion.findFirst({
        where: { promptTemplateId: templateId, version: targetVersion }
      });

      if (!target) throw new PromptNotFoundError(`Version ${targetVersion} not found`);

      // Demote current production
      await tx.promptVersion.updateMany({
        where: { promptTemplateId: templateId, environment: 'production' },
        data: { environment: 'archived' }
      });

      const auditData = { rolledBackAt: new Date().toISOString(), reason: 'rollback' };

      const activated = await tx.promptVersion.update({
        where: { id: target.id },
        data: { 
          environment: 'production',
          updatedByAgentId,
          auditMetadata: JSON.stringify(auditData)
        }
      });

      await tx.promptTemplate.update({
        where: { id: templateId },
        data: { status: 'production' }
      });

      await tx.promptAuditLog.create({
        data: {
          promptTemplateId: templateId,
          promptVersionId: target.id,
          action: 'rollback',
          agentId: updatedByAgentId || 'system',
          environment: 'production',
          details: JSON.stringify({ version: targetVersion })
        }
      });

      return activated;
    });
  }

  async archiveTemplate(templateId: string, archivedByAgentId?: string) {
    return db.$transaction(async (tx) => {
      await tx.promptVersion.updateMany({
        where: { promptTemplateId: templateId },
        data: { environment: 'archived' }
      });

      const archivedTemplate = await tx.promptTemplate.update({
        where: { id: templateId },
        data: { status: 'deprecated', archivedAt: new Date() }
      });

      await tx.promptAuditLog.create({
        data: {
          promptTemplateId: templateId,
          action: 'archive',
          agentId: archivedByAgentId || 'system',
          details: JSON.stringify({ key: archivedTemplate.key })
        }
      });

      return archivedTemplate;
    });
  }

  async getActivePrompt(key: string, environment: 'staging' | 'production' = 'production', provider?: string) {
    const template = await db.promptTemplate.findFirst({
      where: { key, archivedAt: null },
      include: {
        versions: {
          where: { environment },
          orderBy: { version: 'desc' }
        }
      }
    });

    if (!template || template.versions.length === 0) return null;

    const specific = provider ? template.versions.find(v => v.providerAdapter === provider) : null;
    const generic = template.versions.find(v => !v.providerAdapter);

    return specific || generic || template.versions[0];
  }

  formatPromptForProvider(promptContent: string, provider: string) {
    switch (provider) {
      case 'claude':
      case 'anthropic':
        return `Human: ${promptContent}\n\nAssistant:`;
      case 'openai':
        return promptContent;
      case 'gemini':
        return `User: ${promptContent}\nModel:`;
      default:
        return promptContent;
    }
  }
}

export const promptManagerService = PromptManagerService.getInstance();
