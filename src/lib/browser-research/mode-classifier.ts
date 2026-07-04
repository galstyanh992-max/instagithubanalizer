import type { ResearchMode } from "./types";

const RULES: { mode: ResearchMode; re: RegExp }[] = [
  { mode: "deep_research", re: /глубок\w*.*исследован|deep research|исследуй подробно/i },
  { mode: "movie_recommendation", re: /найди фильм|что посмотреть|movie recommend|фильм на этих сайтах/i },
  { mode: "competitor_public_analysis", re: /анализируй конкурент|competitor/i },
  { mode: "github_source_discovery", re: /github.*(ссылк|находк)|найди github/i },
  { mode: "site_check", re: /проверь сайт|site check|check the site/i },
  { mode: "quick_lookup", re: /быстро найди|quick lookup|найди информацию/i },
];

export function classifyResearchMode(text: string): ResearchMode {
  const t = (text || "").trim();
  if (!t) return "custom";
  for (const r of RULES) if (r.re.test(t)) return r.mode;
  return "custom";
}
