// AI Jarwisyan — NextAuth Configuration
// Simple credentials-based auth for MVP

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Jarwisyan",
      credentials: {
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        // MVP: простой пароль из env
        const adminPassword = process.env.JARWISYAN_ADMIN_PASSWORD || "jarwisyan-admin";
        if (credentials?.password === adminPassword) {
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
  secret: process.env.NEXTAUTH_SECRET || "jarwisyan-secret-key-change-in-production",
};
