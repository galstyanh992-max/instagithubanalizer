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
  title: "ДЖАРВИС — персональный AI-оператор",
  description:
    "Voice-first AI-оператор для управления задачами, анализа проектов, автоматизации рабочих процессов и взаимодействия с интеллектуальными модулями.",
  keywords: [
    "ДЖАРВИС",
    "AI оператор",
    "голосовой ассистент",
    "автоматизация",
    "AI agents",
    "project analysis",
  ],
  authors: [{ name: "Jarwisyan Team" }],
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
            <div className="cosmic-main-frame flex min-h-[calc(100vh-16px)] flex-1 flex-col w-full relative">
              
              {/* Global AI Core Background Layer */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 opacity-80 lg:mt-4 overflow-hidden">
                <div className="relative flex items-center justify-center w-full max-w-[500px] lg:max-w-[700px] mx-auto">
                  
                  <JarwisyanAICore size="xl" active state="thinking" />
                </div>
              </div>

              <TopBar />
              <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 lg:px-10 lg:py-8 pb-24 relative z-10">
                {children}
              </main>
            </div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
