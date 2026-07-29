"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

interface Command {
  id: string;
  label: string;
  description?: string;
  category: string;
  shortcut?: string;
  icon?: string;
  action: () => void;
}

interface CommandPaletteProps {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
  emptyMessage?: string;
}

export function CommandPalette({
  commands,
  isOpen,
  onClose,
  placeholder = "Search commands...",
  emptyMessage = "No commands found",
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const executeSelected = useCallback(() => {
    if (filtered[selectedIndex]) {
      filtered[selectedIndex].action();
      onClose();
    }
  }, [filtered, selectedIndex, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + filtered.length) % filtered.length
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        executeSelected();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, filtered.length, selectedIndex, executeSelected, onClose]);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <svg
            className="w-5 h-5 text-gray-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none text-sm"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
            ESC
          </kbd>
        </div>
        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto p-2"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              {emptyMessage}
            </div>
          ) : (
            filtered.map((cmd, index) => (
              <button
                key={cmd.id}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  index === selectedIndex
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                {cmd.icon && <span className="text-lg">{cmd.icon}</span>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {cmd.label}
                  </div>
                  {cmd.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {cmd.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                    {cmd.category}
                  </span>
                  {cmd.shortcut && (
                    <kbd className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}