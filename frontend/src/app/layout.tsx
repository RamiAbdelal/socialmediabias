// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import Menu from "../components/Menu";
import { popularSubreddits } from "../lib/popularSubreddits";
import { AnalysisProvider } from "../context/AnalysisContext";
import { HeroUIClientProvider } from "@/context/HeroUIProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Media Bias Analyzer",
  description: "Political bias detection for subreddits",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIClientProvider>
      <html lang="en">
        <body className={`dark text-foreground bg-background ${geistSans.variable} ${geistMono.variable} antialiased`}>
          <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 py-12 px-4">
            <div className="max-w-4xl mx-auto w-full flex flex-col">
              <AnalysisProvider>
                <Header />
                <Menu popularSubreddits={popularSubreddits} />
                {children}
              </AnalysisProvider>
            </div>
          </div>
        </body>
      </html>
    </HeroUIClientProvider>
  );
}
