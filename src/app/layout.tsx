import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { GlobalCommandDock } from "@/components/chat/GlobalCommandDock";
import { TopBar } from "@/components/layout/topbar";
import { CosmicBackground } from "@/components/futuristic/CosmicBackground";
import { SettingsHydrator } from "@/components/layout/settings-hydrator";
import { JarwisyanAICore } from "@/components/three/JarwisyanAICore";

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
          <div className="relative flex h-screen overflow-hidden p-2 gap-2">
            <div className="cosmic-main-frame flex h-[calc(100vh-16px)] flex-1 flex-col w-full relative">
              
              {/* Global AI Core Background Layer */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 opacity-80 lg:mt-4 overflow-hidden">
                <div className="relative flex items-center justify-center w-full max-w-[500px] lg:max-w-[700px] mx-auto">
                  <div className="absolute inset-0 pointer-events-none animate-pulse" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.15) 0%, transparent 60%)' }} />
                  <JarwisyanAICore size="xl" active state="thinking" />
                </div>
              </div>

              <TopBar />
              <main className="flex-1 overflow-hidden px-4 py-6 lg:px-10 lg:py-8 pb-24 relative z-10 flex flex-col">
                {children}
              </main>
              <GlobalCommandDock />
            </div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
