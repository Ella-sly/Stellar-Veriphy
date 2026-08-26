/**
 * clipboard.ts
 *
 * Cross-browser clipboard utility. Prefers the async Clipboard API and
 * falls back to the legacy `execCommand("copy")` approach for browsers
 * (and mobile webviews) where the Clipboard API is unavailable or blocked
 * (e.g. insecure contexts).
 */

function copyWithExecCommand(text: string): boolean {
    if (typeof document === "undefined") return false;

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    let succeeded = false;
    try {
        succeeded = document.execCommand("copy");
    } catch {
        succeeded = false;
    } finally {
        document.body.removeChild(textarea);
    }

    return succeeded;
}

/**
 * Copies text to the clipboard, returning true on success and false on
 * failure instead of throwing, so callers can drive UI feedback directly.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall through to the legacy fallback below.
        }
    }

    return copyWithExecCommand(text);
}
