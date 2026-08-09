import type { Metadata } from "next";
import "./globals.css";
import { JarvisActivityProvider } from "@/components/jarvis/jarvis-activity-provider";



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
import { ModuleEmbedDetector } from "@/components/os/ModuleEmbedDetector";
import { RussianInterfaceTranslator } from "@/components/i18n/russian-interface-translator";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await initProviders();

  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body
        className={`antialiased bg-[#02050A] text-slate-100 flex flex-col h-screen w-full overflow-hidden font-rajdhani`}
        suppressHydrationWarning
      >
        <Providers>
          <JarvisActivityProvider>
            <ModuleEmbedDetector />
            <RussianInterfaceTranslator />
            <main className="flex-1 w-full h-full relative z-10 overflow-hidden bg-black text-white">
              {children}
            </main>
          </JarvisActivityProvider>
        </Providers>
      </body>
    </html>
  );
}
