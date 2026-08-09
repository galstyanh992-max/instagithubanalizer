// AI Jarwisyan — NextAuth Configuration
// Simple credentials-based auth for MVP

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loadAuthConfig } from "@/lib/auth-config";

const authConfig = loadAuthConfig();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Jarwisyan",
      credentials: {
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        if (
          authConfig.adminPassword &&
          credentials?.password === authConfig.adminPassword
        ) {
          return { id: "1", name: "Admin", email: "admin@jarwisyan.local" };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  secret: authConfig.nextAuthSecret,
};
