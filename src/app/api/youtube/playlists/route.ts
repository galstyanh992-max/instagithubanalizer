import { NextRequest, NextResponse } from "next/server";
import {
  decryptYouTubeTokens,
  encryptYouTubeTokens,
  getValidYouTubeTokens,
  getYouTubeOAuthConfig,
  listMyYouTubePlaylists,
  YOUTUBE_OAUTH_TOKEN_COOKIE,
  youtubeCookieOptions,
} from "@/lib/youtube-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const config = getYouTubeOAuthConfig();
    const storedTokens = decryptYouTubeTokens(request.cookies.get(YOUTUBE_OAUTH_TOKEN_COOKIE)?.value, config.cookieKey);
    if (!storedTokens) return NextResponse.json({ error: "YouTube account is not connected." }, { status: 401 });

    const tokens = await getValidYouTubeTokens(storedTokens, config);
    if (!tokens) return NextResponse.json({ error: "YouTube authorization expired. Reconnect your account." }, { status: 401 });

    const pageToken = request.nextUrl.searchParams.get("pageToken") ?? undefined;
    if (pageToken && pageToken.length > 256) return NextResponse.json({ error: "Invalid page token." }, { status: 400 });
    const data = await listMyYouTubePlaylists(tokens.accessToken, pageToken);
    if (!data) return NextResponse.json({ error: "Unable to load YouTube playlists." }, { status: 502 });

    const response = NextResponse.json(data);
    if (tokens !== storedTokens) {
      response.cookies.set(YOUTUBE_OAUTH_TOKEN_COOKIE, encryptYouTubeTokens(tokens, config.cookieKey), youtubeCookieOptions());
    }
    return response;
  } catch {
    return NextResponse.json({ error: "YouTube playlists are unavailable." }, { status: 500 });
  }
}
