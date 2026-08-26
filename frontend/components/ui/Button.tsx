"use client";

/**
 * Button.tsx
 *
 * Reusable button component with color variants, sizes, a loading state,
 * and built-in accessible disabled/focus styling.
 *
 * Usage Examples:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Primary (default) button:
 *    <Button onClick={handleSave}>Save</Button>
 *
 * 2. Outline / ghost / danger variants:
 *    <Button variant="outline">Cancel</Button>
 *    <Button variant="ghost">Dismiss</Button>
 *    <Button variant="danger">Delete</Button>
 *
 * 3. Icon-only button (always pass an accessible label since there's no visible text):
 *    <Button size="icon" aria-label="Close dialog">
 *      <X className="h-4 w-4" />
 *    </Button>
 *
 * 4. Loading state (disables the button and swaps in a spinner):
 *    <Button loading loadingText="Saving...">Save</Button>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";

import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. Defaults to 'primary'. */
  variant?: ButtonVariant;
  /** Size preset. Use 'icon' for a square, icon-only button. Defaults to 'md'. */
  size?: ButtonSize;
  /** Shows a spinner and disables interaction while true. */
  loading?: boolean;
  /** Optional label shown next to the spinner while loading, replacing `children`. */
  loadingText?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
  ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-6 text-base",
  icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && <Spinner size="sm" color="current" />}
        {loading ? (loadingText ?? children) : children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
