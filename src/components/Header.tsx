"use client";

import { useTheme } from "next-themes";
import { Palette, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { themes, ThemeValue } from "./Providers";

// Custom hook for hydration-safe mounting
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const { username } = useAuth();
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

  if (!mounted) return null;

  const currentTheme = themes.find((t) => t.value === theme) || themes[0];

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 md:hidden">
      <div className="flex items-center gap-4 ml-12">
        <h2 className="font-semibold text-foreground">Finance Tracker</h2>
        {username && (
          <span className="text-sm text-muted-foreground">
            ({username})
          </span>
        )}
      </div>

      {/* Theme Dropdown for Mobile */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-accent transition-colors flex items-center gap-1"
        >
          <span>{currentTheme.icon}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[150px]">
            <div className="p-2">
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
    </header>
  );
}
