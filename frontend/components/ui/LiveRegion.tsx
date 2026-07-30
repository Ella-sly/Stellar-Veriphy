"use client";

/**
 * LiveRegion.tsx
 *
 * ARIA live region for announcing dynamic content changes to screen readers.
 * Used for loading states, notifications, and other status updates.
 */

import { useEffect, useState } from "react";

interface LiveRegionProps {
    message: string;
    politeness?: "polite" | "assertive";
    clearAfter?: number;
}

export function LiveRegion({
    message,
    politeness = "polite",
    clearAfter = 3000,
}: LiveRegionProps) {
    const [announced, setAnnounced] = useState("");

    useEffect(() => {
        if (message) {
            setAnnounced(message);

            if (clearAfter > 0) {
                const timer = setTimeout(() => {
                    setAnnounced("");
                }, clearAfter);

                return () => clearTimeout(timer);
            }
        }
    }, [message, clearAfter]);

    return (
        <div
            role="status"
            aria-live={politeness}
            aria-atomic="true"
            className="sr-only"
        >
            {announced}
        </div>
    );
}

/**
 * Hook for announcing loading states to screen readers
 */
export function useLoadingAnnouncement(isLoading: boolean, loadingText = "Loading content", loadedText = "Content loaded") {
    const [announcement, setAnnouncement] = useState("");

    useEffect(() => {
        if (isLoading) {
            setAnnouncement(loadingText);
        } else {
            setAnnouncement(loadedText);
            // Clear after a short delay
            const timer = setTimeout(() => setAnnouncement(""), 1000);
            return () => clearTimeout(timer);
        }
    }, [isLoading, loadingText, loadedText]);

    return announcement;
}
