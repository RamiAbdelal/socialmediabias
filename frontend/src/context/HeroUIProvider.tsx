// frontend/src/context/HeroUIProvider.tsx
// This file provides the HeroUIProvider context for the application
"use client";
import { HeroUIProvider } from "@heroui/react";
export function HeroUIClientProvider({children}: { children: React.ReactNode }) {
  return <HeroUIProvider>{children}</HeroUIProvider>;
}

