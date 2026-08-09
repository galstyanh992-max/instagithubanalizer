const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export type YouTubeParseResult =
  | { ok: true; videoId: string; embedUrl: string }
  | { ok: false; error: string };

function validId(value: string | null | undefined): value is string {
  return Boolean(value && VIDEO_ID.test(value));
}

export function parseYouTubeVideo(value: string): YouTubeParseResult {
  const input = value.trim();
  if (!input) return { ok: false, error: "Введите YouTube URL или video ID." };

  let videoId: string | null = validId(input) ? input : null;

  if (!videoId) {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      return { ok: false, error: "Некорректный YouTube URL." };
    }

    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return { ok: false, error: "Разрешены только публичные HTTP(S) YouTube URL." };
    }

    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) {
      return { ok: false, error: "Разрешены только youtube.com и youtu.be." };
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (host === "youtu.be" || host === "www.youtu.be") {
      videoId = parts[0] ?? null;
    } else if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else if (["embed", "shorts", "live"].includes(parts[0] ?? "")) {
      videoId = parts[1] ?? null;
    }
  }

  if (!validId(videoId)) {
    return { ok: false, error: "YouTube video ID должен содержать 11 допустимых символов." };
  }

  return {
    ok: true,
    videoId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
  };
}
