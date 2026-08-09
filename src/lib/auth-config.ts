import "server-only";

export type AuthConfig = {
  adminPassword?: string;
  authEnabled: boolean;
  nextAuthSecret: string;
  nextAuthUrl: string;
};

function requiredValue(name: string, environment: NodeJS.ProcessEnv): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`AUTH_CONFIGURATION_ERROR: ${name} is required`);
  }
  return value;
}

function parseAuthEnabled(environment: NodeJS.ProcessEnv): boolean {
  const raw = environment.JARWISYAN_AUTH_ENABLED?.trim();
  if (raw !== undefined && raw !== "true" && raw !== "false") {
    throw new Error(
      "AUTH_CONFIGURATION_ERROR: JARWISYAN_AUTH_ENABLED must be true or false"
    );
  }

  return environment.NODE_ENV === "production" ? raw !== "false" : raw === "true";
}

export function loadAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthConfig {
  const nextAuthSecret = requiredValue("NEXTAUTH_SECRET", environment);
  const nextAuthUrl = requiredValue("NEXTAUTH_URL", environment);

  try {
    const parsedUrl = new URL(nextAuthUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error("AUTH_CONFIGURATION_ERROR: NEXTAUTH_URL must be a valid HTTP(S) URL");
  }

  const authEnabled = parseAuthEnabled(environment);
  const adminPassword = environment.JARWISYAN_ADMIN_PASSWORD?.trim();

  if (authEnabled && !adminPassword) {
    throw new Error("AUTH_CONFIGURATION_ERROR: JARWISYAN_ADMIN_PASSWORD is required");
  }

  return {
    adminPassword,
    authEnabled,
    nextAuthSecret,
    nextAuthUrl,
  };
}
