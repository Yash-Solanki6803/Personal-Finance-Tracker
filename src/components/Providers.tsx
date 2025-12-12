"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

export const themes = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "neutral", label: "Neutral", icon: "⚖️" },
  { value: "ocean", label: "Ocean", icon: "🌊" },
  { value: "forest", label: "Forest", icon: "🌲" },
  { value: "midnight", label: "Midnight", icon: "🌌" },
] as const;

export type ThemeValue = (typeof themes)[number]["value"];

export function Providers({ children }: ThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      themes={themes.map((t) => t.value)}
      enableSystem={false}
    >
      {children}
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}
