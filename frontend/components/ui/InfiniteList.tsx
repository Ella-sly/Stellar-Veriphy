"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { cn } from "@/utils/cn";

interface InfiniteListProps<T> {
  items: T[];
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderSkeleton?: () => React.ReactNode;
  className?: string;
  itemHeight?: number;
  overscan?: number;
  emptyMessage?: string;
  threshold?: number;
}

export function InfiniteList<T>({
  items,
  loadMore,
  hasMore,
  isLoading,
  renderItem,
  renderSkeleton,
  className,
  itemHeight,
  overscan = 5,
  emptyMessage = "No items to display",
  threshold = 0.1,
}: InfiniteListProps<T>) {
  const { sentinelRef, isIntersecting } = useInfiniteScroll({
    threshold,
    enabled: hasMore && !isLoading,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading) {
      loadMore();
    }
  }, [isIntersecting, hasMore, isLoading, loadMore]);

  const defaultSkeleton = useCallback(
    () => (
      <div className="animate-pulse flex gap-4 p-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    ),
    []
  );

  const SkeletonComponent = renderSkeleton || defaultSkeleton;

  if (items.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  if (itemHeight) {
    return (
      <div
        ref={containerRef}
        className={cn("relative overflow-auto", className)}
        style={{ height: "100%" }}
        onScroll={() => {
          if (!containerRef.current) return;
          const { scrollTop, clientHeight } = containerRef.current;
          const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
          const end = Math.min(
            items.length,
            Math.ceil((scrollTop + clientHeight) / itemHeight) + overscan
          );
          setVisibleRange({ start, end });
        }}
      >
        <div
          style={{
            height: items.length * itemHeight,
            position: "relative",
          }}
        >
          {items.slice(visibleRange.start, visibleRange.end).map((item, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: (visibleRange.start + i) * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, visibleRange.start + i)}
            </div>
          ))}
        </div>
        {hasMore && (
          <div
            ref={sentinelRef}
            className="flex justify-center py-4"
            style={{ marginTop: Math.max(0, items.length - visibleRange.end) * itemHeight }}
          >
            {isLoading && <SkeletonComponent />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {items.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoading ? (
            <SkeletonComponent />
          ) : (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}