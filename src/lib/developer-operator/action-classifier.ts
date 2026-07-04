import type { DeveloperAction } from "./types";

const RULES: { action: DeveloperAction; re: RegExp }[] = [
  { action: "prepare_vercel_deploy", re: /vercel|deploy|деплой|задеплой/i },
  { action: "prepare_github_push", re: /загрузи в github|github push|запушь|push в|запуш/i },
  { action: "prepare_git_commit", re: /commit|коммит|закоммить/i },
  { action: "run_typecheck", re: /typecheck|типы|type check/i },
  { action: "run_lint", re: /lint|линт/i },
  { action: "run_build", re: /build|собери|сборк/i },
  { action: "run_tests", re: /тест|test\b/i },
  { action: "open_preview", re: /preview|превью|dev server|запусти dev/i },
  { action: "read_errors", re: /ошибк|errors?\b|прочитай лог|read log/i },
  { action: "prepare_prompt_implementation", re: /реализуй|по этим промптам|implement|разработай по/i },
  { action: "inspect_project", re: /проверь проект|инспект|inspect|осмотри проект|состояние проекта/i },
];

export function classifyDeveloperAction(text: string): DeveloperAction {
  const t = (text || "").trim();
  if (!t) return "unknown";
  for (const r of RULES) if (r.re.test(t)) return r.action;
  return "unknown";
}
