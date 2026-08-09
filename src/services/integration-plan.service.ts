// AI Jarwisyan — Integration Plan service
// Генерирует план интеграции полезных частей из GitHub-репозитория в подключённый проект пользователя.

import { db } from "@/lib/db";
import { aiProviderRouter } from "./ai-provider-router.service";
import { licenseService } from "./license.service";
import type { RepoMetadata, RepoAnalysisResult } from "@/lib/types";

export interface IntegrationPlanResult {
  title: string;
  summary: string;
  usefulParts: string[];
  filesToInspect: string[];
  reusableComponents: string[];
  apiPatterns: string[];
  agentWorkflowIdeas: string[];
  databasePatterns: string[];
  uiUxIdeas: string[];
  requiredDeps: string[];
  compatibilityConcerns: string[];
  risks: string[];
  implementationSteps: string[];
  doNotIntegrate: string[];
  estimatedEffort: "LOW" | "MEDIUM" | "HIGH";
  finalRecommendation: string;
  mock: boolean;
}

interface BuildIntegrationPlanInput {
  connectedProjectId: string;
  repositoryId?: string;
  repoMeta?: RepoMetadata;
  repoAnalysis?: RepoAnalysisResult;
}

function buildSystemPrompt(project: {
  name: string;
  description: string;
  techStack: string[];
  goals: string[];
}, repo: RepoMetadata | null): string {
  return `Ты интеграционный архитектор внутри AI Jarwisyan.

Дано:
1. Анализ GitHub-репозитория${repo ? ` (${repo.fullName}: ${repo.description})` : ""};
2. Профиль подключённого проекта пользователя:
   - Имя: ${project.name}
   - Описание: ${project.description || "(не указано)"}
   - Tech stack: ${project.techStack.join(", ") || "(не указан)"}
   - Цели: ${project.goals.join("; ") || "(не указаны)"}
3. Локальные ограничения ПК пользователя (Windows 11, Xeon E5-2699 v3, 64 GB RAM, AMD Radeon RX 580 8 GB, без CUDA);
4. Существующая архитектура AI Jarwisyan (Next.js 16, Prisma, Three.js).

Сгенерируй практичный план интеграции.
Не предлагай слепое копирование.
Не выдумывай файлы, которых нет.
Раздели проверенные факты репозитория от предположений.
Если дерево файлов репозитория неполное, укажи какие файлы нужно изучить.

Верни ТОЛЬКО валидный JSON:
{
  "title": "краткий заголовок плана",
  "summary": "1-2 предложения: что и зачем интегрировать",
  "usefulParts": ["часть 1", "часть 2"],
  "filesToInspect": ["путь/к/файлу"],
  "reusableComponents": ["компонент 1"],
  "apiPatterns": ["pattern 1"],
  "agentWorkflowIdeas": ["idea 1"],
  "databasePatterns": ["pattern 1"],
  "uiUxIdeas": ["idea 1"],
  "requiredDeps": ["dependency 1"],
  "compatibilityConcerns": ["concern 1"],
  "risks": ["risk 1"],
  "implementationSteps": ["шаг 1", "шаг 2"],
  "doNotIntegrate": ["что НЕ нужно переносить"],
  "estimatedEffort": "LOW|MEDIUM|HIGH",
  "finalRecommendation": "итоговая рекомендация"
}`;
}

function buildUserPrompt(repo: RepoMetadata | null, analysis: RepoAnalysisResult | null): string {
  if (!repo) return "Репозиторий не указан. Дай общий план интеграции на основе проекта пользователя.";
  const parts = [
    `Репозиторий: ${repo.fullName}`,
    `Описание: ${repo.description || "(нет)"}`,
    `Язык: ${repo.primaryLanguage}`,
    `License: ${repo.license}`,
    `Stars: ${repo.stars}, Forks: ${repo.forks}`,
    `Topics: ${repo.topics.join(", ") || "(нет)"}`,
    `Docker: ${repo.hasDocker}, Compose: ${repo.hasDockerCompose}`,
    `package.json: ${repo.hasPackageJson}, requirements: ${repo.hasRequirements}, pyproject: ${repo.hasPyproject}`,
  ];
  if (analysis) {
    parts.push(`AI summary: ${analysis.summary}`);
    parts.push(`Extracted ideas: ${analysis.extractedIdeas.join("; ")}`);
    parts.push(`Best use cases: ${analysis.bestUseCases.join("; ")}`);
  }
  parts.push(`\nREADME (first 3000 chars):\n${repo.readmeText.slice(0, 3000)}`);
  return parts.join("\n");
}

function mockPlan(project: {
  name: string;
  description: string;
  techStack: string[];
  goals: string[];
}, repo: RepoMetadata | null, analysis: RepoAnalysisResult | null): IntegrationPlanResult {
  const licenseInfo = repo ? licenseService.classifyLicense(repo.license) : null;
  const techMatch = repo && project.techStack.length > 0
    ? project.techStack.some((t) =>
        repo.primaryLanguage.toLowerCase().includes(t.toLowerCase()) ||
        repo.topics.some((topic) => topic.toLowerCase().includes(t.toLowerCase()))
      )
    : false;

  return {
    title: repo
      ? `Интеграция ${repo.fullName} в «${project.name}»`
      : `План интеграции для «${project.name}»`,
    summary: repo
      ? techMatch
        ? `Репозиторий ${repo.fullName} имеет tech stack overlap с вашим проектом — стоит изучить reusable компоненты и patterns.`
        : `Репозиторий ${repo.fullName} может дать архитектурные идеи, но прямая интеграция ограничена разницей tech stacks.`
      : "Укажите репозиторий для конкретного плана интеграции.",
    usefulParts: repo
      ? [
          repo.hasDocker ? "Dockerfile patterns" : null,
          repo.hasDockerCompose ? "Docker Compose multi-service setup" : null,
          repo.hasPackageJson ? "Node.js package structure" : null,
          repo.hasPyproject ? "Python packaging patterns" : null,
          repo.hasEnvExample ? ".env.example structure" : null,
          analysis?.extractedIdeas?.[0] ?? null,
        ].filter(Boolean) as string[]
      : [],
    filesToInspect: repo
      ? [
          "README.md",
          repo.hasDocker ? "Dockerfile" : null,
          repo.hasDockerCompose ? "docker-compose.yml" : null,
          repo.hasPackageJson ? "package.json" : null,
          repo.hasPyproject ? "pyproject.toml" : null,
          "src/ or main entry point",
        ].filter(Boolean) as string[]
      : [],
    reusableComponents: analysis?.extractedIdeas?.slice(0, 3) ?? [],
    apiPatterns: repo && /api|rest|graphql/i.test(repo.description + repo.readmeText.slice(0, 1000))
      ? ["REST endpoint patterns", "Error handling conventions"]
      : [],
    agentWorkflowIdeas: repo && /agent|orchestrat|workflow/i.test(repo.description + repo.topics.join(" "))
      ? ["Agent orchestration pattern", "Tool-call sequence"]
      : [],
    databasePatterns: repo && /database|prisma|sql|postgres|sqlite/i.test(repo.description + repo.readmeText.slice(0, 1000))
      ? ["Schema design", "Migration approach"]
      : [],
    uiUxIdeas: repo && /ui|frontend|react|vue|component/i.test(repo.description + repo.topics.join(" "))
      ? ["Component composition", "Loading/error states"]
      : [],
    requiredDeps: repo
      ? [
          repo.hasPackageJson ? "Node.js 20+" : null,
          repo.hasPyproject || repo.hasRequirements ? "Python 3.10+" : null,
          repo.hasDocker ? "Docker 24+" : null,
        ].filter(Boolean) as string[]
      : [],
    compatibilityConcerns: [
      repo?.gpuRequired ? "Требует GPU — на вашем ПК AMD RX 580 без CUDA может не запуститься локально" : null,
      repo && !repo.hasDocker && /linux/i.test(repo.readmeText.slice(0, 500)) ? "Linux-first репозиторий, нужен WSL2/Docker на Windows" : null,
    ].filter(Boolean) as string[],
    risks: [
      licenseInfo?.status === "HIGH_RISK" ? `Лицензия ${repo?.license} — HIGH_RISK для коммерческого использования` : null,
      licenseInfo?.status === "WARNING" ? `Лицензия ${repo?.license} — copyleft, требует раскрытия исходников` : null,
      repo?.archived ? "Репозиторий архивирован — нет поддержки" : null,
    ].filter(Boolean) as string[],
    implementationSteps: [
      "1. Изучить README и структуру файлов",
      "2. Скопировать reusable компоненты в ваш проект",
      "3. Адаптировать API patterns под ваш tech stack",
      "4. Настроить env variables",
      "5. Протестировать изолированно",
      "6. Интегрировать в основное приложение",
    ],
    doNotIntegrate: [
      repo?.hasDocker === false && repo?.gpuRequired ? "GPU inference pipeline — несовместим с вашим ПК" : null,
      licenseInfo?.status === "HIGH_RISK" ? "Licensed code для коммерческого использования" : null,
    ].filter(Boolean) as string[],
    estimatedEffort: techMatch ? "LOW" : repo?.hasDocker ? "MEDIUM" : "HIGH",
    finalRecommendation: techMatch
      ? `Рекомендую интеграцию — tech stack overlap позволяет перенести компоненты с минимальными изменениями.`
      : repo
        ? `Изучите архитектурные идеи, но прямая интеграция потребует адаптации под ${project.techStack.join("/") || "ваш tech stack"}.`
        : "Укажите репозиторий для конкретной рекомендации.",
    mock: true,
  };
}

export const integrationPlanService = {
  async generate(input: BuildIntegrationPlanInput): Promise<IntegrationPlanResult> {
    const { connectedProjectId, repositoryId } = input;

    const project = await db.connectedProject.findUnique({ where: { id: connectedProjectId } });
    if (!project) throw new Error("Connected project not found");

    let repo = input.repoMeta;
    let analysis = input.repoAnalysis;
    if (!repo && repositoryId) {
      const repoRow = await db.repository.findUnique({
        where: { id: repositoryId },
        include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      if (repoRow) {
        repo = {
          owner: repoRow.owner,
          name: repoRow.name,
          fullName: repoRow.fullName,
          githubUrl: repoRow.githubUrl,
          description: repoRow.description,
          stars: repoRow.stars,
          forks: repoRow.forks,
          watchers: repoRow.watchers,
          openIssues: repoRow.openIssues,
          license: repoRow.license,
          primaryLanguage: repoRow.primaryLanguage,
          topics: safeParseArr(repoRow.topics),
          createdAtGithub: repoRow.createdAtGithub?.toISOString() ?? null,
          updatedAtGithub: repoRow.updatedAtGithub?.toISOString() ?? null,
          pushedAtGithub: repoRow.pushedAtGithub?.toISOString() ?? null,
          archived: repoRow.archived,
          disabled: repoRow.disabled,
          defaultBranch: repoRow.defaultBranch,
          readmeText: repoRow.readmeText,
          hasDocker: repoRow.hasDocker,
          hasDockerCompose: repoRow.hasDockerCompose,
          hasPackageJson: repoRow.hasPackageJson,
          hasRequirements: repoRow.hasRequirements,
          hasPyproject: repoRow.hasPyproject,
          hasEnvExample: repoRow.hasEnvExample,
        } as RepoMetadata;
        if (repoRow.analyses[0]) {
          const a = repoRow.analyses[0];
          analysis = {
            summary: a.summary,
            problemSolved: a.problemSolved,
            usefulness: a.usefulness,
            bestUseCases: [],
            projectFit: safeParseJson(a.projectFit),
            localRun: safeParseJson(a.localRunPlan),
            commercialRisk: safeParseJson(a.commercialReview),
            security: safeParseJson(a.securityReview),
            cost: safeParseJson(a.costReview),
            extractedIdeas: safeParseArr(a.extractedIdeas),
            testPlan: safeParseJson(a.testPlan),
            risks: safeParseArr(a.risks),
            scores: { usefulness: repoRow.usefulnessScore, health: repoRow.healthScore, compatibility: repoRow.compatibilityScore, commercialRisk: repoRow.commercialRiskScore, agentOs: repoRow.agentOsScore, aiLegal: repoRow.aiLegalScore, security: repoRow.securityScore, cost: repoRow.costScore, finalPriority: repoRow.finalPriorityScore },
            verdict: repoRow.verdict as "USE_NOW",
            nextAction: a.finalRecommendation,
          } as RepoAnalysisResult;
        }
      }
    }

    const projectProfile = {
      name: project.name,
      description: project.description,
      techStack: safeParseArr(project.techStack),
      goals: safeParseArr(project.goals),
    };

    try {
        const raw = await aiProviderRouter.chat(
          "integration_plan",
          buildSystemPrompt(projectProfile, repo ?? null),
          buildUserPrompt(repo ?? null, analysis ?? null),
        );
        const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned) as Partial<IntegrationPlanResult>;
        const result: IntegrationPlanResult = {
          title: String(parsed.title ?? ""),
          summary: String(parsed.summary ?? ""),
          usefulParts: arr(parsed.usefulParts),
          filesToInspect: arr(parsed.filesToInspect),
          reusableComponents: arr(parsed.reusableComponents),
          apiPatterns: arr(parsed.apiPatterns),
          agentWorkflowIdeas: arr(parsed.agentWorkflowIdeas),
          databasePatterns: arr(parsed.databasePatterns),
          uiUxIdeas: arr(parsed.uiUxIdeas),
          requiredDeps: arr(parsed.requiredDeps),
          compatibilityConcerns: arr(parsed.compatibilityConcerns),
          risks: arr(parsed.risks),
          implementationSteps: arr(parsed.implementationSteps),
          doNotIntegrate: arr(parsed.doNotIntegrate),
          estimatedEffort: (["LOW", "MEDIUM", "HIGH"].includes(String(parsed.estimatedEffort))
            ? String(parsed.estimatedEffort) : "MEDIUM") as "LOW" | "MEDIUM" | "HIGH",
          finalRecommendation: String(parsed.finalRecommendation ?? ""),
          mock: false,
        };

        // Persist to DB
        await db.integrationPlan.create({
          data: {
            connectedProjectId,
            repositoryId: repositoryId ?? null,
            title: result.title,
            summary: result.summary,
            usefulParts: JSON.stringify(result.usefulParts),
            filesToInspect: JSON.stringify(result.filesToInspect),
            reusableComponents: JSON.stringify(result.reusableComponents),
            apiPatterns: JSON.stringify(result.apiPatterns),
            agentWorkflowIdeas: JSON.stringify(result.agentWorkflowIdeas),
            databasePatterns: JSON.stringify(result.databasePatterns),
            uiUxIdeas: JSON.stringify(result.uiUxIdeas),
            requiredDeps: JSON.stringify(result.requiredDeps),
            compatibilityConcerns: JSON.stringify(result.compatibilityConcerns),
            risks: JSON.stringify(result.risks),
            implementationSteps: JSON.stringify(result.implementationSteps),
            doNotIntegrate: JSON.stringify(result.doNotIntegrate),
            estimatedEffort: result.estimatedEffort,
            finalRecommendation: result.finalRecommendation,
            status: "READY",
            mock: false,
          },
        });

        return result;
    } catch (error) {
      throw new Error(`Не удалось получить план от подключённого AI-провайдера: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async listForProject(connectedProjectId: string) {
    return db.integrationPlan.findMany({
      where: { connectedProjectId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  },
};

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}
function safeParseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { return JSON.parse(s) as string[]; } catch { return []; }
}
function safeParseJson<T = unknown>(s: string | null | undefined): T {
  if (!s) return {} as T;
  try { return JSON.parse(s) as T; } catch { return {} as T; }
}
