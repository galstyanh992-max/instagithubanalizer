import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const models = [
    'skillPack', 'skillPackItem', 'toolPack', 'toolPackItem', 
    'marketplaceItem', 'workflowTemplate', 'department', 'handoffRecord',
    'contentItem', 'contentReview', 'publishingQueueItem', 'lead', 
    'contact', 'conversation', 'conversationMessage', 'deal', 'followUp'
  ];

  console.log("Starting DB Row Count Audit for 17 Orphan Models...");
  for (const model of models) {
    try {
      const count = await prisma[model].count();
      console.log(`- ${model}: ${count} rows`);
    } catch (e) {
      console.log(`- ${model}: ERROR (${e.message})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
