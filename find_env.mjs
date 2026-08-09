import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (!['node_modules', '.next', 'dist', 'build', 'vendor'].includes(f)) {
        walkDir(dirPath, callback);
      }
    } else {
      if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.prisma')) {
        callback(dirPath);
      }
    }
  });
}

const vars = new Map();

walkDir(path.join(process.cwd(), 'src'), (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /process\.env\.([A-Z0-9_]+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!vars.has(match[1])) vars.set(match[1], new Set());
    vars.get(match[1]).add(file);
  }
});

walkDir(path.join(process.cwd(), 'prisma'), (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /env\("([A-Z0-9_]+)"\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!vars.has(match[1])) vars.set(match[1], new Set());
    vars.get(match[1]).add(file);
  }
});

for (const [key, files] of vars.entries()) {
  console.log(`${key}: ${Array.from(files).join(', ')}`);
}
