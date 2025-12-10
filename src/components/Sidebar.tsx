"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  PieChart,
  Target,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ThemeSelector } from "./ThemeSelector";

const menuItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: CreditCard,
  },
  {
    label: "Investment Plans",
    href: "/investment-plans",
    icon: TrendingUp,
  },
  {
    label: "Budget",
    href: "/budget",
    icon: PieChart,
  },
  {
    label: "Cash Flow",
    href: "/cash-flow",
    icon: TrendingUp,
  },
  {
    label: "Goals",
    href: "/goals",
    icon: Target,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, username } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleClearData = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch("/api/user/clear-data", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("All your data has been cleared successfully!");
        setShowClearConfirm(false);
        setIsOpen(false);
      } else {
        toast.error("Failed to clear data. Please try again.");
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("An error occurred while clearing data.");
    } finally {
      setIsClearing(false);
    }
  };

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card border border-border"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-sidebar-bg border-r border-sidebar-border transition-transform duration-300 z-40 md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and User Info */}
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              FinTrack
            </h1>
            {username && (
              <p className="text-sm text-muted-foreground mt-2">
                Welcome, {username}
              </p>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? "bg-sidebar-active text-sidebar-active-text font-medium"
                      : "text-foreground hover:bg-sidebar-hover"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Theme Selector */}
          <div className="p-4 border-t border-sidebar-border">
            <ThemeSelector />
          </div>

          {/* Logout and Clear Data Buttons */}
          <div className="p-4 border-t border-sidebar-border space-y-2">
            {showClearConfirm && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg mb-2">
                <p className="text-sm text-destructive mb-2">
                  Are you sure? This will delete all your data (transactions, goals, etc.) but keep your account.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-2 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearData}
                    disabled={isClearing}
                    className="flex-1 px-2 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {isClearing ? "Clearing..." : "Confirm"}
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={handleClearData}
              disabled={isClearing}
              className="w-full flex items-center justify-center px-4 py-3 rounded-lg text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-sm"
            >
              Clear My Data
            </button>
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-foreground hover:bg-sidebar-hover transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
