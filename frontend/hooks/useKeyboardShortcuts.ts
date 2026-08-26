"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

export interface ShortcutAction {
  id: string;
  label: string;
  keys: string[];
  macKeys?: string[];
  handler: () => void;
  category: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutAction[];
  enabled?: boolean;
}

const STORAGE_KEY = "sv-keyboard-shortcuts";

function getDefaultShortcuts(): Record<string, string[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* noop */
  }
  return {};
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const customBindingsRef = useRef<Record<string, string[]>>(getDefaultShortcuts());
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const getEffectiveKeys = useCallback((action: ShortcutAction): string[] => {
    const custom = customBindingsRef.current[action.id];
    if (custom && custom.length > 0) return custom;
    if (navigator.platform?.includes("Mac")) {
      return action.macKeys || action.keys;
    }
    return action.keys;
  }, []);

  const updateCustomBinding = useCallback((actionId: string, newKeys: string[]) => {
    customBindingsRef.current[actionId] = newKeys;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customBindingsRef.current));
    } catch {
      /* noop */
    }
  }, []);

  const resetCustomBindings = useCallback(() => {
    customBindingsRef.current = {};
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      for (const action of shortcutsRef.current) {
        const effectiveKeys = getEffectiveKeys(action);
        const match = effectiveKeys.some((keyCombo) => {
          const parts = keyCombo.toLowerCase().split("+");
          const hasCtrl = parts.includes("ctrl") || parts.includes("control");
          const hasCmd = parts.includes("cmd") || parts.includes("meta");
          const hasShift = parts.includes("shift");
          const hasAlt = parts.includes("alt");
          const key = parts[parts.length - 1] || "";
          if (!key) return false;

          const ctrlOrCmd =
            (hasCtrl && (e.ctrlKey || e.metaKey)) || (hasCmd && (e.metaKey || e.ctrlKey));

          if (hasCtrl || hasCmd) {
            if (!ctrlOrCmd) return false;
          } else if (e.ctrlKey || e.metaKey) {
            return false;
          }

          if (hasShift && !e.shiftKey) return false;
          if (hasAlt && !e.altKey) return false;

          const targetKey = key.length === 1 ? key : key === "escape" ? "Escape" : key;
          return e.key.toLowerCase() === targetKey.toLowerCase();
        });

        if (match) {
          if (action.preventDefault !== false) {
            e.preventDefault();
            e.stopPropagation();
          }
          action.handler();
          return;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, getEffectiveKeys]);

  return useMemo(
    () => ({
      getEffectiveKeys,
      updateCustomBinding,
      resetCustomBindings,
      getDisplayKeys: (action: ShortcutAction): string[] => {
        return getEffectiveKeys(action).map((k) => {
          return k
            .replace("ctrl", "⌃")
            .replace("cmd", "⌘")
            .replace("shift", "⇧")
            .replace("alt", "⌥")
            .replace("escape", "Esc");
        });
      },
    }),
    [getEffectiveKeys, updateCustomBinding, resetCustomBindings]
  );
}
