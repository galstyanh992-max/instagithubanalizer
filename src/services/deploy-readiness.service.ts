// AI Jarwisyan — Deploy Readiness Checker
// Проверяет готовность проекта к деплою

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface DeployReadinessResult {
  ready: boolean;
  score: number;
  checks: Array<{
    name: string;
    status: "pass" | "warn" | "fail";
    message: string;
  }>;
  recommendation: string;
}

export const deployReadinessService = {
  check(projectPath: string = process.cwd()): DeployReadinessResult {
    const checks: DeployReadinessResult["checks"] = [];

    // 1. package.json exists
    const pkgPath = join(projectPath, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        checks.push({ name: "package.json", status: "pass", message: "Найден" });
        // 2. Build script
        if (pkg.scripts?.build) {
          checks.push({ name: "Build script", status: "pass", message: `npm run build` });
        } else {
          checks.push({ name: "Build script", status: "fail", message: "Отсутствует build script" });
        }
        // 3. Start script
        if (pkg.scripts?.start) {
          checks.push({ name: "Start script", status: "pass", message: `npm start` });
        } else {
          checks.push({ name: "Start script", status: "warn", message: "Отсутствует start script (для production)" });
        }
      } catch {
        checks.push({ name: "package.json", status: "fail", message: "Ошибка парсинга" });
      }
    } else {
      checks.push({ name: "package.json", status: "fail", message: "Не найден" });
    }

    // 4. .env.example
    if (existsSync(join(projectPath, ".env.example"))) {
      checks.push({ name: ".env.example", status: "pass", message: "Найден" });
    } else {
      checks.push({ name: ".env.example", status: "warn", message: "Отсутствует — нет документации env vars" });
    }

    // 5. .gitignore
    const gitignorePath = join(projectPath, ".gitignore");
    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, "utf-8");
      if (gitignore.includes(".env") && gitignore.includes("node_modules")) {
        checks.push({ name: ".gitignore", status: "pass", message: "Защищает secrets и node_modules" });
      } else {
        checks.push({ name: ".gitignore", status: "warn", message: "Не защищает .env или node_modules" });
      }
    } else {
      checks.push({ name: ".gitignore", status: "fail", message: "Отсутствует" });
    }

    // 6. Prisma schema
    if (existsSync(join(projectPath, "prisma", "schema.prisma"))) {
      checks.push({ name: "Prisma schema", status: "pass", message: "Найдена" });
    } else {
      checks.push({ name: "Prisma schema", status: "warn", message: "Не найдена" });
    }

    // 7. next.config
    if (existsSync(join(projectPath, "next.config.ts")) || existsSync(join(projectPath, "next.config.js"))) {
      checks.push({ name: "next.config", status: "pass", message: "Найден" });
    } else {
      checks.push({ name: "next.config", status: "warn", message: "Не найден" });
    }

    // 8. README
    if (existsSync(join(projectPath, "README.md"))) {
      checks.push({ name: "README.md", status: "pass", message: "Найден" });
    } else {
      checks.push({ name: "README.md", status: "warn", message: "Отсутствует" });
    }

    // 9. .env.local (secrets не в git)
    if (existsSync(join(projectPath, ".env.local")) || existsSync(join(projectPath, ".env"))) {
      checks.push({ name: "Env vars", status: "pass", message: "Локальный .env существует" });
    } else {
      checks.push({ name: "Env vars", status: "warn", message: "Локальный .env не найден — переменные могут быть не заданы" });
    }

    // 10. API routes
    const apiDir = join(projectPath, "src", "app", "api");
    if (existsSync(apiDir)) {
      checks.push({ name: "API routes", status: "pass", message: "Директория API существует" });
    } else {
      checks.push({ name: "API routes", status: "warn", message: "Директория API не найдена" });
    }

    const fails = checks.filter((c) => c.status === "fail").length;
    const warns = checks.filter((c) => c.status === "warn").length;
    const passes = checks.filter((c) => c.status === "pass").length;
    const score = Math.round((passes / checks.length) * 100);
    const ready = fails === 0;

    return {
      ready,
      score,
      checks,
      recommendation: fails > 0
        ? `Есть ${fails} критических проблем. Исправьте перед деплоем.`
        : warns > 2
          ? `Есть ${warns} предупреждений. Рекомендуется исправить перед production деплоем.`
          : "Проект готов к деплою. Можно запускать build и deploy.",
    };
  },
};
