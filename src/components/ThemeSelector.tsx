"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { Palette, ChevronDown, Check } from "lucide-react";
import { themes, ThemeValue } from "./Providers";

// Custom hook for hydration-safe mounting
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useHydrated();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full px-4 py-3 rounded-lg bg-muted animate-pulse">
        <div className="h-5 w-24 bg-muted-foreground/20 rounded" />
      </div>
    );
  }

  const currentTheme = themes.find((t) => t.value === theme) || themes[0];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5" />
          <span className="flex items-center gap-2">
            <span>{currentTheme.icon}</span>
            <span>{currentTheme.label}</span>
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
              Select Theme
            </p>
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value as ThemeValue);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  theme === t.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </span>
                {theme === t.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
