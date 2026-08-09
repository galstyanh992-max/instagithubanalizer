import fs from 'fs';
import path from 'path';

const schemaStr = fs.readFileSync('prisma/schema.prisma', 'utf8');
const models = [];
let m = null;
const regex = /^model\s+([A-Za-z0-9_]+)\s+{/gm;
while ((m = regex.exec(schemaStr)) !== null) {
  models.push(m[1]);
}

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, fileList);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = getFiles('src');

const counts = {};
models.forEach(m => counts[m] = { api: 0, ui: 0, tests: 0, total: 0 });

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  let type = 'api';
  if (file.includes('components') || file.includes('app\\') || file.includes('app/')) {
    if (file.endsWith('page.tsx') || file.endsWith('client.tsx') || file.endsWith('layout.tsx') || file.includes('components')) {
      type = 'ui';
    }
  }
  if (file.includes('test.ts') || file.includes('__tests__')) {
    type = 'tests';
  }

  models.forEach(model => {
    const lowerModel = model.charAt(0).toLowerCase() + model.slice(1);
    const regex1 = new RegExp(`db\\.${lowerModel}\\.`, 'g');
    const regex2 = new RegExp(`prisma\\.${lowerModel}\\.`, 'g');
    const regex3 = new RegExp(`\\b${model}\\b`, 'g');
    
    let matches = 0;
    matches += (content.match(regex1) || []).length;
    matches += (content.match(regex2) || []).length;
    
    // Check for Prisma client type usage or explicit db calls
    const isUsed = matches > 0 || (content.match(regex3) && (content.includes('@prisma/client') || content.includes(`as ${model}`) || content.includes(`<${model}>`)));
    
    if (isUsed) {
      counts[model][type]++;
      counts[model].total++;
    }
  });
});

console.log("Model | API | UI | Tests | Total");
console.log("---|---|---|---|---");
for (const model of models) {
  console.log(`${model} | ${counts[model].api} | ${counts[model].ui} | ${counts[model].tests} | ${counts[model].total}`);
}
