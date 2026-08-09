import fs from 'fs';
import dotenv from 'dotenv';

const env = { ...dotenv.parse(fs.readFileSync('.env', 'utf8')), ...dotenv.parse(fs.readFileSync('.env.local', 'utf8')) };

function maskStr(str) {
  if (!str) return 'MISSING';
  if (str.includes('.pooler.supabase.com')) return '***POOLER.supabase.com';
  if (str.includes('.supabase.co')) {
    const match = str.match(/([a-z0-9]{20})/);
    if (match) return '***' + match[1].slice(-4);
    return '***SUPABASE';
  }
  return '***UNKNOWN';
}

console.log('NEXT_PUBLIC_SUPABASE_URL:', maskStr(env.NEXT_PUBLIC_SUPABASE_URL));
console.log('DATABASE_URL:', maskStr(env.DATABASE_URL));
console.log('DIRECT_URL:', maskStr(env.DIRECT_URL));
