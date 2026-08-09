import { NextResponse } from "next/server";
import {
  buildYouTubeAuthorizationUrl,
  createOAuthStateCookie,
  getYouTubeOAuthConfig,
  YouTubeOAuthConfigurationError,
  YOUTUBE_OAUTH_STATE_COOKIE,
  youtubeCookieOptions,
} from "@/lib/youtube-oauth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const config = getYouTubeOAuthConfig();
    const { state, value } = createOAuthStateCookie(config.cookieKey);
    const response = NextResponse.redirect(buildYouTubeAuthorizationUrl(config, state));
    response.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, value, youtubeCookieOptions(10 * 60));
    return response;
  } catch (error) {
    if (error instanceof YouTubeOAuthConfigurationError) {
      return NextResponse.json({ connected: false, error: "YouTube OAuth is not configured." }, { status: 503 });
    }
    return NextResponse.json({ connected: false, error: "Unable to start YouTube authorization." }, { status: 500 });
  }
}
