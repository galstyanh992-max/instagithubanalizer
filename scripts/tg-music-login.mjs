import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";

const ENV_FILE = path.join(process.cwd(), ".env.local");

function parseEnv(text) {
  const out = {};
  text.split(/\r?\n/).forEach((l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m) out[m[1]] = m[2];
  });
  return out;
}
function loadEnv() {
  try { return parseEnv(fs.readFileSync(ENV_FILE, "utf8")); } catch { return {}; }
}
function setEnv(keys) {
  let lines = [];
  try { lines = fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/); } catch { lines = []; }
  for (const [k, v] of Object.entries(keys)) {
    const idx = lines.findIndex((l) => new RegExp(`^\\s*${k}\\s*=`).test(l));
    const nl = `${k}="${String(v).replace(/"/g, "")}"`;
    if (idx >= 0) lines[idx] = nl; else lines.push(nl);
  }
  fs.writeFileSync(ENV_FILE, lines.join("\n").replace(/\n*$/, "\n"));
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  const env = loadEnv();
  let apiId = Number(env.TG_API_ID || process.env.TG_API_ID || 0);
  let apiHash = env.TG_API_HASH || process.env.TG_API_HASH || "";
  const channel = (env.TELEGRAM_MUSIC_CHANNEL || process.env.TELEGRAM_MUSIC_CHANNEL || "@carMuzzicH").trim();

  if (!apiId || !apiHash) {
    console.log("\nНужны api_id и api_hash Telegram (получить: https://my.telegram.org → API development tools).");
    apiId = Number((await ask("api_id: ")).trim() || 0);
    apiHash = (await ask("api_hash: ")).trim();
    if (!apiId || !apiHash) { console.log("Без api_id/api_hash нельзя продолжить."); process.exit(1); }
    setEnv({ TG_API_ID: apiId, TG_API_HASH: apiHash });
  }

  const phone = (await ask("\nНомер телефона (с +, например +79991234567): ")).trim();
  if (!phone) { console.log("Номер обязателен."); process.exit(1); }

  console.log("\nПодключаюсь к Telegram...");
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
  await client.connect();

  try {
    await client.start({
      phoneNumber: async () => phone,
      phoneCode: async () => (await ask("Код из Telegram: ")).trim(),
      password: async () => (await ask("Пароль 2FA (если нет — Enter): ")).trim(),
      onError: (err) => { console.log("Ошибка входа:", err.message || err); throw err; },
    });
  } catch (e) {
    console.log("Вход не удался:", e.message || e);
    await client.disconnect();
    process.exit(1);
  }

  const session = client.session.save();
  setEnv({ TG_SESSION: session });
  console.log("\n✅ Готово. MTProto-сессия сохранена в .env.local как TG_SESSION.");
  console.log(`Канал: ${channel}. Перезапусти приложение (npm run dev) — плеер будет играть аудиоархив канала.`);
  await client.disconnect();
  rl.close();
  process.exit(0);
}
main();
