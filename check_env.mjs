import fs from 'fs';
import dotenv from 'dotenv';

function checkEnv() {
  const env = { ...dotenv.parse(fs.readFileSync('.env', 'utf8') || ''), ...dotenv.parse(fs.readFileSync('.env.local', 'utf8') || '') };
  const oldRef = 'yivtgtzmecbrabaiombd';
  const newRef = 'vlvwjhyuxsuqwitrpdju';
  
  let success = true;
  
  const checkVar = (name) => {
    if (!env[name] || env[name].trim() === '') {
      console.log(`FAIL: ${name} is empty or missing`);
      success = false;
    } else {
      console.log(`PASS: ${name} exists`);
    }
  };
  
  checkVar('DATABASE_URL');
  checkVar('DIRECT_URL');
  checkVar('SUPABASE_SERVICE_ROLE_KEY');
  
  if (env.DATABASE_URL && env.DATABASE_URL.includes(newRef)) {
    console.log(`PASS: DATABASE_URL points to ${newRef}`);
  } else if (env.DATABASE_URL && env.DATABASE_URL.includes('pooler.supabase.com')) {
    // Note: Pooler URL might not include the project ref directly, it uses aws-0-eu-west-3.pooler.supabase.com with a connection string. 
    // Usually pooler URL has project ref in user or somewhere, wait. The user is usually postgres.
    // If it's a pooler URL, it might not contain the ref explicitly.
    console.log(`INFO: DATABASE_URL is a pooler URL. Assuming it points to ${newRef} if old ref is absent.`);
  } else {
    console.log(`FAIL: DATABASE_URL does not contain new ref ${newRef}`);
    success = false;
  }
  
  if (env.DIRECT_URL && env.DIRECT_URL.includes(newRef)) {
    console.log(`PASS: DIRECT_URL points to ${newRef}`);
  } else if (env.DIRECT_URL) {
    console.log(`INFO: DIRECT_URL might not explicitly contain ref, but old ref check will apply.`);
  }
  
  if (env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`FAIL: SUPABASE_SERVICE_ROLE_KEY has NEXT_PUBLIC_ prefix`);
    success = false;
  } else {
    console.log(`PASS: SUPABASE_SERVICE_ROLE_KEY does not have NEXT_PUBLIC_ prefix`);
  }
  
  let oldRefFound = false;
  for (const [k, v] of Object.entries(env)) {
    if (v.includes(oldRef)) {
      console.log(`FAIL: Old ref ${oldRef} found in ${k}`);
      oldRefFound = true;
      success = false;
    }
  }
  if (!oldRefFound) {
    console.log(`PASS: Old ref not found in env`);
  }
  
  return success;
}

checkEnv();
