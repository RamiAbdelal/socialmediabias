// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Header from "../components/Header";
import Menu from "../components/Menu";
import { popularSubreddits } from "../lib/popularSubreddits";
import { AnalysisProvider } from "../context/AnalysisContext";
import { HeroUIClientProvider } from "@/context/HeroUIProvider";

const roboto = Roboto({ variable: "--font-roboto-sans", subsets: ["latin"] });
const mozillaText = localFont({
  src: "../../public/MozillaText-VariableFont_wght.ttf"
});
const mozillaHeadline = localFont({
  src: "../../public/MozillaHeadline-VariableFont_wdth,wght.ttf"
});

export const metadata: Metadata = {
  title: "Social Media Bias Analyzer",
  description: "Political bias detection for subreddits",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIClientProvider>
      <html lang="en">
        <body className={`dark ${mozillaText.className} antialiased`}>
          <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 text-neutral-100 py-12 px-4">
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
