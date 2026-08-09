import type { AIProvider, CompletionRequest, CompletionResponse, ModelInfo } from '../types';
import { ProviderError } from '../types';
import { ollamaAdapter } from '@/lib/jarvis/platform/ollama-adapter';

export class OllamaLocalProvider implements AIProvider {
  readonly id = 'ollama-local';
  readonly name = 'Ollama Local';

  async isAvailable(): Promise<boolean> {
    return (await ollamaAdapter.health()).state === 'HEALTHY';
  }

  async listModels(): Promise<ModelInfo[]> {
    return (await ollamaAdapter.models()).map((model) => ({
      id: model.name,
      name: model.name,
      provider: this.id,
      contextLength: model.context ?? undefined,
      capabilities: model.recommended_use,
    }));
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const models = await ollamaAdapter.models();
    const model = request.model || models.find((item) => /phi4-mini/i.test(item.name))?.name || models[0]?.name;
    if (!model) throw new ProviderError('В Ollama нет установленной модели', this.id, 'MODEL_NOT_FOUND');
    try {
      const response = await ollamaAdapter.chat({
        model,
        messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
        options: {
          temperature: request.temperature ?? 0.3,
          top_p: request.topP,
          num_predict: Math.min(request.maxTokens ?? 512, 4096),
          stop: request.stop,
        },
        cold: !models.find((item) => item.name === model)?.loaded,
      });
      const promptTokens = response.prompt_eval_count ?? 0;
      const completionTokens = response.eval_count ?? 0;
      return {
        content: response.message?.content ?? null,
        model: response.model ?? model,
        finishReason: response.done ? 'stop' : null,
        usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
        metadata: {
          provider: this.id,
          loadDurationNs: response.load_duration ?? null,
          totalDurationNs: response.total_duration ?? null,
        },
      };
    } catch (error) {
      throw new ProviderError(
        error instanceof Error ? error.message : String(error),
        this.id,
        'PROVIDER_UNAVAILABLE',
        undefined,
        true,
      );
    }
  }
}
