import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Content Pipeline — HITL Dashboard",
  description:
    "Human-in-the-Loop control center for automated content generation and publishing.",
};

import Sidebar from "@/components/Sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-white`}>
        <Sidebar />
        
        <div className="flex flex-col pl-16">
          {/* Header */}
          <header className="border-b border-gray-100 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-black">
                  Content Pipeline
                </span>
                <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                  HITL
                </span>
              </div>
              <span className="text-xs text-gray-400">v1.0</span>
            </div>
          </header>

          {/* Main content */}
          <main className="mx-auto w-full max-w-5xl px-8 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
