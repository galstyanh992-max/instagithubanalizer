import { describe, expect, it } from "vitest";
import { loadAuthConfig } from "./auth-config";

const readyEnvironment: NodeJS.ProcessEnv = {
  NEXTAUTH_SECRET: "test-only-auth-secret",
  NEXTAUTH_URL: "http://localhost:3001",
  JARWISYAN_AUTH_ENABLED: "true",
  JARWISYAN_ADMIN_PASSWORD: "test-only-admin-password",
  NODE_ENV: "test",
};

describe("loadAuthConfig", () => {
  it("returns a typed configuration when all required settings are present", () => {
    expect(loadAuthConfig(readyEnvironment)).toMatchObject({ authEnabled: true });
  });

  it("rejects a missing NextAuth secret without exposing a value", () => {
    const environment = { ...readyEnvironment };
    delete environment.NEXTAUTH_SECRET;

    expect(() => loadAuthConfig(environment)).toThrow(
      "AUTH_CONFIGURATION_ERROR: NEXTAUTH_SECRET is required"
    );
  });

  it("rejects a missing NextAuth URL", () => {
    const environment = { ...readyEnvironment };
    delete environment.NEXTAUTH_URL;

    expect(() => loadAuthConfig(environment)).toThrow(
      "AUTH_CONFIGURATION_ERROR: NEXTAUTH_URL is required"
    );
  });

  it("rejects a non-HTTP(S) NextAuth URL", () => {
    expect(() =>
      loadAuthConfig({ ...readyEnvironment, NEXTAUTH_URL: "ftp://localhost" })
    ).toThrow("AUTH_CONFIGURATION_ERROR: NEXTAUTH_URL must be a valid HTTP(S) URL");
  });

  it("rejects an invalid auth boolean", () => {
    expect(() =>
      loadAuthConfig({ ...readyEnvironment, JARWISYAN_AUTH_ENABLED: "invalid" })
    ).toThrow("AUTH_CONFIGURATION_ERROR: JARWISYAN_AUTH_ENABLED must be true or false");
  });

  it("allows a missing admin password only when auth is explicitly disabled", () => {
    const config = loadAuthConfig({
      ...readyEnvironment,
      JARWISYAN_AUTH_ENABLED: "false",
      JARWISYAN_ADMIN_PASSWORD: undefined,
    });

    expect(config).toMatchObject({ adminPassword: undefined, authEnabled: false });
  });
});
