import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const YOUTUBE_OAUTH_STATE_COOKIE = "jarvis_youtube_oauth_state";
export const YOUTUBE_OAUTH_TOKEN_COOKIE = "jarvis_youtube_oauth_token";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const STATE_MAX_AGE_SECONDS = 10 * 60;

export type YouTubeOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  cookieKey: Buffer;
};

export type YouTubeTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
};

type OAuthState = { value: string; expiresAt: number };
type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export class YouTubeOAuthConfigurationError extends Error {
  constructor() {
    super("YouTube OAuth is not configured.");
  }
}

export function getYouTubeOAuthConfig(): YouTubeOAuthConfig {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI?.trim();
  const rawCookieKey = process.env.YOUTUBE_OAUTH_COOKIE_SECRET?.trim();

  if (!clientId || !clientSecret || !redirectUri || !rawCookieKey) {
    throw new YouTubeOAuthConfigurationError();
  }

  let redirect: URL;
  try {
    redirect = new URL(redirectUri);
  } catch {
    throw new YouTubeOAuthConfigurationError();
  }
  if (redirect.protocol !== "https:" && redirect.hostname !== "localhost") {
    throw new YouTubeOAuthConfigurationError();
  }

  const cookieKey = Buffer.from(rawCookieKey, "base64url");
  if (cookieKey.length !== 32) throw new YouTubeOAuthConfigurationError();

  return { clientId, clientSecret, redirectUri: redirect.toString(), cookieKey };
}

function encodeEncrypted<T>(payload: T, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decodeEncrypted<T>(value: string | undefined, key: Buffer): T | null {
  if (!value || value.length > 4096) return null;
  try {
    const input = Buffer.from(value, "base64url");
    if (input.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, input.subarray(0, 12));
    decipher.setAuthTag(input.subarray(12, 28));
    const plaintext = Buffer.concat([decipher.update(input.subarray(28)), decipher.final()]).toString("utf8");
    return JSON.parse(plaintext) as T;
  } catch {
    return null;
  }
}

export function createOAuthStateCookie(key: Buffer): { state: string; value: string } {
  const state = randomBytes(32).toString("base64url");
  return {
    state,
    value: encodeEncrypted<OAuthState>({ value: state, expiresAt: Date.now() + STATE_MAX_AGE_SECONDS * 1000 }, key),
  };
}

export function validateOAuthState(cookieValue: string | undefined, state: string | null, key: Buffer): boolean {
  if (!state || state.length > 256) return false;
  const payload = decodeEncrypted<OAuthState>(cookieValue, key);
  if (!payload || payload.expiresAt < Date.now()) return false;
  const expected = Buffer.from(payload.value);
  const received = Buffer.from(state);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function encryptYouTubeTokens(tokens: YouTubeTokens, key: Buffer): string {
  return encodeEncrypted(tokens, key);
}

export function decryptYouTubeTokens(cookieValue: string | undefined, key: Buffer): YouTubeTokens | null {
  const tokens = decodeEncrypted<YouTubeTokens>(cookieValue, key);
  if (!tokens || !tokens.accessToken || !Number.isFinite(tokens.expiresAt)) return null;
  return tokens;
}

export function youtubeCookieOptions(maxAge = COOKIE_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function buildYouTubeAuthorizationUrl(config: YouTubeOAuthConfig, state: string): string {
  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

function toTokens(data: GoogleTokenResponse, previous?: YouTubeTokens): YouTubeTokens | null {
  if (!data.access_token || !data.expires_in || data.token_type?.toLowerCase() !== "bearer") return null;
  const refreshToken = data.refresh_token ?? previous?.refreshToken;
  return {
    accessToken: data.access_token,
    ...(refreshToken ? { refreshToken } : {}),
    expiresAt: Date.now() + data.expires_in * 1000,
    ...(data.scope ? { scope: data.scope } : {}),
  };
}

async function requestGoogleTokens(body: URLSearchParams, previous?: YouTubeTokens): Promise<YouTubeTokens | null> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) return null;
  return toTokens((await response.json()) as GoogleTokenResponse, previous);
}

export async function exchangeYouTubeAuthorizationCode(code: string, config: YouTubeOAuthConfig): Promise<YouTubeTokens | null> {
  const form = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  return requestGoogleTokens(form);
}

export async function refreshYouTubeTokens(tokens: YouTubeTokens, config: YouTubeOAuthConfig): Promise<YouTubeTokens | null> {
  if (!tokens.refreshToken) return null;
  const form = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: tokens.refreshToken,
    grant_type: "refresh_token",
  });
  return requestGoogleTokens(form, tokens);
}

export async function getValidYouTubeTokens(tokens: YouTubeTokens, config: YouTubeOAuthConfig): Promise<YouTubeTokens | null> {
  return tokens.expiresAt > Date.now() + 60_000 ? tokens : refreshYouTubeTokens(tokens, config);
}

export type YouTubePlaylist = { id: string; title: string; thumbnailUrl?: string; itemCount?: number };

export async function listMyYouTubePlaylists(accessToken: string, pageToken?: string): Promise<{ playlists: YouTubePlaylist[]; nextPageToken?: string } | null> {
  const url = new URL(`${YOUTUBE_API_URL}/playlists`);
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("mine", "true");
  url.searchParams.set("maxResults", "50");
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    items?: Array<{ id?: string; snippet?: { title?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } }; contentDetails?: { itemCount?: number } }>;
    nextPageToken?: string;
  };
  return {
    playlists: (payload.items ?? [])
      .filter((item): item is Required<Pick<typeof item, "id">> & typeof item => Boolean(item.id))
      .map((item) => ({
        id: item.id,
        title: item.snippet?.title ?? "Untitled playlist",
        ...(item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url
          ? { thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url }
          : {}),
        ...(typeof item.contentDetails?.itemCount === "number" ? { itemCount: item.contentDetails.itemCount } : {}),
      })),
    ...(payload.nextPageToken ? { nextPageToken: payload.nextPageToken } : {}),
  };
}
