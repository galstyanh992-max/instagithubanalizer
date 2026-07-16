import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TopBar } from "@/components/layout/topbar";
import { CosmicBackground } from "@/components/futuristic/CosmicBackground";
import { SettingsHydrator } from "@/components/layout/settings-hydrator";
import { MacDock } from "@/components/layout/mac-dock";
import { GlobalTerminal } from "@/components/os/GlobalTerminal";
import { GlobalFileExplorer } from "@/components/os/GlobalFileExplorer";
import { MiniBrowser } from "@/components/os/MiniBrowser";
import { JarvisActivityProvider } from "@/components/jarvis/jarvis-activity-provider";
import { JarvisToggleButton } from "@/components/jarvis/jarvis-toggle-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ДЖАРВИС OS — AI Command Center",
  description:
    "Premium AI operating system for autonomous agents, code analysis, and workflow automation.",
  keywords: [
    "ДЖАРВИС",
    "AI OS",
    "AI оператор",
    "голосовой ассистент",
    "автоматизация",
    "AI agents",
    "project analysis",
  ],
  authors: [{ name: "Jarwisyan Team" }],
};

import { Providers } from "@/components/providers/providers";
import { initProviders } from "@/lib/ai-provider/server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await initProviders();

  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <Providers>
          <JarvisActivityProvider>
            <CosmicBackground />
            <SettingsHydrator />
            <div className="relative flex min-h-screen p-3 gap-3">
              <div className="cosmic-main-frame flex min-h-[calc(100vh-24px)] flex-1 flex-col w-full relative glass-panel overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 lg:px-8 lg:py-6 pb-28 relative z-10">
                  {children}
                </main>
              </div>
            </div>
            {/* System Dock — global command launcher */}
            <MacDock />
            {/* Global overlay layers */}
            <GlobalTerminal />
            <GlobalFileExplorer />
            <MiniBrowser />
            <Toaster />
            <JarvisToggleButton />
          </JarvisActivityProvider>
        </Providers>
      </body>
    </html>
  );
}
