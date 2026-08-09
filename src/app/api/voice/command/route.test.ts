import { describe, it, expect, vi } from "vitest";

// Avoid pulling real DB in voiceService safe path.
vi.mock("@/services/voice.service", () => ({
  voiceService: { handleCommand: vi.fn().mockResolvedValue({ action: "navigate", handled: true }) },
}));

import { POST } from "./route";

function reqOf(body: unknown) {
  return new Request("http://localhost/api/voice/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

describe("/api/voice/command", () => {
  it("missing text → validation error", async () => {
    const res = await POST(reqOf({}));
    expect(res.status).toBe(400);
  });

  it("conversation → allowed respond", async () => {
    const res = await POST(reqOf({ transcript: "поговори со мной" }));
    const b = (await json(res)) as any;
    expect(b.routed.intent).toBe("conversation");
    expect(b.routed.allowed).toBe(true);
  });

  it("open dashboard → execute_safe_action", async () => {
    const res = await POST(reqOf({ transcript: "открой dashboard" }));
    const b = (await json(res)) as any;
    expect(b.routed.nextAction).toBe("execute_safe_action");
  });

  it("dangerous command does not execute", async () => {
    const res = await POST(reqOf({ transcript: "запусти rm -rf /" }));
    const b = (await json(res)) as any;
    expect(b.routed.allowed).toBe(false);
    expect(b.result).toBeUndefined();
  }, 15000);

  it("unknown command → clarify", async () => {
    const res = await POST(reqOf({ transcript: "qwertyuiop" }));
    const b = (await json(res)) as any;
    expect(b.routed.nextAction).toBe("clarify");
  });
});
