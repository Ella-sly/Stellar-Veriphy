"use client";

/**
 * Spinner.tsx
 *
 * Reusable loading spinner component with customizable sizes, colors, and animations.
 *
 * Usage Examples:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Basic Default Spinner (medium, primary blue color):
 *    <Spinner />
 *
 * 2. Small Spinner inside a Button:
 *    <button disabled={isLoading} className="flex items-center gap-2">
 *      {isLoading && <Spinner size="sm" color="white" />}
 *      <span>Submit</span>
 *    </button>
 *
 * 3. Large Spinner with Custom Label:
 *    <Spinner size="lg" color="primary" label="Verifying certificate..." />
 *
 * 4. Custom Tailwind Colors and Dimensions:
 *    <Spinner size="xl" className="text-emerald-500" />
 *
 * 5. Full-page Centered Spinner Overlay:
 *    <div className="flex items-center justify-center p-12">
 *      <Spinner size="lg" color="primary" showLabel label="Loading data..." />
 *    </div>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { cn } from "@/utils/cn";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";
export type SpinnerColor =
  | "primary"
  | "secondary"
  | "white"
  | "gray"
  | "success"
  | "warning"
  | "danger"
  | "current";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Size of the spinner.
   * - 'sm': 16x16px (0.75rem / 4)
   * - 'md': 24x24px (1.5rem / 6) [default]
   * - 'lg': 32x32px (2rem / 8)
   * - 'xl': 48x48px (3rem / 12)
   */
  size?: SpinnerSize | undefined;

  /**
   * Color preset for the spinner indicator.
   * Defaults to 'primary'.
   */
  color?: SpinnerColor | undefined;

  /**
   * Optional accessible label announced to screen readers.
   * Defaults to "Loading...".
   */
  label?: string | undefined;

  /**
   * Whether to display the text label below/beside the spinner visually.
   * Defaults to false (accessible sr-only label is always present).
   */
  showLabel?: boolean | undefined;

  /**
   * Additional Tailwind class names applied to the container.
   */
  className?: string | undefined;

  /**
   * Additional Tailwind class names applied specifically to the SVG spinner element.
   */
  spinnerClassName?: string | undefined;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const strokeWidths: Record<SpinnerSize, number> = {
  sm: 3,
  md: 3,
  lg: 3.5,
  xl: 4,
};

const colorClasses: Record<SpinnerColor, { track: string; indicator: string }> = {
  primary: {
    track: "text-blue-200 dark:text-blue-950",
    indicator: "text-blue-600 dark:text-blue-400",
  },
  secondary: {
    track: "text-purple-200 dark:text-purple-950",
    indicator: "text-purple-600 dark:text-purple-400",
  },
  white: {
    track: "text-white/20",
    indicator: "text-white",
  },
  gray: {
    track: "text-gray-200 dark:text-gray-700",
    indicator: "text-gray-600 dark:text-gray-300",
  },
  success: {
    track: "text-green-200 dark:text-green-950",
    indicator: "text-green-600 dark:text-green-400",
  },
  warning: {
    track: "text-amber-200 dark:text-amber-950",
    indicator: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    track: "text-red-200 dark:text-red-950",
    indicator: "text-red-600 dark:text-red-400",
  },
  current: {
    track: "opacity-25",
    indicator: "opacity-100",
  },
};

export function Spinner({
  size = "md",
  color = "primary",
  label = "Loading...",
  showLabel = false,
  className,
  spinnerClassName,
  ...props
}: SpinnerProps) {
  const sizeClass = sizeClasses[size];
  const strokeWidth = strokeWidths[size];
  const colorPreset = colorClasses[color];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "inline-flex items-center gap-2.5",
        showLabel ? "flex-col justify-center" : "justify-center",
        className
      )}
      {...props}
    >
      <svg
        className={cn(
          "animate-spin",
          sizeClass,
          color === "current" ? "text-current" : undefined,
          spinnerClassName
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {/* Background track circle */}
        <circle
          className={cn("opacity-25", colorPreset.track)}
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        {/* Foreground spinning arc indicator */}
        <path
          className={cn("opacity-75", colorPreset.indicator)}
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      {showLabel ? (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

export default Spinner;
