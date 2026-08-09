import fs from 'fs';
import dotenv from 'dotenv';

function readKeys(file) {
  if (!fs.existsSync(file)) return {};
  const content = fs.readFileSync(file, 'utf8');
  return dotenv.parse(content);
}

const env = readKeys('.env');
const envLocal = readKeys('.env.local');

const allKeys = new Set([...Object.keys(env), ...Object.keys(envLocal)]);

for (const key of allKeys) {
  let location = [];
  if (key in env) location.push('.env');
  if (key in envLocal) location.push('.env.local');
  
  let conflict = false;
  if (key in env && key in envLocal && env[key] !== envLocal[key]) {
    conflict = true;
  }
  
  console.log(`${key} | ${location.join(', ')} | ${conflict ? 'CONFLICT' : 'OK'}`);
}
