import os, re, json

PAT = re.compile(r'["\']((?:[^"\']|\\.){3,250})["\']')
RUSSIAN = re.compile(r'[\u0400-\u04FF]')

def is_english_text(s):
    s = s.strip()
    if len(s) < 3:
        return False
    if not re.search(r'[A-Za-z]', s):
        return False
    if RUSSIAN.search(s):
        return False
    # Skip strings that are just code tokens/imports/paths/JSON keys
    if re.match(r'^[A-Za-z0-9_\-\.\/:@#\u0026\[\]\(\)\|]+$|^\$\{.*\}$|^\w+$', s):
        return False
    return True

targets = [
    r"D:\АГЕНТ\ДЖАРВИС\src\components\repo",
    r"D:\АГЕНТ\ДЖАРВИС\src\components\os",
    r"D:\АГЕНТ\ДЖАРВИС\src\components\layout",
    r"D:\АГЕНТ\ДЖАРВИС\src\components\projects",
    r"D:\АГЕНТ\ДЖАРВИС\src\components\sidebar",
    r"D:\АГЕНТ\ДЖАРВИС\src\components\settings",
    r"D:\АГЕНТ\ДЖАРВИС\src\app\repos",
    r"D:\АГЕНТ\ДЖАРВИС\src\app\page.tsx",
    r"D:\АГЕНТ\ДЖАРВИС\src\lib",
    r"D:\АГЕНТ\ДЖАРВИС\src\services",
]

results = []
for t in targets:
    if os.path.isfile(t):
        files = [t]
    else:
        files = []
        for root, dirs, fnames in os.walk(t):
            for f in fnames:
                if f.endswith(('.tsx','.ts','.jsx','.js','.json')):
                    files.append(os.path.join(root, f))
    for path in files:
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                lines = fh.readlines()
        except Exception as e:
            continue
        for i, line in enumerate(lines, 1):
            for m in PAT.finditer(line):
                text = m.group(1)
                try:
                    text = text.encode().decode('unicode_escape')
                except Exception:
                    pass
                if is_english_text(text):
                    ctx_start = max(0, i-3)
                    ctx_end = min(len(lines), i+2)
                    ctx = ''.join(lines[ctx_start:ctx_end]).strip()
                    results.append({
                        'file': path,
                        'line': i,
                        'text': text,
                        'context': ctx
                    })

print(json.dumps(results, ensure_ascii=False, indent=2))
