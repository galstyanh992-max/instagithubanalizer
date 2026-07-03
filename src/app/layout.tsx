import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ChatBar } from "@/components/layout/chat-bar";
import { TopBar } from "@/components/layout/topbar";
import { CosmicBackground } from "@/components/futuristic/CosmicBackground";
import { SettingsHydrator } from "@/components/layout/settings-hydrator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Jarwisyan — Футуристический анализ репозиториев",
  description:
    "Ультра-футуристическая ИИ-программа для анализа скриншотов, текста, ссылок и GitHub-репозиториев. Вердикты, скоринг, watchlist, голос, 3D-интерфейс.",
  keywords: [
    "AI Jarwisyan",
    "анализатор GitHub",
    "ИИ",
    "GLM",
    "Next.js",
    "футуристический UI",
    "3D дашборд",
  ],
  authors: [{ name: "AI Jarwisyan" }],
};

import { Providers } from "@/components/providers/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#020617] text-foreground`}
      >
        <Providers>
          <CosmicBackground />
          <SettingsHydrator />
          <div className="relative flex min-h-screen p-2 gap-2">
            <div className="cosmic-main-frame flex min-h-[calc(100vh-16px)] flex-1 flex-col w-full">
              <TopBar />
              <main className="flex-1 overflow-x-hidden px-4 py-6 lg:px-10 lg:py-8 pb-24">
                {children}
              </main>
              <ChatBar />
            </div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
