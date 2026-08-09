import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const content = fs.readFileSync(file, 'utf8');
  return dotenv.parse(content);
}

const env = readEnv('.env');
const envLocal = readEnv('.env.local');

const newUrl = 'https://vlvwjhyuxsuqwitrpdju.supabase.co';
const newAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdndqaHl1eHN1cXdpdHJwZGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5Mzc3MjQsImV4cCI6MjEwMDUxMzcyNH0.pGbpfTusLGqwCr69lhgXhOuMQr-ByrTN4Y7l6hDVPBs';

const unused = new Set([
  'SUPABASE_STORAGE_BUCKET',
  'VERCEL_TOKEN',
  'AI_PROVIDER',
  'DEFAULT_AI_PROVIDER',
  'HEAVY_AI_PROVIDER',
  'AI_ENABLE_MOCK_FALLBACK',
  'OLLAMA_CLOUD_API_KEY',
  'OLLAMA_CLOUD_BASE_URL',
  'OLLAMA_CLOUD_MODEL',
  'OPENROUTER_IMAGE_MODEL',
  'OPENROUTER_MUSIC_MODEL',
  'OPENROUTER_VIDEO_MODEL',
  'OPENROUTER_TRANSCRIPTION_MODEL',
  'GLM_API_KEY',
  'GLM_BASE_URL',
  'GLM_MODEL',
  'OPENROUTER_MODEL',
  'GROQ_API_KEY',
  'GROQ_MODEL',
  'CEREBRAS_API_KEY',
  'CEREBRAS_MODEL',
  'OPENAI_MODEL',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'SUPABASE_ACCESS_TOKEN',
  'CAMOFOX_BROWSER_PATH',
  'CAMOFOX_BROWSER_REPO',
  'OPENROUTER_HEAVY_MODEL'
]);

// Helper to write
function serializeEnv(obj) {
  return Object.entries(obj).map(([k, v]) => `${k}="${v}"`).join('\n') + '\n';
}

// 1. Process .env (Shared / Non-sensitive / Defaults)
const finalEnv = {};
for (const [k, v] of Object.entries(env)) {
  if (unused.has(k)) continue;
  if (k === 'NEXT_PUBLIC_SUPABASE_URL') { finalEnv[k] = newUrl; continue; }
  if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') { finalEnv[k] = newAnonKey; continue; }
  
  // Remove old supabase secrets
  if (k === 'DATABASE_URL' || k === 'DIRECT_URL' || k === 'SUPABASE_SERVICE_ROLE_KEY') continue;
  
  // Move sensitive tokens to local
  if (k.includes('TOKEN') || k.includes('SECRET') || k.includes('PASSWORD') || k.includes('API_KEY')) {
    envLocal[k] = v; // Move to local
    continue;
  }
  
  finalEnv[k] = v;
}

// 2. Process .env.local (Secrets / Overrides)
const finalEnvLocal = {};
for (const [k, v] of Object.entries(envLocal)) {
  if (unused.has(k)) continue;
  if (k === 'NEXT_PUBLIC_SUPABASE_URL') { finalEnvLocal[k] = newUrl; continue; }
  if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') { finalEnvLocal[k] = newAnonKey; continue; }
  
  if (k === 'DATABASE_URL' || k === 'DIRECT_URL' || k === 'SUPABASE_SERVICE_ROLE_KEY') continue;
  
  finalEnvLocal[k] = v;
}

fs.writeFileSync('.env', serializeEnv(finalEnv));
fs.writeFileSync('.env.local', serializeEnv(finalEnvLocal));

// 3. Process .env.example
const exampleContent = `
# FRONTEND
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# SERVER
DATABASE_URL="postgresql://postgres:password@host:5432/postgres"
DIRECT_URL="postgresql://postgres:password@host:5432/postgres"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
JARVIS_OWNER_ID="your-uuid"

# DAEMON
# (Daemon not implemented yet)

# PROVIDERS
OPENROUTER_API_KEY=""
OPENROUTER_BASE_URL=""
CAMOFOX_URL=""
TELEGRAM_BOT_TOKEN=""
TELEGRAM_MUSIC_CHANNEL=""
TELEGRAM_ALLOWED_USER_ID=""

# LEGACY / OPTIONAL
NEXTAUTH_SECRET=""
NEXTAUTH_URL=""
JARWISYAN_AUTH_ENABLED=""
JARWISYAN_ADMIN_PASSWORD=""
GITHUB_TOKEN=""
`;
fs.writeFileSync('.env.example', exampleContent.trim() + '\n');
