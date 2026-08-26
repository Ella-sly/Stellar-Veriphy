"use client";

/**
 * CertificateStatusBadge.tsx
 *
 * Renders a colored badge indicating the current status of a certificate.
 * Statuses: Active, Revoked, Expired, Locked, Pending
 */

import type { VerificationStatus } from "@/services/verificationStatusService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CertificateStatus = "Active" | "Revoked" | "Expired" | "Locked" | "Pending" | "Failed";

interface CertificateStatusBadgeProps {
  status: CertificateStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

// ---------------------------------------------------------------------------
// Style configuration
// ---------------------------------------------------------------------------

interface StatusStyle {
  bg: string;
  text: string;
  ring: string;
  icon: string;
  label: string;
}

const STATUS_STYLES: Record<CertificateStatus, StatusStyle> = {
  Active: {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-600/20 dark:ring-emerald-400/20",
    icon: "✓",
    label: "Certificate is valid and active",
  },
  Revoked: {
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    ring: "ring-red-600/20 dark:ring-red-400/20",
    icon: "✕",
    label: "Certificate has been revoked",
  },
  Expired: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-600/20 dark:ring-amber-400/20",
    icon: "⚠",
    label: "Certificate has expired",
  },
  Locked: {
    bg: "bg-violet-50 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-600/20 dark:ring-violet-400/20",
    icon: "🔒",
    label: "Certificate is immutably locked",
  },
  Pending: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-600/20 dark:ring-blue-400/20",
    icon: "○",
    label: "Verification is pending",
  },
  Failed: {
    bg: "bg-rose-50 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-600/20 dark:ring-rose-400/20",
    icon: "!!",
    label: "Verification failed",
  },
};

const SIZE_STYLES: Record<string, string> = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
  lg: "text-sm px-3 py-1.5 gap-2",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CertificateStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: CertificateStatusBadgeProps) {
  const style = STATUS_STYLES[status];

  return (
    <span
      role="status"
      aria-label={style.label}
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset transition-colors ${style.bg} ${style.text} ${style.ring} ${SIZE_STYLES[size]}`}
    >
      {showIcon && (
        <span className="shrink-0 leading-none" aria-hidden="true">
          {style.icon}
        </span>
      )}
      {status}
    </span>
  );
}
