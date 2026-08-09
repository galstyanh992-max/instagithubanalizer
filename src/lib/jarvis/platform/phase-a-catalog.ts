export type IntegrationMode = 'npm_dependency' | 'python_dependency' | 'cli_installation' | 'mcp_remote_server' | 'mcp_local_server' | 'skill_import' | 'curated_files' | 'external_executable' | 'docker_service' | 'api_integration' | 'reference_source';
export type IntegrationState = 'INTEGRATED' | 'AVAILABLE' | 'PLANNED' | 'REFERENCE_ONLY';

export interface PhaseAComponent {
  repository: string;
  mode: IntegrationMode;
  state: IntegrationState;
  purpose: string;
  adapter: string | null;
  autoInstall: false;
}

const component = (repository: string, mode: IntegrationMode, state: IntegrationState, purpose: string, adapter: string | null = null): PhaseAComponent => ({ repository, mode, state, purpose, adapter, autoInstall: false });

/** Curated control-plane catalog. Entries are never cloned or executed automatically. */
export const PHASE_A_COMPONENTS: PhaseAComponent[] = [
  component('affaan-m/everything-claude-code', 'reference_source', 'REFERENCE_ONLY', 'Шаблоны настройки Claude Code'),
  component('anthropics/skills', 'skill_import', 'AVAILABLE', 'Проверенные навыки Anthropic'),
  component('bitjaru/styleseed', 'reference_source', 'REFERENCE_ONLY', 'Система визуальных токенов'),
  component('browser-use/browser-use', 'python_dependency', 'PLANNED', 'Браузерный агент'),
  component('DavidHDev/react-bits', 'npm_dependency', 'AVAILABLE', 'UI-компоненты React'),
  component('docling-project/docling', 'python_dependency', 'PLANNED', 'Маршрутизация документов'),
  component('github/awesome-copilot', 'reference_source', 'REFERENCE_ONLY', 'Каталог практик Copilot'),
  component('Graphify-Labs/graphify', 'api_integration', 'INTEGRATED', 'Граф кода и память', 'graphify'),
  component('hardikpandya/stop-slop', 'skill_import', 'AVAILABLE', 'Контроль качества текста'),
  component('jina-ai/MCP', 'mcp_remote_server', 'PLANNED', 'Чтение и поиск веб-контента'),
  component('jo-inc/camofox-browser', 'external_executable', 'INTEGRATED', 'Управляемый браузер', 'camofox-browser'),
  component('lucide-icons/lucide', 'npm_dependency', 'INTEGRATED', 'Система иконок'),
  component('microsoft/playwright', 'npm_dependency', 'INTEGRATED', 'E2E и браузерная проверка'),
  component('microsoft/playwright-mcp', 'mcp_local_server', 'AVAILABLE', 'MCP-управление браузером'),
  component('motiondivision/motion', 'npm_dependency', 'AVAILABLE', 'Анимации интерфейса'),
  component('msitarzewski/agency-agents', 'reference_source', 'REFERENCE_ONLY', 'Ролевые профили агентов'),
  component('mvanhorn/last30days-skill', 'skill_import', 'AVAILABLE', 'Исследование свежих данных'),
  component('nolangz/pixel2motion', 'reference_source', 'REFERENCE_ONLY', 'Анимация визуальных материалов'),
  component('obra/superpowers', 'skill_import', 'AVAILABLE', 'Навыки разработки'),
  component('opendataloader-project/opendataloader-pdf', 'python_dependency', 'PLANNED', 'Извлечение PDF'),
  component('Panniantong/Agent-Reach', 'external_executable', 'PLANNED', 'Исследовательский агент'),
  component('RefoundAI/lenny-skills', 'skill_import', 'AVAILABLE', 'Навыки продуктового анализа'),
  component('resemble-ai/chatterbox', 'python_dependency', 'PLANNED', 'Локальный TTS'),
  component('shadcn-ui/ui', 'npm_dependency', 'INTEGRATED', 'Базовые UI-компоненты'),
  component('sickn33/antigravity-awesome-skills', 'skill_import', 'AVAILABLE', 'Навыки Antigravity'),
  component('storybookjs/storybook', 'npm_dependency', 'AVAILABLE', 'Каталог UI-компонентов'),
  component('supabase/agent-skills', 'skill_import', 'AVAILABLE', 'Навыки Supabase'),
  component('supabase/supabase', 'api_integration', 'INTEGRATED', 'Удалённая плоскость данных'),
  component('SYSTRAN/faster-whisper', 'python_dependency', 'PLANNED', 'Локальное распознавание речи'),
  component('unclecode/crawl4ai', 'docker_service', 'PLANNED', 'Fallback веб-краулер'),
  component('VoltAgent/awesome-claude-code-subagents', 'reference_source', 'REFERENCE_ONLY', 'Каталог субагентов'),
  component('wonderwhy-er/DesktopCommanderMCP', 'mcp_local_server', 'AVAILABLE', 'Локальные файлы и процессы'),
  component('yamadashy/repomix', 'cli_installation', 'AVAILABLE', 'Упаковка контекста репозитория'),
  component('yt-dlp/yt-dlp', 'external_executable', 'AVAILABLE', 'Медиа-источники'),
  component('ollama/ollama', 'external_executable', 'INTEGRATED', 'Локальные AI-модели', 'ollama-local'),
];

export function validatePhaseACatalog(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const identities = new Set<string>();
  for (const entry of PHASE_A_COMPONENTS) {
    const id = entry.repository.toLowerCase();
    if (id === 'galstyanh992-max/instagithubanalizer') errors.push('Исключённый репозиторий присутствует в каталоге');
    if (identities.has(id)) errors.push(`Дубликат: ${entry.repository}`);
    identities.add(id);
  }
  return { valid: errors.length === 0, errors };
}
