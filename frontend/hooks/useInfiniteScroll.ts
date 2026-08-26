"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

interface UseInfiniteScrollReturn {
  sentinelRef: (node: HTMLDivElement | null) => void;
  isIntersecting: boolean;
  reset: () => void;
}

export function useInfiniteScroll({
  threshold = 0.1,
  rootMargin = "100px",
  enabled = true,
}: UseInfiniteScrollOptions = {}): UseInfiniteScrollReturn {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node || !enabled) return;
      sentinelRef.current = node;
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsIntersecting(entry?.isIntersecting ?? false);
        },
        { threshold, rootMargin }
      );
      observerRef.current.observe(node);
    },
    [threshold, rootMargin, enabled]
  );

  const reset = useCallback(() => {
    setIsIntersecting(false);
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { sentinelRef: setSentinelRef, isIntersecting, reset };
}
