"use client";

import { cn } from "@/utils/cn";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rect" | "circle";
}

export function Skeleton({
  className,
  variant = "rect",
}: SkeletonProps) {
  const baseClasses =
    "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-shimmer";

  const variantClasses = {
    text: "h-4 rounded",
    rect: "h-12 rounded-lg",
    circle: "w-12 h-12 rounded-full",
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={{
        backgroundSize: "200% 100%",
        animation: "shimmer 2s infinite",
      }}
    />
  );
}
