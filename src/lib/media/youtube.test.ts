import { describe, expect, it } from "vitest";
import { parseYouTubeVideo } from "./youtube";

describe("parseYouTubeVideo", () => {
  const id = "dQw4w9WgXcQ";

  it.each([
    id,
    `https://youtu.be/${id}?si=test`,
    `https://www.youtube.com/watch?v=${id}&t=12`,
    `https://youtube.com/embed/${id}`,
    `https://youtube.com/shorts/${id}`,
    `https://youtube.com/live/${id}`,
  ])("accepts a supported YouTube reference: %s", (value) => {
    expect(parseYouTubeVideo(value)).toEqual({
      ok: true,
      videoId: id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    });
  });

  it.each([
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
    "not-video",
  ])("rejects an unsafe or malformed reference: %s", (value) => {
    expect(parseYouTubeVideo(value).ok).toBe(false);
  });
});
