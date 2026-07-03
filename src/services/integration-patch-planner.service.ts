// AI Jarwisyan — Integration Patch Planner
// Генерирует конкретный план патча: какие файлы создать/изменить, зависимости, env vars

import { db } from "@/lib/db";
import { aiService } from "./ai.service";
import type { RepoMetadata } from "@/lib/types";

export interface PatchPlan {
  summary: string;
  targetProject: string;
  sourceRepository: string;
  filesToCreate: string[];
  filesToModify: string[];
  dependenciesToAdd: string[];
  envVarsToAdd: string[];
  apiRoutesToAdd: string[];
  componentsToAdd: string[];
  servicesToAdd: string[];
  databaseChanges: string[];
  implementationSteps: string[];
  testSteps: string[];
  rollbackPlan: string[];
  risks: string[];
  estimatedEffort: "LOW" | "MEDIUM" | "HIGH";
  finalRecommendation: string;
  mock: boolean;
}

export const integrationPatchPlanner = {
  async generate(repoId: string, projectId: string): Promise<PatchPlan> {
    const project = await db.connectedProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Проект не найден");

    const repo = await db.repository.findUnique({
      where: { id: repoId },
      include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!repo) throw new Error("Репозиторий не найден");

    const techStack = safeParseArr(project.techStack);
    const goals = safeParseArr(project.goals);
    const rules = safeParseArr(project.integrationRules);
    const analysis = repo.analyses[0];

    // Mock plan based on heuristics
    const mock: PatchPlan = {
      summary: `Интеграция ${repo.fullName} в «${project.name}» — конкретный план патча`,
      targetProject: project.name,
      sourceRepository: repo.fullName,
      filesToCreate: generateFilesToCreate(repo, techStack),
      filesToModify: generateFilesToModify(repo, techStack),
      dependenciesToAdd: generateDeps(repo),
      envVarsToAdd: repo.hasEnvExample
        ? ["Скопировать переменные из .env.example репозитория"]
        : ["Проверить README на наличие required env vars"],
      apiRoutesToAdd: generateApiRoutes(repo),
      componentsToAdd: generateComponents(repo, techStack),
      servicesToAdd: generateServices(repo),
      databaseChanges: generateDbChanges(repo),
      implementationSteps: [
        "1. Создать ветку feature/integrate-{repo-name}",
        "2. Установить зависимости",
        "3. Добавить env переменные",
        "4. Создать новые файлы",
        "5. Изменить существующие файлы (minimal diff)",
        "6. Обновить API routes",
        "7. Запустить тесты",
        "8. Создать PR",
      ],
      testSteps: [
        "Запустить существующие тесты — не должно быть regressions",
        "Запустить новые тесты для интегрированного кода",
        "Проверить что env vars правильно загружены",
        "Проверить что API endpoints отвечают",
        "Проверить что нет утечки памяти или зависаний",
      ],
      rollbackPlan: [
        "git checkout main",
        "git branch -D feature/integrate-{repo-name}",
        "Удалить добавленные зависимости: npm uninstall {deps}",
        "Удалить созданные файлы",
        "Восстановить .env из backup",
      ],
      risks: generateRisks(repo, analysis?.summary ?? ""),
      estimatedEffort: techStack.length > 0 && repo.hasDocker ? "LOW" : repo.hasDocker ? "MEDIUM" : "HIGH",
      finalRecommendation: rules.length > 0
        ? `План учитывает ваши правила интеграции: ${rules.join(", ")}`
        : "Следуйте правилу minimal diff. Не переписывайте рабочий код.",
      mock: true,
    };

    // Try real AI
    if (!aiService.isMock()) {
      try {
        const ZAISDK = (await import("z-ai-web-dev-sdk")).default;
        const zai = await ZAISDK.create();
        const systemPrompt = `Ты — интеграционный архитектор. Всегда отвечай на русском. JSON keys на английском, значения на русском. Сгенерируй конкретный план патча для интеграции ${repo.fullName} в проект «${project.name}» (tech: ${techStack.join(", ")}).`;
        const userPrompt = `Репозиторий: ${repo.fullName}, ${repo.description}. License: ${repo.license}. Docker: ${repo.hasDocker}. Анализ: ${analysis?.summary ?? ""}. Цели проекта: ${goals.join(", ")}. Правила: ${rules.join(", ")}. README: ${repo.readmeText.slice(0, 2000)}`;
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        });
        const raw = completion.choices[0]?.message?.content ?? "";
        const parsed = JSON.parse(raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim());
        return { ...mock, ...parsed, mock: false };
      } catch {
        return mock;
      }
    }

    return mock;
  },
};

function safeParseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { return JSON.parse(s) as string[]; } catch { return []; }
}

function generateFilesToCreate(repo: { fullName: string; primaryLanguage: string; hasDocker: boolean; hasPackageJson: boolean; hasPyproject: boolean }, techStack: string[]): string[] {
  const files: string[] = [];
  if (repo.hasPackageJson || techStack.includes("Next.js")) {
    files.push("src/services/{repo-name}.service.ts");
    files.push("src/components/{repo-name}/index.tsx");
  }
  if (repo.hasPyproject || techStack.includes("Python")) {
    files.push("src/lib/{repo-name}-adapter.ts");
  }
  if (repo.hasDocker) {
    files.push("docker-compose.override.yml");
  }
  return files.length > 0 ? files : ["src/lib/{repo-name}-integration.ts"];
}

function generateFilesToModify(repo: { hasPackageJson: boolean }, techStack: string[]): string[] {
  const files: string[] = [];
  if (techStack.includes("Next.js") || repo.hasPackageJson) {
    files.push("package.json — добавить зависимости");
    files.push(".env.example — добавить новые переменные");
  }
  files.push("README.md — задокументировать интеграцию");
  return files;
}

function generateDeps(repo: { hasPackageJson: boolean; hasPyproject: boolean; hasRequirements: boolean; primaryLanguage: string }): string[] {
  if (repo.hasPackageJson) return ["Скопировать deps из package.json репозитория"];
  if (repo.hasPyproject || repo.hasRequirements) return ["Скопировать deps из requirements.txt / pyproject.toml"];
  return ["Проверить README на наличие зависимостей"];
}

function generateApiRoutes(repo: { fullName: string; description: string }): string[] {
  if (/api|rest|graphql/i.test(repo.description)) {
    return ["POST /api/{repo-name}/process", "GET /api/{repo-name}/status"];
  }
  return [];
}

function generateComponents(repo: { fullName: string; description: string }, techStack: string[]): string[] {
  if (techStack.includes("Next.js") || /ui|component|react/i.test(repo.description)) {
    return ["{RepoName}Panel — главный компонент", "{RepoName}Card — карточка"];
  }
  return [];
}

function generateServices(repo: { hasDocker: boolean; description: string }): string[] {
  if (repo.hasDocker) return ["Docker service для {repo-name}"];
  return [];
}

function generateDbChanges(repo: { description: string; readmeText: string }): string[] {
  if (/database|prisma|sql|postgres|sqlite/i.test(repo.description + repo.readmeText.slice(0, 500))) {
    return ["Добавить модель в prisma/schema.prisma", "Запустить prisma db push"];
  }
  return [];
}

function generateRisks(repo: { license: string; gpuRequired: boolean; archived: boolean; commercialUseStatus: string }, analysisSummary: string): string[] {
  const risks: string[] = [];
  if (repo.license === "agpl-3.0" || repo.commercialUseStatus === "HIGH_RISK") {
    risks.push("Лицензия HIGH_RISK — проверьте юридические последствия");
  }
  if (repo.gpuRequired) risks.push("Требует GPU — недоступно на вашем ПК");
  if (repo.archived) risks.push("Репозиторий архивирован — нет поддержки");
  risks.push("Возможны конфликты версий зависимостей");
  return risks;
}
