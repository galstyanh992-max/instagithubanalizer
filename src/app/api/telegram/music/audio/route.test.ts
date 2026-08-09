import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Telegram music audio route", () => {
  it("forwards byte ranges and preserves the partial media response", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { file_path: "music/song.mp3" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response("chunk", {
        status: 206,
        headers: {
          "content-type": "audio/mpeg",
          "content-length": "5",
          "content-range": "bytes 0-4/10",
        },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/telegram/music/audio?fileId=abcdefgh", {
      headers: { range: "bytes=0-4" },
    });
    const response = await GET(request);

    expect(fetchMock.mock.calls[1][1].headers).toEqual({ range: "bytes=0-4" });
    expect(response.status).toBe(206);
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-range")).toBe("bytes 0-4/10");
    expect(response.headers.get("content-length")).toBe("5");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("does not proxy a non-audio Telegram file", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { file_path: "file.bin" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response("not audio", { status: 200, headers: { "content-type": "application/pdf" } })));

    const response = await GET(new NextRequest("http://localhost/api/telegram/music/audio?fileId=abcdefgh"));

    expect(response.status).toBe(502);
  });

});
