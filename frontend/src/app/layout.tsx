// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Header from "../components/Header";
import Menu from "../components/Menu";
import { popularSubreddits } from "../lib/popularSubreddits";
import { AnalysisProvider } from "../context/AnalysisContext";
import { ThemeProvider } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Media Bias Analyzer",
  description: "Political bias detection for subreddits",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen w-full transition-colors duration-300" style={{ minHeight: '100vh' }}>
            <ThemeToggle />
            <div className="max-w-4xl mx-auto w-full flex flex-col">
              <AnalysisProvider>
                <Header />
                <Menu popularSubreddits={popularSubreddits} />
                {children}
              </AnalysisProvider>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
