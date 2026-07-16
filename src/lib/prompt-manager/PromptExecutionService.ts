import { providerRegistry } from '@/lib/ai-provider/provider-registry';
import type { CompletionRequest, ChatMessage } from '@/lib/ai-provider/types';
import { resolveOpenRouterModelAlias } from '@/lib/ai-provider/model-registry';
import { db } from '@/lib/db';
import { initProviders } from '@/lib/ai-provider/server';

export class PromptExecutionGovernanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptExecutionGovernanceError';
  }
}

export class PromptExecutionService {
  private async resolveProvider() {
    await initProviders();
    const preferred = providerRegistry.has('openrouter') ? 'openrouter' : providerRegistry.listIds()[0];
    if (!preferred) throw new Error('No AI provider is configured');
    return providerRegistry.getOrThrow(preferred);
  }

  /**
   * Run a dry-run execution against a specific OpenRouter model for a prompt version
   */
  async executeSandboxRun(
    modelId: string, 
    systemPrompt: string | null,
    developerPrompt: string | null,
    userPrompt: string | null,
    variables: Record<string, string> = {},
    agentId: string | null = null,
    templateId: string | null = null,
    versionId: string | null = null
  ): Promise<{
    content: string | null;
    latencyMs: number;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
    } | null;
    model: string;
    provider: string;
    error?: string;
  }> {
    const messages: ChatMessage[] = [];

    // Governance: Validate Variable Inputs
    let totalVarSize = 0;
    for (const [k, v] of Object.entries(variables)) {
      if (typeof v !== 'string') continue;
      if (v.length > 10000) {
        throw new PromptExecutionGovernanceError(`Variable '${k}' exceeds maximum allowed length of 10,000 characters.`);
      }
      totalVarSize += v.length;
    }
    if (totalVarSize > 50000) {
      throw new PromptExecutionGovernanceError(`Total variable payload exceeds maximum allowed length of 50,000 characters.`);
    }

    // Combine system & developer prompts based on the provider
    let combinedSystem = '';
    if (systemPrompt) combinedSystem += systemPrompt + '\n';
    if (developerPrompt) combinedSystem += developerPrompt + '\n';
    
    // Inject variables
    let finalSystem = combinedSystem;
    let finalUser = userPrompt || '';
    
    for (const [k, v] of Object.entries(variables)) {
      finalSystem = finalSystem.replace(new RegExp(`{{${k}}}`, 'g'), v);
      finalUser = finalUser.replace(new RegExp(`{{${k}}}`, 'g'), v);
    }

    if (finalSystem.trim()) {
      messages.push({ role: 'system', content: finalSystem.trim() });
    }
    
    if (finalUser.trim()) {
      messages.push({ role: 'user', content: finalUser.trim() });
    }

    if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Say hello' }); // Failsafe
    }

    // Governance: Validate Payload Size
    const totalPayloadSize = finalSystem.length + finalUser.length;
    if (totalPayloadSize > 100000) {
      throw new PromptExecutionGovernanceError(`Total combined prompt payload (${totalPayloadSize} chars) exceeds maximum allowed length of 100,000 characters.`);
    }

    const resolvedModel = resolveOpenRouterModelAlias(modelId);
    const provider = await this.resolveProvider();
    const providerName = provider.name;

    const req: CompletionRequest = {
      model: resolvedModel,
      messages,
      maxTokens: 4096,
      temperature: 0.7,
    };

    const startTime = Date.now();
    try {
      const response = await provider.complete(req);
      const latencyMs = Date.now() - startTime;
      
      // Calculate estimated cost (rough standard OpenRouter average logic if specific isn't available)
      // OpenRouter models charge per token, ideally we'd fetch actual rates, 
      // but we will do a basic estimate.
      let estimatedCostUsd = 0;
      if (response.usage) {
        // Mock estimate: $0.001 per 1k input, $0.002 per 1k output
        estimatedCostUsd = ((response.usage.promptTokens / 1000) * 0.001) + 
                           ((response.usage.completionTokens / 1000) * 0.002);
      }

      // Persist to PromptCostLog
      try {
        await db.promptCostLog.create({
          data: {
            promptTemplateId: templateId,
            promptVersionId: versionId,
            provider: providerName,
            model: resolvedModel,
            tokensIn: response.usage?.promptTokens || 0,
            tokensOut: response.usage?.completionTokens || 0,
            estimatedCostUsd: estimatedCostUsd,
            latencyMs,
            agentId,
            isDryRun: true
          }
        });

        // Audit trace
        await db.promptAuditLog.create({
          data: {
            promptTemplateId: templateId || 'anonymous_sandbox',
            promptVersionId: versionId,
            action: 'dry_run',
            agentId: agentId || 'system',
            details: JSON.stringify({ model: resolvedModel })
          }
        });
      } catch (err) {
        console.error('Failed to log prompt cost:', err);
      }

      return {
        content: response.content,
        latencyMs,
        usage: response.usage ? { ...response.usage, estimatedCostUsd } : null,
        model: response.model,
        provider: providerName,
      };
    } catch (error: any) {
      return {
        content: null,
        latencyMs: Date.now() - startTime,
        usage: null,
        model: resolvedModel,
        provider: providerName,
        error: error.message || 'Unknown error occurred during execution'
      };
    }
  }

  /**
   * Run the same prompt across multiple models concurrently
   */
  async compareModels(
    modelIds: string[],
    systemPrompt: string | null,
    developerPrompt: string | null,
    userPrompt: string | null,
    variables: Record<string, string> = {},
    agentId: string | null = null,
    templateId: string | null = null,
    versionId: string | null = null
  ) {
    // Governance: Max Compared Models
    if (modelIds.length > 5) {
      throw new PromptExecutionGovernanceError(`Cannot compare more than 5 models at once. Requested: ${modelIds.length}`);
    }

    const promises = modelIds.map(modelId => 
      this.executeSandboxRun(modelId, systemPrompt, developerPrompt, userPrompt, variables, agentId, templateId, versionId)
    );
    return Promise.all(promises);
  }
}
