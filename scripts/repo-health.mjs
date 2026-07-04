import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

let fail = 0;
const need = (p) => { if (!existsSync(p)) { console.error("MISSING:", p); fail++; } else console.log("ok:", p); };
const absent = (p) => { if (existsSync(p)) { console.error("SHOULD BE ABSENT:", p); fail++; } else console.log("ok absent:", p); };

for (const d of ["src/app", "src/lib/safety", "src/lib/command-router", "prisma", "scripts"]) need(d);
for (const f of ["README.md", "SAFETY.md", "DEPLOYMENT_READINESS.md", "prisma/MIGRATIONS.md"]) need(f);
for (const f of ["package.json", "next.config.ts", "tsconfig.json", "prisma/schema.prisma", ".env.example"]) need(f);

absent("temp_NEXT_PUBLIC_SUPABASE_ANON_KEY.txt");
absent("db/custom.db");
const strays = execSync("git ls-files tool-results/ 2>/dev/null || true", { encoding: "utf8" }).trim();
if (strays) { console.error("SHOULD BE ABSENT (tracked tool-results):", strays); fail++; } else console.log("ok absent: tracked tool-results/*");

if (fail) { console.error(`\nREPO HEALTH: ${fail} issue(s)`); process.exit(1); }
console.log("\nREPO HEALTH: PASS");
