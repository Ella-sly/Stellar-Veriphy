"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-200/50 hover:bg-gray-300/50 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-yellow-400 transition-transform duration-300 rotate-0 hover:rotate-180" />
      ) : (
        <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300 transition-transform duration-300 rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
}
