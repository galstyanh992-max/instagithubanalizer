import { NextRequest, NextResponse } from "next/server";
import { exec } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Session state: sessionId -> { cwd }
type Session = { cwd: string };
const sessions = new Map<string, Session>();

const DEFAULT_CWD =
  process.platform === "win32"
    ? process.env.USERPROFILE || "C:\\"
    : process.env.HOME || "/";

const MAX_SESSIONS = 50;
const COMMAND_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 200_000;

function getShell(): { cmd: string; args: (cmd: string) => string[] } {
  if (process.platform === "win32") {
    // PowerShell by default on Windows
    return {
      cmd: "powershell.exe",
      args: (c) => ["-NoProfile", "-NonInteractive", "-Command", c],
    };
  }
  return {
    cmd: "bash",
    args: (c) => ["-c", c],
  };
}

function isLocalRequest(req: NextRequest): boolean {
  const host = req.headers.get("host") ?? "";
  const xff = req.headers.get("x-forwarded-for") ?? "";
  // Allow only localhost / 127.0.0.1 / [::1]
  const localHosts = ["localhost", "127.0.0.1", "[::1]"];
  const hostName = host.split(":")[0];
  if (localHosts.includes(hostName)) return true;
  // If behind proxy, check XFF first IP
  const firstIp = xff.split(",")[0]?.trim();
  if (firstIp && ["127.0.0.1", "::1"].includes(firstIp)) return true;
  return false;
}

function ensureSession(sessionId: string): Session {
  let s = sessions.get(sessionId);
  if (!s) {
    s = { cwd: DEFAULT_CWD };
    sessions.set(sessionId, s);
    // Evict oldest if over limit
    if (sessions.size > MAX_SESSIONS) {
      const firstKey = sessions.keys().next().value;
      if (firstKey) sessions.delete(firstKey);
    }
  }
  return s;
}

function resolveCd(target: string, cwd: string): string {
  if (!target || target === "~") {
    return process.env.HOME || (process.platform === "win32" ? process.env.USERPROFILE || "C:\\" : "/");
  }
  const resolved = path.isAbsolute(target) ? target : path.resolve(cwd, target);
  return resolved;
}

export async function POST(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "Forbidden: local only" }, { status: 403 });
  }

  let body: { sessionId?: string; command?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = body.sessionId || randomUUID();
  const command = (body.command ?? "").toString();
  const session = ensureSession(sessionId);

  if (!command.trim()) {
    return NextResponse.json({
      sessionId,
      stdout: "",
      stderr: "",
      exitCode: 0,
      cwd: session.cwd,
    });
  }

  // Handle `cd` specially — exec doesn't persist cwd
  const cdMatch = command.match(/^\s*cd\s+(.*)$/);
  if (cdMatch) {
    const target = cdMatch[1].trim().replace(/^["']|["']$/g, "");
    const newCwd = resolveCd(target, session.cwd);
    // Verify directory exists by listing it
    return new Promise<Response>((resolve) => {
      const shell = getShell();
      const checkCmd =
        process.platform === "win32"
          ? `if (Test-Path -LiteralPath '${newCwd.replace(/'/g, "''")}' -PathType Container) { exit 0 } else { exit 1 }`
          : `[ -d '${newCwd.replace(/'/g, "'\\''")}' ]`;
      exec(
        `${shell.cmd} ${shell.args(checkCmd).map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`,
        { timeout: 5000 },
        (err, _stdout, _stderr) => {
          if (err) {
            resolve(
              NextResponse.json({
                sessionId,
                stdout: "",
                stderr: `cd: no such directory: ${target}`,
                exitCode: 1,
                cwd: session.cwd,
              })
            );
          } else {
            session.cwd = newCwd;
            resolve(
              NextResponse.json({
                sessionId,
                stdout: "",
                stderr: "",
                exitCode: 0,
                cwd: session.cwd,
              })
            );
          }
        }
      );
    });
  }

  return new Promise<Response>((resolve) => {
    const shell = getShell();
    const args = shell.args(command);
    const child = exec(
      `"${shell.cmd}" ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`,
      {
        cwd: session.cwd,
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
        env: { ...process.env, TERM: "xterm-256color" },
      },
      (err, stdout, stderr) => {
        const exitCode = err && "code" in err ? (err.code as number) : err ? 1 : 0;
        resolve(
          NextResponse.json({
            sessionId,
            stdout: stdout ?? "",
            stderr: stderr ?? (err && !("code" in err) ? String(err.message) : ""),
            exitCode,
            cwd: session.cwd,
          })
        );
      }
    );
    // Safety: never let child hang forever beyond timeout (exec handles it, but be explicit)
    child.on("error", () => {
      resolve(
        NextResponse.json({
          sessionId,
          stdout: "",
          stderr: "Failed to spawn shell process.",
          exitCode: 1,
          cwd: session.cwd,
        })
      );
    });
  });
}

export async function DELETE(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "Forbidden: local only" }, { status: 403 });
  }
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (sessionId) sessions.delete(sessionId);
  return NextResponse.json({ ok: true });
}