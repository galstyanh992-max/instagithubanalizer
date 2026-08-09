// Quick Prisma env diagnostic
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

function safeDatabaseTarget(value) {
  if (!value) return "not configured";
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
  } catch {
    return "configured (unparseable target hidden)";
  }
}

console.log("DATABASE_URL target:", safeDatabaseTarget(process.env.DATABASE_URL));
console.log("DIRECT_URL target:", safeDatabaseTarget(process.env.DIRECT_URL));

const { PrismaClient } = await import("@prisma/client");
try {
  const c = new PrismaClient();
  await c.$queryRaw`SELECT 1`;
  console.log("Prisma Client: OK, query works");
  await c.$disconnect();
} catch (e) {
  console.log("Prisma ERROR:", e.message.slice(0, 400));
}
