// ─── Agent OS — Marketplace Service ───────────────────────────
// Marketplace architecture: browse, publish, install, rate, feature.
// Seeds default items from skill packs and tool packs.

import { db } from '../db';

// ─── Types ────────────────────────────────────────────────────

export type MarketplaceItemType = 'skill_pack' | 'tool_pack' | 'agent_template' | 'workflow_template';

export interface CreateMarketplaceItemInput {
  type: MarketplaceItemType;
  key: string;
  name: string;
  description: string;
  author?: string;
  version?: string;
  icon?: string;
  color?: string;
  category?: string;
  tags?: string[];
  content?: Record<string, unknown>;
  featured?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceFilters {
  type?: string;
  category?: string;
  search?: string;
}

// ─── Default Marketplace Items ────────────────────────────────
// Maps 1:1 to the Skill Packs and Tool Packs in the packs system.

const DEFAULT_MARKETPLACE_ITEMS: CreateMarketplaceItemInput[] = [
  // ── Skill Packs (10) ─────────────────────────────────────────
  {
    type: 'skill_pack',
    key: 'legal_pack',
    name: 'Legal & Compliance Pack',
    description: 'Legal analysis, compliance review, contract analysis, and regulatory research skills for legal-oriented tasks.',
    icon: '⚖️',
    color: '#8B5CF6',
    category: 'specialized',
    tags: ['legal', 'compliance', 'contracts', 'regulatory'],
    featured: true,
  },
  {
    type: 'skill_pack',
    key: 'research_pack',
    name: 'Deep Research Pack',
    description: 'Advanced research, deep research, web search, fact-checking, and source verification skills.',
    icon: '🔬',
    color: '#3B82F6',
    category: 'analysis',
    tags: ['research', 'deep-research', 'web-search', 'fact-check'],
    featured: true,
  },
  {
    type: 'skill_pack',
    key: 'coding_pack',
    name: 'Full-Stack Coding Pack',
    description: 'Frontend development, backend development, debugging, code review, and refactoring skills.',
    icon: '💻',
    color: '#10B981',
    category: 'technical',
    tags: ['coding', 'frontend', 'backend', 'debugging', 'review'],
    featured: true,
  },
  {
    type: 'skill_pack',
    key: 'design_pack',
    name: 'UI/UX Design Pack',
    description: 'UI design, UX research, wireframing, prototyping, and accessibility audit skills.',
    icon: '🎨',
    color: '#EC4899',
    category: 'creation',
    tags: ['design', 'ui', 'ux', 'wireframe', 'accessibility'],
    featured: false,
  },
  {
    type: 'skill_pack',
    key: 'communication_pack',
    name: 'Communication & Writing Pack',
    description: 'Technical writing, documentation, summarization, and presentation skills.',
    icon: '✍️',
    color: '#F59E0B',
    category: 'communication',
    tags: ['writing', 'documentation', 'summarization', 'presentation'],
    featured: false,
  },
  {
    type: 'skill_pack',
    key: 'automation_pack',
    name: 'Automation & DevOps Pack',
    description: 'CI/CD, deployment automation, infrastructure management, and monitoring skills.',
    icon: '🚀',
    color: '#F97316',
    category: 'automation',
    tags: ['devops', 'ci-cd', 'deployment', 'infrastructure', 'monitoring'],
    featured: false,
  },
  {
    type: 'skill_pack',
    key: 'management_pack',
    name: 'Project Management Pack',
    description: 'Planning, task decomposition, risk assessment, and progress tracking skills.',
    icon: '📋',
    color: '#6366F1',
    category: 'management',
    tags: ['planning', 'task-management', 'risk', 'tracking'],
    featured: false,
  },
  {
    type: 'skill_pack',
    key: 'analysis_pack',
    name: 'Data Analysis Pack',
    description: 'Data analysis, statistical analysis, visualization, and reporting skills.',
    icon: '📊',
    color: '#14B8A6',
    category: 'analysis',
    tags: ['data', 'statistics', 'visualization', 'reporting'],
    featured: false,
  },
  {
    type: 'skill_pack',
    key: 'media_pack',
    name: 'Media & Content Pack',
    description: 'Image generation, video editing, audio processing, and content creation skills.',
    icon: '🎬',
    color: '#E11D48',
    category: 'media',
    tags: ['media', 'image', 'video', 'audio', 'content'],
    featured: false,
  },
  {
    type: 'skill_pack',
    key: 'security_pack',
    name: 'Security & Audit Pack',
    description: 'Security review, vulnerability scanning, penetration testing, and compliance audit skills.',
    icon: '🛡️',
    color: '#EF4444',
    category: 'specialized',
    tags: ['security', 'vulnerability', 'penetration', 'audit', 'compliance'],
    featured: true,
  },

  // ── Tool Packs (6) ───────────────────────────────────────────
  {
    type: 'tool_pack',
    key: 'dev_tools',
    name: 'Developer Tools Pack',
    description: 'Essential development tools: filesystem access, terminal, git, and code search capabilities.',
    icon: '🛠️',
    color: '#10B981',
    category: 'development',
    tags: ['filesystem', 'terminal', 'git', 'development'],
    featured: true,
  },
  {
    type: 'tool_pack',
    key: 'analytics_tools',
    name: 'Analytics Tools Pack',
    description: 'Data analytics and database tools: database queries, RAG indexing, and data visualization.',
    icon: '📈',
    color: '#3B82F6',
    category: 'analytics',
    tags: ['database', 'rag', 'analytics', 'data'],
    featured: false,
  },
  {
    type: 'tool_pack',
    key: 'browser_tools',
    name: 'Browser & Web Tools Pack',
    description: 'Web interaction tools: browser automation, web search, and content extraction.',
    icon: '🌐',
    color: '#8B5CF6',
    category: 'browser',
    tags: ['browser', 'web', 'search', 'extraction'],
    featured: true,
  },
  {
    type: 'tool_pack',
    key: 'document_tools',
    name: 'Document Processing Pack',
    description: 'Document and content tools: document parsing, OCR, translation, and RAG.',
    icon: '📄',
    color: '#F59E0B',
    category: 'document',
    tags: ['document', 'ocr', 'translation', 'rag'],
    featured: false,
  },
  {
    type: 'tool_pack',
    key: 'deployment_tools',
    name: 'Deployment & Infra Pack',
    description: 'Deployment and infrastructure tools: deployment, notification, and monitoring.',
    icon: '☁️',
    color: '#F97316',
    category: 'deployment',
    tags: ['deployment', 'notification', 'monitoring', 'infrastructure'],
    featured: false,
  },
  {
    type: 'tool_pack',
    key: 'ai_provider_tools',
    name: 'AI Provider Tools Pack',
    description: 'AI model access tools: model resolution, AI providers, and content generation.',
    icon: '🤖',
    color: '#EC4899',
    category: 'ai',
    tags: ['ai', 'model', 'provider', 'generation'],
    featured: true,
  },
];

// ─── Marketplace Service ─────────────────────────────────────

class MarketplaceService {
  private static instance: MarketplaceService | null = null;

  private constructor() {}

  static getInstance(): MarketplaceService {
    if (!MarketplaceService.instance) {
      MarketplaceService.instance = new MarketplaceService();
    }
    return MarketplaceService.instance;
  }

  // ── List Items (Browse) ───────────────────────────────────────

  /**
   * Browse marketplace items with optional filters.
   */
  async listItems(filters?: MarketplaceFilters) {
    const where: Record<string, unknown> = {
      status: 'published',
    };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      where.OR = [
        { name: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { key: { contains: searchTerm } },
      ];
      // Remove status from top-level when using OR
      delete where.status;
      // Re-add status inside each OR condition
      where.OR = (where.OR as Array<Record<string, unknown>>).map((cond) => ({
        ...cond,
        status: 'published',
      }));
    }

    return db.marketplaceItem.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { installCount: 'desc' },
        { rating: 'desc' },
      ],
    });
  }

  // ── Get Item ──────────────────────────────────────────────────

  /**
   * Get marketplace item details by key.
   */
  async getItem(key: string) {
    const item = await db.marketplaceItem.findUnique({
      where: { key },
    });

    if (!item) return null;

    return {
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : [],
      content: item.content ? JSON.parse(item.content) : null,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    };
  }

  // ── Publish Item ──────────────────────────────────────────────

  /**
   * Publish a new marketplace item.
   */
  async publishItem(data: CreateMarketplaceItemInput) {
    const item = await db.marketplaceItem.create({
      data: {
        type: data.type,
        key: data.key,
        name: data.name,
        description: data.description,
        author: data.author ?? 'Agent OS',
        version: data.version ?? '1.0.0',
        icon: data.icon ?? null,
        color: data.color ?? null,
        category: data.category ?? null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        content: data.content ? JSON.stringify(data.content) : null,
        featured: data.featured ?? false,
        status: 'published',
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    return {
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : [],
      content: item.content ? JSON.parse(item.content) : null,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    };
  }

  // ── Install from Marketplace ──────────────────────────────────

  /**
   * Install a marketplace item to an agent.
   * Delegates to InstallationService for skill/tool installation.
   */
  async installFromMarketplace(itemKey: string, agentId: string) {
    const item = await db.marketplaceItem.findUnique({
      where: { key: itemKey },
    });

    if (!item) {
      return { success: false, message: `Marketplace item not found: ${itemKey}` };
    }

    if (item.status !== 'published') {
      return { success: false, message: `Item "${itemKey}" is not available for installation` };
    }

    // Use lazy import to avoid circular dependency
    const { installationService } = await import('../installation/InstallationService');

    if (item.type === 'skill_pack') {
      const result = await installationService.installPack(itemKey, agentId, 'skill');

      // Increment marketplace install count
      await db.marketplaceItem.update({
        where: { id: item.id },
        data: { installCount: { increment: 1 } },
      });

      return {
        success: true,
        message: `Skill pack "${item.name}" installed: ${result.installed}/${result.total} skills`,
        details: result,
      };
    }

    if (item.type === 'tool_pack') {
      const result = await installationService.installPack(itemKey, agentId, 'tool');

      // Increment marketplace install count
      await db.marketplaceItem.update({
        where: { id: item.id },
        data: { installCount: { increment: 1 } },
      });

      return {
        success: true,
        message: `Tool pack "${item.name}" installed: ${result.installed}/${result.total} tools`,
        details: result,
      };
    }

    // Agent templates and workflow templates — placeholder for future implementation
    // Increment install count
    await db.marketplaceItem.update({
      where: { id: item.id },
      data: { installCount: { increment: 1 } },
    });

    return {
      success: true,
      message: `Item "${item.name}" (${item.type}) installation queued`,
    };
  }

  // ── Rate Item ─────────────────────────────────────────────────

  /**
   * Rate a marketplace item (1-5 stars).
   * Updates the average rating and review count.
   */
  async rateItem(itemKey: string, rating: number) {
    const clampedRating = Math.max(1, Math.min(5, rating));

    const item = await db.marketplaceItem.findUnique({
      where: { key: itemKey },
    });

    if (!item) {
      return { success: false, message: `Marketplace item not found: ${itemKey}` };
    }

    // Calculate new average rating
    const currentTotal = item.rating * item.reviewCount;
    const newReviewCount = item.reviewCount + 1;
    const newRating = (currentTotal + clampedRating) / newReviewCount;

    await db.marketplaceItem.update({
      where: { id: item.id },
      data: {
        rating: Math.round(newRating * 100) / 100, // Round to 2 decimal places
        reviewCount: newReviewCount,
      },
    });

    return {
      success: true,
      message: `Rated "${item.name}" ${clampedRating}/5`,
      newRating: Math.round(newRating * 100) / 100,
      totalReviews: newReviewCount,
    };
  }

  // ── Get Featured ──────────────────────────────────────────────

  /**
   * Get featured marketplace items.
   */
  async getFeatured() {
    const items = await db.marketplaceItem.findMany({
      where: { featured: true, status: 'published' },
      orderBy: { rating: 'desc' },
    });

    return items.map((item) => ({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : [],
      content: item.content ? JSON.parse(item.content) : null,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    }));
  }

  // ── Seed Defaults ─────────────────────────────────────────────

  /**
   * Seed default marketplace items from the 10 skill packs + 6 tool packs.
   * Idempotent: does not overwrite existing items.
   */
  async seedDefaults(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const itemData of DEFAULT_MARKETPLACE_ITEMS) {
      const existing = await db.marketplaceItem.findUnique({
        where: { key: itemData.key },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await this.publishItem(itemData);
      created++;
    }

    return { created, skipped };
  }

  // ── Get Default Items ─────────────────────────────────────────

  /**
   * Get the default marketplace item definitions (without creating them).
   */
  getDefaultItems(): CreateMarketplaceItemInput[] {
    return [...DEFAULT_MARKETPLACE_ITEMS];
  }
}

export const marketplaceService = MarketplaceService.getInstance();
