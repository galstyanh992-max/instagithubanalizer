// AI Jarwisyan — Middleware
// Auth включается через JARWISYAN_AUTH_ENABLED="true" в .env
// По умолчанию auth ВЫКЛЮЧЕН для sandbox/preview окружения

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Auth policy (fail closed in production):
// - production: enabled UNLESS explicitly set to "false".
// - non-production: disabled UNLESS explicitly set to "true".
const IS_PROD = process.env.NODE_ENV === "production";
const RAW = process.env.JARWISYAN_AUTH_ENABLED;
const AUTH_ENABLED = IS_PROD ? RAW !== "false" : RAW === "true";

if (IS_PROD && RAW === undefined) {
  console.warn(
    "[SECURITY] JARWISYAN_AUTH_ENABLED is unset in production — defaulting to ENABLED (fail closed). Set it explicitly."
  );
}

// Если auth выключен — middleware не запускается
export default AUTH_ENABLED
  ? withAuth(
      function middleware(req) {
        return NextResponse.next();
      },
      {
        callbacks: {
          authorized: ({ token, req }) => {
            const path = req.nextUrl.pathname;
            const publicPaths = ["/api/auth", "/api/chat", "/api/settings", "/login"];
            if (publicPaths.some((p) => path.startsWith(p))) return true;
            if (path.startsWith("/api/")) return !!token;
            if (path !== "/login") return !!token;
            return true;
          },
        },
      }
    )
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|uploads|api/auth).*)"],
};
