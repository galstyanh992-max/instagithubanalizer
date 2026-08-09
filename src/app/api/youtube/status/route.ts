import { NextRequest, NextResponse } from "next/server";
import {
  decryptYouTubeTokens,
  getYouTubeOAuthConfig,
  YouTubeOAuthConfigurationError,
  YOUTUBE_OAUTH_TOKEN_COOKIE,
} from "@/lib/youtube-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const config = getYouTubeOAuthConfig();
    const tokens = decryptYouTubeTokens(request.cookies.get(YOUTUBE_OAUTH_TOKEN_COOKIE)?.value, config.cookieKey);
    return NextResponse.json({ configured: true, connected: Boolean(tokens), expiresAt: tokens?.expiresAt ?? null });
  } catch (error) {
    if (error instanceof YouTubeOAuthConfigurationError) {
      return NextResponse.json({ configured: false, connected: false, expiresAt: null });
    }
    return NextResponse.json({ configured: true, connected: false, expiresAt: null }, { status: 500 });
  }
}
