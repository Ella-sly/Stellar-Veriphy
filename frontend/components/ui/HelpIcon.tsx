"use client";

import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/utils/cn";

interface HelpIconProps {
  content: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function HelpIcon({ content, className, size = "sm" }: HelpIconProps) {
  return (
    <Tooltip content={content}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors",
          sizeMap[size],
          className
        )}
        aria-label={content}
        tabIndex={0}
        role="button"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="w-full h-full"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" strokeLinecap="round" />
        </svg>
      </span>
    </Tooltip>
  );
}
