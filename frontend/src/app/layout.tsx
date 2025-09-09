// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import Header from "../components/Header";
import Menu from "../components/Menu";
import { popularSubreddits } from "../lib/popularSubreddits";
import { AnalysisProvider } from "../context/AnalysisContext";

const mozillaText = localFont({
  src: "../../public/MozillaText-VariableFont_wght.ttf"
});

const mozillaHeadline = localFont({
  src: "../../public/MozillaHeadline-VariableFont_wdth,wght.ttf"
});

const font = {  
  body: mozillaText,
  heading: mozillaHeadline
}

export const metadata: Metadata = {
  title: "Social Media Bias Analyzer",
  description: "Political bias detection for subreddits",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
        <body className={`dark ${font.body.className} antialiased`}>
          <div className="min-h-screen bg-background text-neutral-100 py-12 px-4">
            <div className="max-w-5xl mx-auto w-full flex flex-col">
              <AnalysisProvider>
                <Header />
                <Menu popularSubreddits={popularSubreddits} />
                {children}
              </AnalysisProvider>
            </div>
          </div>
        </body>
    </html>
  );
}
