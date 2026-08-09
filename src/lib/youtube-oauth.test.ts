import { describe, expect, it } from "vitest";
import {
  createOAuthStateCookie,
  decryptYouTubeTokens,
  encryptYouTubeTokens,
  validateOAuthState,
} from "@/lib/youtube-oauth";

describe("YouTube OAuth cookie protection", () => {
  const key = Buffer.alloc(32, 7);

  it("encrypts tokens and does not expose their plaintext", () => {
    const value = encryptYouTubeTokens({ accessToken: "private-access-token", refreshToken: "private-refresh-token", expiresAt: Date.now() + 60_000 }, key);
    expect(value).not.toContain("private-access-token");
    expect(decryptYouTubeTokens(value, key)).toMatchObject({ accessToken: "private-access-token" });
  });

  it("accepts only the one-time state bound to the encrypted cookie", () => {
    const state = createOAuthStateCookie(key);
    expect(validateOAuthState(state.value, state.state, key)).toBe(true);
    expect(validateOAuthState(state.value, "another-state", key)).toBe(false);
  });
});
