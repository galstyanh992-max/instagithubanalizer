import { execSync, spawn } from 'child_process';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('Starting E2E Demo for Daemon Foundation...');
  const NEXT_URL = 'http://localhost:3000';
  
  // Wait for Next.js (assume started outside or wait)
  try {
    await fetch(NEXT_URL + '/api/health');
  } catch(e) {
    console.warn('Next.js might not be running on 3000, but we will proceed assuming tests handle it or we just want to run logic mock.');
  }

  console.log('Creating mock task in DB via Prisma...');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  // Create NOOP Task
  const runRecord = await prisma.orchestrationRun.create({
    data: {
      goal: 'E2E Daemon Test',
      status: 'CREATED',
      ownerUserId: process.env.JARVIS_OWNER_ID || 'missing',
    }
  });

  const task1 = await prisma.agentTask.create({
    data: {
      runId: runRecord.id,
      title: 'NOOP',
      role: 'system',
      status: 'not_started',
    }
  });

  const task2 = await prisma.agentTask.create({
    data: {
      runId: runRecord.id,
      title: 'WRITE_TEST_ARTIFACT test-file.txt',
      role: 'system',
      status: 'not_started',
    }
  });

  console.log(`Created tasks ${task1.id} and ${task2.id}`);

  // Now we would start the daemon if this was full E2E.
  // Instead of spawning the daemon (which runs forever), we just log the instructions for the user.
  console.log('E2E Setup complete. To verify daemon logic, run `npm run daemon:start` in a separate terminal.');
  console.log('You should see it claim NOOP, then claim WRITE_TEST_ARTIFACT, and complete both safely.');
  
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
