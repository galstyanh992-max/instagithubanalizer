// Agent OS — Mock provider fallback
// Used when no real AI provider is configured and AI_ENABLE_MOCK_FALLBACK is true.

import 'server-only';

import type { AIProvider, CompletionRequest, CompletionResponse, ModelInfo } from './types';

export class MockProvider implements AIProvider {
  readonly id = 'mock';
  readonly name = 'Mock Provider';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    return {
      content: `[Mock Mode] No real AI provider is configured. Request would have been sent to model "${request.model}" with ${request.messages.length} messages.`,
      model: request.model || 'mock',
      finishReason: 'stop',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      { id: 'mock', name: 'Mock Model', provider: this.id },
    ];
  }
}
