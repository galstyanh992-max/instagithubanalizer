const dbUrl = process.env.DATABASE_URL;
const configured = Boolean(dbUrl && !/USER:PASSWORD@HOST/.test(dbUrl));

if (!configured) {
  console.log("NOT RUN: DATABASE_URL not configured. (non-blocking)");
  console.log("\nDB LIVE READINESS SMOKE: PASS (skipped, non-blocking)");
  process.exit(0);
}

// Live path: non-destructive connection check only. Never prints the URL.
try {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  await prisma.$queryRaw`SELECT 1`;
  await prisma.$disconnect();
  console.log("ok: live DB connection check passed (read-only SELECT 1)");
  console.log("\nDB LIVE READINESS SMOKE: PASS");
} catch (e) {
  console.error("FAIL: live DB connection check failed:", e instanceof Error ? e.message : String(e));
  console.error("\nDB LIVE READINESS SMOKE: FAIL");
  process.exit(1);
}
