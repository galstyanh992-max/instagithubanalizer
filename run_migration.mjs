import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';

// Load variables from .env
const envConfig = dotenv.parse(fs.readFileSync('.env'));
// Load variables from .env.local
const envLocalConfig = dotenv.parse(fs.readFileSync('.env.local'));

// Merge configs (local overrides)
const finalEnv = { ...process.env, ...envConfig, ...envLocalConfig };

const dbUrl = finalEnv.DATABASE_URL;
if (dbUrl && dbUrl.includes('6543')) {
  // Use the pooler URL for migrations, but switch to session mode port 5432
  let directUrl = dbUrl.replace(':6543', ':5432');
  finalEnv.DIRECT_URL = directUrl;
}

try {
  console.log('Running prisma migrate deploy with session pooler...');
  const output = execSync('npx prisma migrate deploy', { env: finalEnv, encoding: 'utf8' });
  console.log(output);
} catch (e) {
  console.error(e.stdout);
  console.error(e.stderr);
  process.exit(1);
}
