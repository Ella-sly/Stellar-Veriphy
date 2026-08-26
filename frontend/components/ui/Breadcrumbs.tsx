"use client";

/**
 * Breadcrumbs.tsx
 *
 * Auto-generates a breadcrumb trail from the current App Router pathname,
 * with support for manual overrides and dynamic route segments.
 *
 * Usage:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Auto-generated from the current route (e.g. /tools/api-keys):
 *    <Breadcrumbs />
 *
 * 2. Fixed-dark pages (bg-slate-950 without a light/dark toggle):
 *    <Breadcrumbs variant="dark" />
 *
 * 3. Manual override, e.g. to label a dynamic [id] segment:
 *    <Breadcrumbs items={[{ label: "Manifests", href: "/manifest" }, { label: manifestName }]} />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/utils/cn";

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page (renders as non-interactive, aria-current="page"). */
  href?: string;
}

export type BreadcrumbsVariant = "auto" | "dark";

export interface BreadcrumbsProps {
  /** Manual trail, overriding auto-generation from the pathname. */
  items?: BreadcrumbItem[];
  /** Accessible/visible label for the home crumb. Defaults to "Home". */
  homeLabel?: string;
  /**
   * "auto" (default) follows the site's light/dark theme via `dark:` classes.
   * "dark" is for pages with a fixed dark background (no theme toggle).
   */
  variant?: BreadcrumbsVariant;
  className?: string;
}

/** Known route segments whose human-readable label isn't a simple title-case of the slug. */
const ROUTE_LABELS: Record<string, string> = {
  "api-keys": "API Keys",
  "audit-logs": "Audit Logs",
  "hash-calculator": "Hash Calculator",
  "manifest-editor": "Manifest Editor",
  "signature-verifier": "Signature Verifier",
  "upload-content": "Upload Content",
  "batch-verification": "Batch Verification",
  "timeline-view": "Timeline View",
  "features-showcase": "Features Showcase",
  "report-issue": "Report an Issue",
  "skeleton-demo": "Skeleton Demo",
  "stepper-demo": "Stepper Demo",
};

function formatSegmentLabel(segment: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  return segment.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildItemsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  let href = "";
  return segments.map((segment, index) => {
    href += `/${segment}`;
    const isLast = index === segments.length - 1;
    const label = formatSegmentLabel(decodeURIComponent(segment));
    return isLast ? { label } : { label, href };
  });
}

const VARIANT_CLASSES: Record<
  BreadcrumbsVariant,
  { list: string; link: string; current: string; separator: string }
> = {
  auto: {
    list: "text-gray-500 dark:text-gray-400",
    link: "hover:text-gray-900 dark:hover:text-white",
    current: "text-gray-900 dark:text-white",
    separator: "text-gray-300 dark:text-gray-600",
  },
  dark: {
    list: "text-slate-400",
    link: "hover:text-white",
    current: "text-white",
    separator: "text-slate-600",
  },
};

export function Breadcrumbs({
  items,
  homeLabel = "Home",
  variant = "auto",
  className,
}: BreadcrumbsProps) {
  const pathname = usePathname();
  const trail = items ?? buildItemsFromPath(pathname ?? "");
  const styles = VARIANT_CLASSES[variant];

  // Nothing meaningful to show on the home page itself.
  if (trail.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("w-full", className)}>
      <ol
        className={cn(
          "flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-3 px-1 text-sm",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          styles.list
        )}
      >
        <li className="flex items-center">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-1 rounded transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              styles.link
            )}
          >
            <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{homeLabel}</span>
          </Link>
        </li>

        {trail.map((item, index) => (
          <li key={`${item.href ?? item.label}-${index}`} className="flex items-center gap-1.5">
            <ChevronRight className={cn("h-4 w-4 shrink-0", styles.separator)} aria-hidden="true" />
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "max-w-[140px] truncate rounded transition-colors sm:max-w-none",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  styles.link
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                className={cn("max-w-[160px] truncate font-medium sm:max-w-none", styles.current)}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
