"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useHelp } from "@/context/HelpContext";

export function HelpSearchOverlay() {
  const {
    showHelpSearch,
    closeHelpSearch,
    searchQuery,
    setSearchQuery,
    searchResults,
  } = useHelp();

  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (showHelpSearch) {
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showHelpSearch]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!showHelpSearch) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHelpSearch();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((p) => Math.min(p + 1, searchResults.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((p) => Math.max(p - 1, 0));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showHelpSearch, closeHelpSearch, searchResults.length]);

  if (!showHelpSearch) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeHelpSearch();
      }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 19h.01"
            />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none text-sm"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No help articles found
            </div>
          ) : (
            searchResults.map((article, i) => (
              <a
                key={article.id}
                href={article.link || "#"}
                className={`block px-3 py-3 rounded-lg transition-colors ${
                  i === selectedIdx
                    ? "bg-blue-50 dark:bg-blue-900/30"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {article.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {article.content}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {article.category}
                    </span>
                    {article.videoUrl && (
                      <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Video
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}