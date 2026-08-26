"use client";

import { ReactNode } from "react";

import { cn } from "@/utils/cn";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  indeterminate?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Progress bar component with accessibility features
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  indeterminate = false,
  className,
  ariaLabel,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const ariaValueNow = indeterminate ? undefined : Math.round(value);
  const ariaValueText = indeterminate ? "indeterminate" : `${Math.round(percentage)}%`;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {showPercentage && !indeterminate && (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={ariaValueNow}
        aria-valuetext={ariaValueText}
        aria-label={ariaLabel || label || "Progress"}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            indeterminate
              ? "bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_100%] animate-shimmer"
              : "bg-gradient-to-r from-blue-500 to-purple-600"
          )}
          style={
            indeterminate
              ? {
                  width: "100%",
                  backgroundPosition: "200% 0",
                  animation: "shimmer 2s infinite linear",
                }
              : { width: `${percentage}%` }
          }
        />
      </div>
    </div>
  );
}