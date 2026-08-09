import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = {
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  authEnabled: process.env.JARWISYAN_AUTH_ENABLED,
  adminPassword: process.env.JARWISYAN_ADMIN_PASSWORD,
  nodeEnv: process.env.NODE_ENV,
};
const testEnvironment = process.env as Record<string, string | undefined>;

function restore(name: keyof typeof originalEnvironment, environmentName: string) {
  const value = originalEnvironment[name];
  if (value === undefined) {
    delete process.env[environmentName];
  } else {
    process.env[environmentName] = value;
  }
}

afterEach(() => {
  restore("nextAuthSecret", "NEXTAUTH_SECRET");
  restore("nextAuthUrl", "NEXTAUTH_URL");
  restore("authEnabled", "JARWISYAN_AUTH_ENABLED");
  restore("adminPassword", "JARWISYAN_ADMIN_PASSWORD");
  restore("nodeEnv", "NODE_ENV");
  vi.resetModules();
});

describe("auth configuration", () => {
  it("fails safely when NEXTAUTH_SECRET is missing", async () => {
    testEnvironment.NODE_ENV = "test";
    process.env.JARWISYAN_AUTH_ENABLED = "false";
    process.env.NEXTAUTH_URL = "http://localhost:3001";
    delete process.env.NEXTAUTH_SECRET;

    await expect(import("./auth")).rejects.toThrow(
      "AUTH_CONFIGURATION_ERROR: NEXTAUTH_SECRET is required"
    );
  });

  it("initializes with an explicit test-only secret", async () => {
    testEnvironment.NODE_ENV = "test";
    process.env.JARWISYAN_AUTH_ENABLED = "false";
    process.env.NEXTAUTH_SECRET = "test-only-auth-secret";
    process.env.NEXTAUTH_URL = "http://localhost:3001";

    const { authOptions } = await import("./auth");

    expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET);
  });

  it("fails safely when enabled credentials auth has no admin password", async () => {
    testEnvironment.NODE_ENV = "test";
    process.env.NEXTAUTH_SECRET = "test-only-auth-secret";
    process.env.NEXTAUTH_URL = "http://localhost:3001";
    process.env.JARWISYAN_AUTH_ENABLED = "true";
    delete process.env.JARWISYAN_ADMIN_PASSWORD;

    await expect(import("./auth")).rejects.toThrow(
      "AUTH_CONFIGURATION_ERROR: JARWISYAN_ADMIN_PASSWORD is required"
    );
  });

  it("denies an invalid password and accepts an explicit test password", async () => {
    const testPassword = "test-only-admin-password";
    testEnvironment.NODE_ENV = "test";
    process.env.NEXTAUTH_SECRET = "test-only-auth-secret";
    process.env.NEXTAUTH_URL = "http://localhost:3001";
    process.env.JARWISYAN_AUTH_ENABLED = "true";
    process.env.JARWISYAN_ADMIN_PASSWORD = testPassword;

    const { authOptions } = await import("./auth");
    const provider = authOptions.providers[0] as unknown as {
      options: {
        authorize: (credentials: { password: string }, request: object) => unknown;
      };
    };

    expect(await provider.options.authorize({ password: "invalid" }, {})).toBeNull();
    expect(
      await provider.options.authorize(
        { password: testPassword },
        {}
      )
    ).toMatchObject({ id: "1" });
  });
});
