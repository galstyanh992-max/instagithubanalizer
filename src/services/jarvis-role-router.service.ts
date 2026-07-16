// ─── JARVIS Role-Based Router ────────────────────────────────
// Routes requests to specialized agents based on their role in the hierarchy.
// Each role uses a specific provider+model from the model hierarchy.

import 'server-only';

import { initProviders } from '@/lib/ai-provider/server';
import { getRoleProvider, getRoleModel, resolveRoleBindings, type ModelRole } from '@/lib/ai-provider/model-hierarchy';
import type { CompletionRequest, ChatMessage } from '@/lib/ai-provider/types';
import { env } from '@/lib/env';

export interface RoleChatRequest {
  role: ModelRole;
  systemPrompt: string;
  userPrompt: string;
  /** Optional model override (otherwise uses role's default model) */
  preferredModel?: string;
  /** Temperature override */
  temperature?: number;
  /** Max tokens override */
  maxTokens?: number;
  /** Conversation history (appended between system and user) */
  history?: ChatMessage[];
}

export interface RoleChatResponse {
  content: string;
  model: string;
  provider: string;
  role: ModelRole;
  latencyMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface RoleStatus {
  role: ModelRole;
  description: string;
  providerId: string;
  providerName: string;
  model: string;
  available: boolean;
}

class JarvisRoleRouter {
  private initialized = false;

  private async ensureInit(): Promise<void> {
    if (!this.initialized) {
      await initProviders();
      this.initialized = true;
    }
  }

  /** Get status of all roles in the hierarchy. */
  getRoleStatuses(): RoleStatus[] {
    const bindings = resolveRoleBindings();
    return bindings.map((b) => ({
      role: b.role,
      description: b.description,
      providerId: b.providerId,
      providerName: b.providerId,
      model: b.model,
      available: b.available,
    }));
  }

  /** Chat with a specific role's model. */
  async chat(request: RoleChatRequest): Promise<RoleChatResponse> {
    await this.ensureInit();

    const provider = getRoleProvider(request.role);
    const model = request.preferredModel ?? getRoleModel(request.role);

    const messages: ChatMessage[] = [
      { role: 'system', content: request.systemPrompt },
      ...(request.history ?? []),
      { role: 'user', content: request.userPrompt },
    ];

    const completionRequest: CompletionRequest = {
      model,
      messages,
      temperature: request.temperature ?? 0.3,
      maxTokens: request.maxTokens ?? 4096,
    };

    const startTime = Date.now();
    const response = await provider.complete(completionRequest);
    const latencyMs = Date.now() - startTime;

    return {
      content: response.content ?? '',
      model: response.model,
      provider: provider.name,
      role: request.role,
      latencyMs,
      usage: response.usage,
    };
  }

  /**
   * Orchestrator: plans a task and delegates to specialist roles.
   * Returns a structured plan + the specialist role to execute it.
   */
  async planTask(userRequest: string): Promise<{
    plan: string;
    specialistRole: ModelRole;
    reasoning: string;
  }> {
    await this.ensureInit();

    const systemPrompt = `You are the Orchestrator of JARVIS — the CEO brain.
Your job is to analyze a user request and decide which specialist should handle it.

Available specialists:
- senior_dev (GLM 5.2): frontend, backend, refactoring, architecture, large projects, UI
- second_dev (Kimi K2.7): MCP, tool use, agent loops, fast code, UI images
- designer (GLM 5.2): design proposals
- design_critic (GPT-5.5): audits design proposals
- research (GPT-5.5): deep research, analysis, fact-checking
- browser (Kimi K2.7): browser automation, actions
- memory (Ollama Cloud): long-term memory, retrieval
- legal (Legal Armenia): RAG, PDF, laws, embeddings, reranking
- media (OpenRouter): image/video/music/transcription generation

Respond in JSON:
{
  "plan": "short plan of action",
  "specialist": "role_id from the list above",
  "reasoning": "why this specialist"
}`;

    const response = await this.chat({
      role: 'orchestrator',
      systemPrompt,
      userPrompt: userRequest,
      temperature: 0.2,
      maxTokens: 1024,
    });

    try {
      const parsed = JSON.parse(response.content);
      return {
        plan: String(parsed.plan ?? ''),
        specialistRole: (String(parsed.specialist ?? 'senior_dev') as ModelRole),
        reasoning: String(parsed.reasoning ?? ''),
      };
    } catch {
      // If orchestrator returns non-JSON, default to senior_dev
      return {
        plan: response.content,
        specialistRole: 'senior_dev',
        reasoning: 'Defaulted to senior_dev (orchestrator returned non-JSON)',
      };
    }
  }

  /**
   * Delegate a task to a specialist role.
   */
  async delegateToSpecialist(
    role: ModelRole,
    task: string,
    context?: string,
    history?: ChatMessage[],
  ): Promise<RoleChatResponse> {
    const systemPrompt = this.getSpecialistSystemPrompt(role, context);
    return this.chat({
      role,
      systemPrompt,
      userPrompt: task,
      history,
      temperature: role === 'designer' ? 0.7 : 0.3,
      maxTokens: role === 'senior_dev' || role === 'second_dev' ? 8192 : 4096,
    });
  }

  private getSpecialistSystemPrompt(role: ModelRole, context?: string): string {
    const ctx = context ? `\n\nPROJECT CONTEXT:\n${context}` : '';
    switch (role) {
      case 'orchestrator':
        return `You are the JARVIS Orchestrator — the CEO brain. You plan, coordinate, and ensure architectural alignment.${ctx}`;
      case 'senior_dev':
        return `You are the JARVIS Senior Software Engineer (GLM 5.2). You handle frontend, backend, refactoring, architecture, and large projects. You write clean, type-safe, production-grade code. You think in components, interfaces, patterns, and system boundaries.${ctx}`;
      case 'second_dev':
        return `You are the JARVIS Automation Engineer (Kimi K2.7 Code). You specialize in MCP, tool use, agent loops, fast code, and UI image work. You write concise, action-oriented code.${ctx}`;
      case 'designer':
        return `You are the JARVIS Creative Director (GLM 5.2). You generate design proposals with strong visual hierarchy, modern aesthetics, and premium feel. You think in layouts, colors, typography, and emotion.${ctx}`;
      case 'design_critic':
        return `You are the JARVIS Design Critic (GPT-5.5 Thinking). You audit design proposals and identify what looks generic, what can be improved, and what can be made more premium. You give specific, actionable feedback.${ctx}`;
      case 'research':
        return `You are the JARVIS Research Analyst (GPT-5.5 Thinking). You do deep research, compare alternatives, cite sources, and provide well-organized findings with clear recommendations.${ctx}`;
      case 'browser':
        return `You are the JARVIS Browser Agent (Kimi K2.7). You execute actions in the browser: navigate, click, type, scrape. You think in selectors, flows, and verification steps.${ctx}`;
      case 'memory':
        return `You are the JARVIS Memory Agent (Ollama Cloud). You manage long-term memory: store, retrieve, and surface relevant context. You think in embeddings, similarity, and relevance.${ctx}`;
      case 'legal':
        return `You are the JARVIS Legal Armenia AI. You work ONLY with legal documents, RAG, PDF, laws, embeddings, and reranking. You never mix with coding tasks. You cite laws precisely and flag jurisdictional issues.${ctx}`;
      case 'media':
        return `You are the JARVIS Media Agent. You generate image, video, music, and transcription requests.${ctx}`;
      default:
        return `You are a JARVIS specialist agent.${ctx}`;
    }
  }
}

export const jarvisRoleRouter = new JarvisRoleRouter();
export type { ModelRole } from '@/lib/ai-provider/model-hierarchy';