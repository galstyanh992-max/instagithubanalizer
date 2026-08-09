import { NextRequest, NextResponse } from "next/server";
import {
  encryptYouTubeTokens,
  exchangeYouTubeAuthorizationCode,
  getYouTubeOAuthConfig,
  validateOAuthState,
  YOUTUBE_OAUTH_STATE_COOKIE,
  YOUTUBE_OAUTH_TOKEN_COOKIE,
  youtubeCookieOptions,
} from "@/lib/youtube-oauth";

export const runtime = "nodejs";

function dashboardRedirect(request: NextRequest, result: "connected" | "failed") {
  // The live dashboard is mounted by the root page in an iframe.
  const destination = new URL("/", request.url);
  destination.searchParams.set("youtube", result);
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest) {
  const response = dashboardRedirect(request, "failed");
  response.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, "", youtubeCookieOptions(0));
  try {
    const config = getYouTubeOAuthConfig();
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    if (!code || code.length > 2048 || !validateOAuthState(request.cookies.get(YOUTUBE_OAUTH_STATE_COOKIE)?.value, state, config.cookieKey)) {
      return response;
    }
    const tokens = await exchangeYouTubeAuthorizationCode(code, config);
    if (!tokens) return response;

    const success = dashboardRedirect(request, "connected");
    success.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, "", youtubeCookieOptions(0));
    success.cookies.set(YOUTUBE_OAUTH_TOKEN_COOKIE, encryptYouTubeTokens(tokens, config.cookieKey), youtubeCookieOptions());
    return success;
  } catch {
    return response;
  }
}
