"use client";

import { cn } from "@/utils/cn";

interface AutoSaveIndicatorProps {
  lastSaved: number | null;
  isSaving: boolean;
  hasUnsaved: boolean;
  className?: string;
}

export function AutoSaveIndicator({
  lastSaved,
  isSaving,
  hasUnsaved,
  className,
}: AutoSaveIndicatorProps) {
  const getStatus = () => {
    if (isSaving) return { label: "Saving...", color: "text-yellow-500" };
    if (hasUnsaved) return { label: "Unsaved changes", color: "text-orange-500" };
    if (lastSaved) {
      const ago = Math.floor((Date.now() - lastSaved) / 1000);
      const timeAgo = ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`;
      return { label: `Auto-saved ${timeAgo}`, color: "text-green-500" };
    }
    return { label: "", color: "" };
  };

  const status = getStatus();
  if (!status.label) return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full",
          isSaving && "bg-yellow-500 animate-pulse",
          hasUnsaved && "bg-orange-500",
          !isSaving && !hasUnsaved && lastSaved && "bg-green-500"
        )}
      />
      <span className={status.color}>{status.label}</span>
    </div>
  );
}
