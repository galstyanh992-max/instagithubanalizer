import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Session state: sessionId -> { cwd }
type Session = { cwd: string };
const sessions = new Map<string, Session>();

const MAX_SESSIONS = 50;
const COMMAND_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 200_000;

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

function ensureSession(sessionId: string, defaultCwd: string): Session {
  let s = sessions.get(sessionId);
  if (!s) {
    s = { cwd: defaultCwd };
    sessions.set(sessionId, s);
    // Evict oldest if over limit
    if (sessions.size > MAX_SESSIONS) {
      const firstKey = sessions.keys().next().value;
      if (firstKey) sessions.delete(firstKey);
    }
  }
  return s;
}

export async function POST(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "Forbidden: local only" }, { status: 403 });
  }
  if (env.JARVIS_RUNTIME_ROLE === "web-control-plane") {
    return NextResponse.json({ error: "Local terminal execution runs on the local JARVIS runtime only." }, { status: 501 });
  }

  const { getDefaultCwd, resolveCd, checkDirectoryExists, runCommand } = await import(
    "@/local-runtime/api-helpers/terminal-engine"
  );

  let body: { sessionId?: string; command?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = body.sessionId || randomUUID();
  const command = (body.command ?? "").toString();
  const session = ensureSession(sessionId, getDefaultCwd());

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
    const exists = await checkDirectoryExists(newCwd);
    if (!exists) {
      return NextResponse.json({
        sessionId,
        stdout: "",
        stderr: `cd: no such directory: ${target}`,
        exitCode: 1,
        cwd: session.cwd,
      });
    }
    session.cwd = newCwd;
    return NextResponse.json({
      sessionId,
      stdout: "",
      stderr: "",
      exitCode: 0,
      cwd: session.cwd,
    });
  }

  const result = await runCommand(command, session.cwd, COMMAND_TIMEOUT_MS, MAX_OUTPUT_BYTES);
  return NextResponse.json({
    sessionId,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    cwd: session.cwd,
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
