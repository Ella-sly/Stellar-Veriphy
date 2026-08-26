"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useToastHelpers } from "@/components/ToastProvider";
import { copyTextToClipboard } from "@/utils/clipboard";

interface UseCopyToClipboardOptions {
    /** How long `isCopied` stays true before resetting, in ms. Defaults to 2000. */
    resetDelay?: number;
    /** Message shown in the success toast. Defaults to "Copied to clipboard". */
    successMessage?: string;
    /** Message shown in the error toast. Defaults to "Failed to copy to clipboard". */
    errorMessage?: string;
    /** Set to false to suppress toast notifications. Defaults to true. */
    showToast?: boolean;
}

interface UseCopyToClipboardResult {
    /** Copies the given text. Resolves to whether the copy succeeded. */
    copy: (text: string) => Promise<boolean>;
    /** True for `resetDelay` ms after a successful copy — drive a checkmark icon off this. */
    isCopied: boolean;
    /** Set when the most recent copy attempt failed. */
    error: Error | null;
}

/**
 * Reusable hook for copying text to the clipboard, with success/error
 * state, toast notifications, and a timed `isCopied` flag for visual
 * feedback (e.g. swapping a copy icon for a checkmark).
 */
export function useCopyToClipboard(
    options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardResult {
    const {
        resetDelay = 2000,
        successMessage = "Copied to clipboard",
        errorMessage = "Failed to copy to clipboard",
        showToast = true,
    } = options;

    const { success: toastSuccess, error: toastError } = useToastHelpers();
    const [isCopied, setIsCopied] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
            }
        };
    }, []);

    const copy = useCallback(
        async (text: string): Promise<boolean> => {
            const succeeded = await copyTextToClipboard(text);

            if (succeeded) {
                setError(null);
                setIsCopied(true);

                if (showToast) {
                    toastSuccess(successMessage);
                }

                if (resetTimeoutRef.current) {
                    clearTimeout(resetTimeoutRef.current);
                }
                resetTimeoutRef.current = setTimeout(() => {
                    setIsCopied(false);
                }, resetDelay);
            } else {
                const copyError = new Error(errorMessage);
                setError(copyError);
                setIsCopied(false);

                if (showToast) {
                    toastError(errorMessage);
                }
            }

            return succeeded;
        },
        [errorMessage, resetDelay, showToast, successMessage, toastError, toastSuccess]
    );

    return { copy, isCopied, error };
}
