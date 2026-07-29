"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_INTERVAL = 30000;
const STORAGE_EVENT_KEY = "autosave-storage";

interface AutoSaveOptions<T> {
  key: string;
  data: T;
  onSave?: (data: T) => void;
  onRestore?: (data: T) => void;
  interval?: number;
  enabled?: boolean;
}

interface AutoSaveState {
  lastSaved: number | null;
  isSaving: boolean;
  hasUnsaved: boolean;
}

declare global {
  interface WindowEventMap {
    "autosave-storage": CustomEvent<{ key: string }>;
  }
}

export function useAutoSave<T>({
  key,
  data,
  onSave,
  onRestore,
  interval = DEFAULT_INTERVAL,
  enabled = true,
}: AutoSaveOptions<T>) {
  const [state, setState] = useState<AutoSaveState>({
    lastSaved: null,
    isSaving: false,
    hasUnsaved: false,
  });
  const prevDataRef = useRef<T>(data);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const save = useCallback(
    (dataToSave: T) => {
      if (!enabled) return;
      try {
        localStorage.setItem(key, JSON.stringify(dataToSave));
        const now = Date.now();
        setState({ lastSaved: now, isSaving: false, hasUnsaved: false });
        window.dispatchEvent(
          new CustomEvent(STORAGE_EVENT_KEY, { detail: { key } })
        );
        onSave?.(dataToSave);
      } catch {
        setState((prev) => ({ ...prev, isSaving: false }));
      }
    },
    [key, enabled, onSave]
  );

  const restore = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as T;
      onRestore?.(parsed);
      setState((prev) => ({ ...prev, lastSaved: Date.now(), hasUnsaved: false }));
      return parsed;
    } catch {
      return null;
    }
  }, [key, onRestore]);

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setState({ lastSaved: null, isSaving: false, hasUnsaved: false });
    } catch {
      /* noop */
    }
  }, [key]);

  const discard = useCallback(() => {
    clearSaved();
  }, [clearSaved]);

  useEffect(() => {
    if (!enabled) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsaved) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, state.hasUnsaved]);

  useEffect(() => {
    if (!enabled) return;
    const handleStorageEvent = (e: CustomEvent<{ key: string }>) => {
      if (e.detail.key === key) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as T;
            onRestore?.(parsed);
          } catch {
            /* noop */
          }
        }
      }
    };
    window.addEventListener(STORAGE_EVENT_KEY, handleStorageEvent);
    return () =>
      window.removeEventListener(STORAGE_EVENT_KEY, handleStorageEvent);
  }, [enabled, key, onRestore]);

  useEffect(() => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, hasUnsaved: true }));
  }, [enabled, data]);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, isSaving: true }));
      save(data);
    }, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, interval, data, save]);

  return { state, save: () => save(data), restore, clearSaved, discard };
}