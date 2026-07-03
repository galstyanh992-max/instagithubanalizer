// AI Jarwisyan — Sandbox Test Service
// Генерирует план безопасного тестового запуска repo

import type { RepoMetadata } from "@/lib/types";

export interface SandboxTestPlan {
  repositoryId: string;
  canTestSafely: boolean;
  recommendedMode: "docker" | "local" | "wsl2" | "cloud" | "skip";
  sandboxFolder: string;
  prerequisites: string[];
  envVarsNeeded: string[];
  commands: string[];
  ports: number[];
  expectedStartupTime: string;
  verificationSteps: string[];
  cleanupSteps: string[];
  risks: string[];
  notes: string;
}

export const sandboxTestService = {
  generatePlan(repoId: string, meta: RepoMetadata | null): SandboxTestPlan {
    if (!meta) {
      return {
        repositoryId: repoId,
        canTestSafely: false,
        recommendedMode: "skip",
        sandboxFolder: "",
        prerequisites: [],
        envVarsNeeded: [],
        commands: [],
        ports: [],
        expectedStartupTime: "—",
        verificationSteps: [],
        cleanupSteps: [],
        risks: ["Репозиторий не загружен"],
        notes: "Сначала проанализируйте репозиторий",
      };
    }

    const hasDocker = meta.hasDocker || meta.hasDockerCompose;
    const isPy = meta.hasPyproject || meta.hasRequirements;
    const isJs = meta.hasPackageJson;
    const needsGpu = meta.gpuRequired;

    let mode: SandboxTestPlan["recommendedMode"] = "skip";
    if (needsGpu) mode = "cloud";
    else if (hasDocker) mode = "docker";
    else if (isPy || isJs) mode = "local";

    const ports: number[] = [];
    if (isJs) ports.push(3000);
    if (isPy) ports.push(8000);
    if (hasDocker) ports.push(8080);

    return {
      repositoryId: repoId,
      canTestSafely: !needsGpu,
      recommendedMode: mode,
      sandboxFolder: `./sandbox/${meta.name}`,
      prerequisites: [
        "Git",
        hasDocker ? "Docker 24+" : null,
        isPy ? "Python 3.10+" : null,
        isJs ? "Node.js 20+" : null,
        needsGpu ? "GPU с CUDA (недоступно на вашем ПК)" : null,
      ].filter(Boolean) as string[],
      envVarsNeeded: meta.hasEnvExample
        ? ["Скопируйте .env.example в .env и заполните значения"]
        : ["Проверьте README на наличие required env vars"],
      commands: mode === "docker"
        ? [
            `git clone ${meta.githubUrl}.git`,
            `cd ${meta.name}`,
            meta.hasDockerCompose ? "docker compose up -d" : `docker build -t ${meta.name} .`,
            meta.hasDockerCompose ? "docker compose logs -f" : `docker run -p ${ports[0]}:${ports[0]} ${meta.name}`,
          ]
        : mode === "local"
          ? [
              `git clone ${meta.githubUrl}.git`,
              `cd ${meta.name}`,
              isJs ? "npm install" : isPy ? "pip install -r requirements.txt" : "",
              isJs ? "npm run dev" : isPy ? `python -m ${meta.name}` : "",
            ]
          : ["Тестирование в облаке — настройте Ollama Cloud или другой провайдер"],
      ports,
      expectedStartupTime: mode === "docker" ? "30-60 секунд" : mode === "local" ? "10-30 секунд" : "1-5 минут",
      verificationSteps: [
        "Сервис запускается без ошибок",
        `Порт ${ports[0] ?? "—"} отвечает`,
        "Логи не содержат fatal errors",
        "Базовый API endpoint возвращает 200",
      ],
      cleanupSteps: [
        mode === "docker" && meta.hasDockerCompose ? "docker compose down -v" : "",
        `rm -rf ./sandbox/${meta.name}`,
      ].filter(Boolean),
      risks: [
        needsGpu ? "Требует GPU — на вашем ПК (AMD RX 580, без CUDA) не запустится локально" : null,
        !hasDocker && /linux/i.test(meta.readmeText.slice(0, 500)) ? "Linux-first репозиторий — может понадобиться WSL2" : null,
        !meta.hasEnvExample ? "Нет .env.example — возможны проблемы с конфигурацией" : null,
      ].filter(Boolean) as string[],
      notes: mode === "docker"
        ? "Docker — рекомендуемый способ. Изолированная среда, легко очистить."
        : mode === "local"
          ? "Локальный запуск возможен. Используйте виртуальное окружение для Python."
          : "Требуется облачный запуск. Ollama Cloud — единственный разрешённый провайдер.",
    };
  },
};
