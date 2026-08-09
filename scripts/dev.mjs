import { spawn } from "node:child_process";
import process from "node:process";

const processes = [];

function start(name, args) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    stdio: ["inherit", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`[${name}] exited unexpectedly (${signal ?? code ?? "unknown"}).`);
      shutdown(code ?? 1);
    }
  });
  processes.push(child);
}

let stopping = false;
function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());

start("next", ["node_modules/next/dist/bin/next", "dev", "-p", "3000", "--turbopack"]);
start("camofox", ["vendor/camofox-browser/server.js"]);
