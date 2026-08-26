"use client";

/**
 * Responsive design utilities for Stellar-Veriphy
 */

import { useState, useEffect } from "react";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * Tailwind breakpoint mapping
 */
export const breakpoints = {
  xs: 0,     // < 640px
  sm: 640,   // >= 640px
  md: 768,   // >= 768px
  lg: 1024,  // >= 1024px
  xl: 1280,  // >= 1280px
  "2xl": 1536, // >= 1536px
};

/**
 * Hook to get current breakpoint
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("xs");

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= breakpoints["2xl"]) {
        setBreakpoint("2xl");
      } else if (width >= breakpoints.xl) {
        setBreakpoint("xl");
      } else if (width >= breakpoints.lg) {
        setBreakpoint("lg");
      } else if (width >= breakpoints.md) {
        setBreakpoint("md");
      } else if (width >= breakpoints.sm) {
        setBreakpoint("sm");
      } else {
        setBreakpoint("xs");
      }
    };

    checkBreakpoint();
    window.addEventListener("resize", checkBreakpoint);
    return () => window.removeEventListener("resize", checkBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * Hook to check if current viewport is mobile
 */
export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === "xs" || breakpoint === "sm";
}

/**
 * Hook to check if current viewport is tablet
 */
export function useIsTablet(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === "md";
}

/**
 * Hook to check if current viewport is desktop
 */
export function useIsDesktop(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === "lg" || breakpoint === "xl" || breakpoint === "2xl";
}

/**
 * Hook to detect touch capability
 */
export function useTouchDetection(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const isTouchDevice = () => {
      return (
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        ((navigator as unknown as { msMaxTouchPoints?: number }).msMaxTouchPoints ?? 0) > 0
      );
    };

    setIsTouch(isTouchDevice());
  }, []);

  return isTouch;
}

/**
 * Hook to detect device orientation
 */
export function useOrientation(): "portrait" | "landscape" {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    window.innerHeight > window.innerWidth ? "portrait" : "landscape"
  );

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? "portrait" : "landscape"
      );
    };

    window.addEventListener("resize", updateOrientation);
    return () => window.removeEventListener("resize", updateOrientation);
  }, []);

  return orientation;
}

/**
 * Utility to ensure minimum touch target size (44px)
 */
export function ensureTouchTarget(element: HTMLElement | null): void {
  if (!element) return;

  const style = window.getComputedStyle(element);
  const width = parseInt(style.width) || element.offsetWidth;
  const height = parseInt(style.height) || element.offsetHeight;

  if (width < 44 || height < 44) {
    const newWidth = Math.max(width, 44);
    const newHeight = Math.max(height, 44);
    
    element.style.minWidth = `${newWidth}px`;
    element.style.minHeight = `${newHeight}px`;
    element.style.padding = `${
      Math.max(0, (newHeight - element.scrollHeight) / 2)
    }px ${
      Math.max(0, (newWidth - element.scrollWidth) / 2)
    }px`;
  }
}

/**
 * Component to conditionally render based on breakpoint
 */
export function Responsive({
  children,
  breakpoint,
  direction = "above",
}: {
  children: React.ReactNode;
  breakpoint: Breakpoint;
  direction?: "above" | "below";
}) {
  const currentBreakpoint = useBreakpoint();
  const currentSize = breakpoints[currentBreakpoint];
  const targetSize = breakpoints[breakpoint];

  const shouldShow =
    direction === "above"
      ? currentSize >= targetSize
      : currentSize < targetSize;

  return shouldShow ? <>{children}</> : null;
}

/**
 * Responsive container with mobile-first padding
 */
export function ResponsiveContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Mobile-friendly grid system
 */
export function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = { xs: 4, sm: 6, md: 8 },
  className = "",
}: {
  children: React.ReactNode;
  cols?: Partial<Record<Breakpoint, number>>;
  gap?: Partial<Record<Breakpoint, number>>;
  className?: string;
}) {
  const breakpoint = useBreakpoint();
  const currentCols = cols[breakpoint] || cols.xs || 1;
  const currentGap = gap[breakpoint] || gap.xs || 4;

  return (
    <div
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${currentCols}, minmax(0, 1fr))`,
        gap: `${currentGap * 0.25}rem`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Hook to optimize images for different screen sizes
 */
export function useResponsiveImage(src: string, options?: Partial<Record<Breakpoint, string>>): string {
  const breakpoint = useBreakpoint();
  
  if (options?.[breakpoint]) {
    return options[breakpoint]!;
  }
  
  // Fallback logic for larger breakpoints
  if (breakpoint === "2xl" && options?.xl) return options.xl;
  if (breakpoint === "xl" && options?.lg) return options.lg;
  if (breakpoint === "lg" && options?.md) return options.md;
  if (breakpoint === "md" && options?.sm) return options.sm;
  
  return src;
}

/**
 * Hook to detect safe area insets (for mobile notches)
 */
export function useSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const [insets, setInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    const updateInsets = () => {
      setInsets({
        top: parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--safe-area-inset-top"
          ) || "0"
        ),
        right: parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--safe-area-inset-right"
          ) || "0"
        ),
        bottom: parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--safe-area-inset-bottom"
          ) || "0"
        ),
        left: parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--safe-area-inset-left"
          ) || "0"
        ),
      });
    };

    updateInsets();
    window.addEventListener("resize", updateInsets);
    return () => window.removeEventListener("resize", updateInsets);
  }, []);

  return insets;
}

/**
 * Utility to format viewport meta tag
 */
export function getViewportMeta(): string {
  return "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover";
}