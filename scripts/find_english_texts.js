const fs = require('fs');
const path = require('path');

const PAT = /["']((?:[^"'\\]|\\.){3,250})["']/g;
const RUSSIAN = /[\u0400-\u04FF]/;

function isEnglishText(s) {
  s = s.trim();
  if (s.length < 3) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  if (RUSSIAN.test(s)) return false;
  if (/^\$\{.*\}$|^\w+$|^[A-Za-z0-9_\-\.\/:@#\u0026\[\]\(\)\|]+$/.test(s)) return false;
  return true;
}

const targets = [
  path.resolve("D:\\АГЕНТ\\ДЖАРВИС\\src\\components\\repo"),
  path.resolve("D:\\АГЕНТ\\ДЖАРВИС\\src\\components\\os"),
  path.resolve("D:\\АГЕНТ\\ДЖАРВИС\\src\\components\\layout"),
  path.resolve("D:\\АГЕНТ\\ДЖАРВИС\\src\\components\\projects"),
  path.resolve("D:\\АГЕНТ\\ДЖАРВИС\\src\\components\\sidebar"),
  path.resolve("D:\\АГЕНТ\\ДЖАРВИС\\src\\components\\settings"),
  path.resolve("D:\\АГЕНТ\\ДЖАРВИС\\src\\app\\repos"),
  path.resolve("D:\\АГЕНТ\\ДЖАРВИС\\src\\app\\page.tsx"),
  path.resolve("D:\\АГЕНТ\\ДЖАРВИС\\src\\lib"),
  path.resolve("D:\\АГЕНТ\\ДЖАРВИС\\src\\services"),
];

const results = [];
for (const t of targets) {
  const files = [];
  if (fs.statSync(t).isFile()) {
    files.push(t);
  } else {
    for (const root of fs.readdirSync(t, { withFileTypes: true, recursive: true })) {
      if (!root.isFile()) continue;
      if (/\.(tsx|ts|jsx|js|json)$/.test(root.name)) {
        files.push(path.join(root.path || root.parentPath, root.name));
      }
    }
  }
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m;
      while ((m = PAT.exec(line)) !== null) {
        let text = m[1].replace(/\\(.)/g, '$1');
        if (isEnglishText(text)) {
          const ctxStart = Math.max(0, i - 2);
          const ctxEnd = Math.min(lines.length, i + 3);
          const ctx = lines.slice(ctxStart, ctxEnd).join('\n');
          results.push({ file, line: i + 1, text, context: ctx });
        }
      }
    }
  }
}

console.log(JSON.stringify(results, null, 2));
