// ─── Agent OS — Default Pack Definitions ──────────────────────
// Defines all default Skill Packs and Tool Packs for the system.
// These are seeded on first run and provide curated bundles of
// skills and tools that agents can install in a single action.

// ─── Skill Pack Definitions ──────────────────────────────────

export interface DefaultSkillPackDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Skill keys that belong to this pack */
  skills: string[];
}

export interface DefaultToolPackDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Tool keys that belong to this pack */
  tools: string[];
}

export const DEFAULT_SKILL_PACKS: DefaultSkillPackDef[] = [
  {
    key: 'legal_pack',
    name: 'Legal Pack',
    description: 'Legal analysis, contract review, compliance checking, and document processing skills for legal professionals.',
    icon: '⚖️',
    color: '#F59E0B',
    skills: ['legal_analysis', 'legal_drafting', 'contract_review', 'document_processing', 'compliance_check'],
  },
  {
    key: 'research_pack',
    name: 'Research Pack',
    description: 'Research, deep analysis, web search, fact-checking, and data summarization skills for thorough investigation.',
    icon: '🔬',
    color: '#3B82F6',
    skills: ['research', 'deep_research', 'web_search', 'fact_checking', 'data_analysis', 'summarization'],
  },
  {
    key: 'coding_pack',
    name: 'Coding Pack',
    description: 'Coding, debugging, refactoring, architecture design, and prompt engineering skills for software development.',
    icon: '💻',
    color: '#10B981',
    skills: ['coding', 'debugging', 'refactoring', 'architecture_design', 'database_design', 'prompt_engineering'],
  },
  {
    key: 'marketing_pack',
    name: 'Marketing Pack',
    description: 'Marketing strategy, content creation, SEO optimization, social media management, and image generation.',
    icon: '📢',
    color: '#EC4899',
    skills: ['marketing', 'content_creation', 'seo', 'social_media_management', 'image_generation'],
  },
  {
    key: 'sales_pack',
    name: 'Sales Pack',
    description: 'Sales outreach, lead qualification, CRM management, email handling, and data analysis for revenue teams.',
    icon: '💰',
    color: '#F97316',
    skills: ['sales', 'lead_qualification', 'crm_management', 'email_management', 'data_analysis'],
  },
  {
    key: 'crm_pack',
    name: 'CRM Pack',
    description: 'Customer relationship management, lead tracking, email/calendar management, and task delegation skills.',
    icon: '👥',
    color: '#8B5CF6',
    skills: ['crm_management', 'lead_qualification', 'email_management', 'calendar_management', 'task_delegation'],
  },
  {
    key: 'content_pack',
    name: 'Content Pack',
    description: 'Content creation, translation, summarization, image generation, and SEO skills for content teams.',
    icon: '✍️',
    color: '#14B8A6',
    skills: ['content_creation', 'translation', 'summarization', 'image_generation', 'seo'],
  },
  {
    key: 'media_pack',
    name: 'Media Pack',
    description: 'Image, video, and voice generation and editing, plus audio processing for media production.',
    icon: '🎬',
    color: '#EF4444',
    skills: ['image_generation', 'video_generation', 'voice_generation', 'image_editing', 'video_editing', 'audio_processing'],
  },
  {
    key: 'automation_pack',
    name: 'Automation Pack',
    description: 'Browser automation, computer use, workflow automation, agent creation, and task delegation for power users.',
    icon: '🤖',
    color: '#6366F1',
    skills: ['browser_automation', 'computer_use', 'automation', 'agent_creation', 'task_delegation'],
  },
  {
    key: 'rag_pack',
    name: 'RAG Pack',
    description: 'RAG search, embedding management, document processing, OCR, and data analysis for knowledge retrieval.',
    icon: '📚',
    color: '#0EA5E9',
    skills: ['rag_search', 'embedding_management', 'document_processing', 'ocr', 'data_analysis'],
  },
];

// ─── Tool Pack Definitions ───────────────────────────────────

export const DEFAULT_TOOL_PACKS: DefaultToolPackDef[] = [
  {
    key: 'ai_providers',
    name: 'AI Providers',
    description: 'AI model resolution and browser-based AI provider tools for intelligent automation.',
    icon: '🧠',
    color: '#8B5CF6',
    tools: ['model.resolve', 'browser_ai_provider'],
  },
  {
    key: 'dev_tools',
    name: 'Dev Tools',
    description: 'Filesystem read/write, terminal execution, and git status/diff tools for development workflows.',
    icon: '🛠️',
    color: '#10B981',
    tools: ['filesystem.read', 'filesystem.write', 'terminal.run', 'git.status', 'git.diff'],
  },
  {
    key: 'data_tools',
    name: 'Data Tools',
    description: 'Database querying, RAG indexing/querying, and document parsing for data-driven workflows.',
    icon: '📊',
    color: '#3B82F6',
    tools: ['database.query', 'rag.index', 'rag.query', 'document.parse'],
  },
  {
    key: 'media_tools',
    name: 'Media Tools',
    description: 'OCR extraction, translation, and web search tools for media and content processing.',
    icon: '🎬',
    color: '#EC4899',
    tools: ['ocr.extract', 'translation.translate', 'browser.search'],
  },
  {
    key: 'deploy_tools',
    name: 'Deploy Tools',
    description: 'Deployment and notification tools for shipping and alerting workflows.',
    icon: '🚀',
    color: '#F97316',
    tools: ['deployment.deploy', 'notification.send'],
  },
  {
    key: 'full_stack',
    name: 'Full Stack',
    description: 'Complete toolset — all available tools for maximum capability agents.',
    icon: '⚡',
    color: '#EF4444',
    tools: [
      'model.resolve',
      'browser_ai_provider',
      'filesystem.read',
      'filesystem.write',
      'terminal.run',
      'git.status',
      'git.diff',
      'database.query',
      'rag.index',
      'rag.query',
      'document.parse',
      'ocr.extract',
      'translation.translate',
      'browser.search',
      'deployment.deploy',
      'notification.send',
    ],
  },
];

// ─── Default Skill Definitions ───────────────────────────────
// All unique skill keys referenced across packs, with metadata.

export interface DefaultSkillDef {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
}

export const DEFAULT_SKILL_DEFINITIONS: DefaultSkillDef[] = [
  // Legal
  { key: 'legal_analysis', name: 'Legal Analysis', description: 'Analyze legal documents and provide insights on legal matters.', category: 'specialized', icon: '⚖️', tags: ['legal', 'analysis'] },
  { key: 'legal_drafting', name: 'Legal Drafting', description: 'Draft legal documents, contracts, and agreements.', category: 'specialized', icon: '📝', tags: ['legal', 'drafting'] },
  { key: 'contract_review', name: 'Contract Review', description: 'Review contracts for risks, gaps, and compliance issues.', category: 'specialized', icon: '📋', tags: ['legal', 'contracts'] },
  { key: 'compliance_check', name: 'Compliance Check', description: 'Verify compliance with regulations and internal policies.', category: 'specialized', icon: '✅', tags: ['legal', 'compliance'] },

  // Research
  { key: 'research', name: 'Research', description: 'Conduct systematic research on topics and synthesize findings.', category: 'analysis', icon: '🔍', tags: ['research'] },
  { key: 'deep_research', name: 'Deep Research', description: 'Perform in-depth multi-source research with comprehensive analysis.', category: 'analysis', icon: '🔬', tags: ['research', 'deep-analysis'] },
  { key: 'web_search', name: 'Web Search', description: 'Search the web for information and retrieve relevant results.', category: 'analysis', icon: '🌐', tags: ['search', 'web'] },
  { key: 'fact_checking', name: 'Fact Checking', description: 'Verify claims and statements against reliable sources.', category: 'analysis', icon: '✓', tags: ['verification', 'research'] },

  // Coding
  { key: 'coding', name: 'Coding', description: 'Write, review, and improve code across multiple languages and frameworks.', category: 'technical', icon: '💻', tags: ['development', 'coding'] },
  { key: 'debugging', name: 'Debugging', description: 'Identify and fix bugs, errors, and performance issues in code.', category: 'technical', icon: '🐛', tags: ['debugging', 'troubleshooting'] },
  { key: 'refactoring', name: 'Refactoring', description: 'Restructure existing code to improve quality without changing behavior.', category: 'technical', icon: '🔄', tags: ['refactoring', 'code-quality'] },
  { key: 'architecture_design', name: 'Architecture Design', description: 'Design system architecture, patterns, and technical strategies.', category: 'technical', icon: '🏗️', tags: ['architecture', 'design'] },
  { key: 'database_design', name: 'Database Design', description: 'Design database schemas, optimize queries, and model data relationships.', category: 'technical', icon: '🗄️', tags: ['database', 'design'] },
  { key: 'prompt_engineering', name: 'Prompt Engineering', description: 'Craft and optimize prompts for AI model interactions.', category: 'technical', icon: '🎯', tags: ['prompt', 'ai'] },

  // Marketing & Sales
  { key: 'marketing', name: 'Marketing', description: 'Develop marketing strategies and campaigns for products and services.', category: 'management', icon: '📢', tags: ['marketing', 'strategy'] },
  { key: 'seo', name: 'SEO', description: 'Optimize content and pages for search engine rankings.', category: 'analysis', icon: '📈', tags: ['seo', 'optimization'] },
  { key: 'social_media_management', name: 'Social Media Management', description: 'Manage social media accounts, content scheduling, and engagement.', category: 'communication', icon: '📱', tags: ['social-media', 'marketing'] },
  { key: 'sales', name: 'Sales', description: 'Conduct sales outreach, qualify leads, and close deals.', category: 'management', icon: '💰', tags: ['sales', 'revenue'] },
  { key: 'lead_qualification', name: 'Lead Qualification', description: 'Evaluate and qualify potential leads based on criteria.', category: 'management', icon: '🎯', tags: ['sales', 'leads'] },

  // CRM & Management
  { key: 'crm_management', name: 'CRM Management', description: 'Manage customer relationships, track interactions, and maintain CRM data.', category: 'management', icon: '👥', tags: ['crm', 'customers'] },
  { key: 'email_management', name: 'Email Management', description: 'Manage email communications, drafting, and organization.', category: 'communication', icon: '📧', tags: ['email', 'communication'] },
  { key: 'calendar_management', name: 'Calendar Management', description: 'Schedule meetings, manage calendars, and coordinate availability.', category: 'management', icon: '📅', tags: ['calendar', 'scheduling'] },
  { key: 'task_delegation', name: 'Task Delegation', description: 'Assign and track tasks across team members and agents.', category: 'management', icon: '📋', tags: ['delegation', 'tasks'] },

  // Content & Media
  { key: 'content_creation', name: 'Content Creation', description: 'Create compelling content for various formats and platforms.', category: 'creation', icon: '✍️', tags: ['content', 'writing'] },
  { key: 'translation', name: 'Translation', description: 'Translate text and content between multiple languages.', category: 'communication', icon: '🌍', tags: ['translation', 'languages'] },
  { key: 'summarization', name: 'Summarization', description: 'Condense long content into clear, accurate summaries.', category: 'analysis', icon: '📄', tags: ['summarization', 'analysis'] },
  { key: 'data_analysis', name: 'Data Analysis', description: 'Analyze datasets, identify patterns, and extract actionable insights.', category: 'analysis', icon: '📊', tags: ['data', 'analysis'] },
  { key: 'image_generation', name: 'Image Generation', description: 'Generate images from text descriptions and creative prompts.', category: 'media', icon: '🎨', tags: ['image', 'generation'] },
  { key: 'video_generation', name: 'Video Generation', description: 'Generate video content from descriptions and scripts.', category: 'media', icon: '🎥', tags: ['video', 'generation'] },
  { key: 'voice_generation', name: 'Voice Generation', description: 'Generate natural-sounding speech and voice content from text.', category: 'media', icon: '🎙️', tags: ['voice', 'generation'] },
  { key: 'image_editing', name: 'Image Editing', description: 'Edit and modify existing images with AI-powered tools.', category: 'media', icon: '🖼️', tags: ['image', 'editing'] },
  { key: 'video_editing', name: 'Video Editing', description: 'Edit and compose video content with transitions and effects.', category: 'media', icon: '🎬', tags: ['video', 'editing'] },
  { key: 'audio_processing', name: 'Audio Processing', description: 'Process, transcribe, and enhance audio recordings.', category: 'media', icon: '🔊', tags: ['audio', 'processing'] },
  { key: 'document_processing', name: 'Document Processing', description: 'Parse, extract, and process content from documents.', category: 'technical', icon: '📑', tags: ['document', 'processing'] },

  // Automation
  { key: 'browser_automation', name: 'Browser Automation', description: 'Automate web browser interactions and workflows.', category: 'automation', icon: '🌐', tags: ['browser', 'automation'] },
  { key: 'computer_use', name: 'Computer Use', description: 'Interact with computer interfaces for task automation.', category: 'automation', icon: '🖥️', tags: ['computer', 'automation'] },
  { key: 'automation', name: 'Automation', description: 'Design and execute automated workflows and processes.', category: 'automation', icon: '🤖', tags: ['automation', 'workflows'] },
  { key: 'agent_creation', name: 'Agent Creation', description: 'Create and configure new agents for specialized tasks.', category: 'management', icon: '✨', tags: ['agent', 'creation'] },

  // RAG
  { key: 'rag_search', name: 'RAG Search', description: 'Search and retrieve information using RAG (Retrieval-Augmented Generation).', category: 'technical', icon: '🔍', tags: ['rag', 'search'] },
  { key: 'embedding_management', name: 'Embedding Management', description: 'Manage text embeddings and vector representations for similarity search.', category: 'technical', icon: '🧮', tags: ['embedding', 'vectors'] },
  { key: 'ocr', name: 'OCR', description: 'Extract text from images and scanned documents using optical character recognition.', category: 'technical', icon: '👁️', tags: ['ocr', 'extraction'] },
];
