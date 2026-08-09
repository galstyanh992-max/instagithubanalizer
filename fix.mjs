import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe("DELETE FROM _prisma_migrations WHERE migration_name = '20260725193524_phase05_workers'");
  console.log('Fixed');
}
main().catch(console.error).finally(() => prisma.$disconnect());
