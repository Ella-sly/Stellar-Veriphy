/**
 * Normalizes the various error shapes returned by the Freighter API
 * into consistent user-facing messages.
 */

/** Known Freighter error codes and their human-readable messages. */
const FREIGHTER_ERROR_MESSAGES: Record<string, string> = {
  // User explicitly dismissed or rejected the request
  "-4": "You rejected the request in Freighter.",
  USER_DECLINED: "You rejected the request in Freighter.",
  USER_REJECTED: "You rejected the request in Freighter.",

  // Network / passphrase mismatch
  NETWORK_MISMATCH: "Network mismatch — please switch to the correct network in Freighter.",
  "-3": "Network mismatch — please switch to the correct network in Freighter.",

  // Wallet not connected / no access
  NOT_ALLOWED: "Freighter access not granted. Please connect your wallet.",
  "-2": "Freighter access not granted. Please connect your wallet.",

  // Extension not installed or unavailable
  NOT_INSTALLED: "Freighter extension is not installed.",
  "-1": "Freighter extension is not installed.",

  // Signing failed
  SIGN_FAILED: "Transaction signing failed. Please try again.",
};

const FALLBACK_MESSAGE = "An unexpected wallet error occurred. Please try again.";

/**
 * Shape of a Freighter-specific error object (v6 API returns `{ code, message }`).
 */
interface FreighterError {
  code?: string | number;
  message?: string;
}

function isFreighterError(value: unknown): value is FreighterError {
  return (
    typeof value === "object" &&
    value !== null &&
    ("code" in value || "message" in value)
  );
}

/**
 * Parses any error thrown by the Freighter API (or wallet-related code)
 * and returns a non-empty, human-readable string suitable for display.
 */
export function parseWalletError(err: unknown): string {
  if (err == null) {
    return FALLBACK_MESSAGE;
  }

  // Plain string
  if (typeof err === "string") {
    return err.trim() || FALLBACK_MESSAGE;
  }

  // Standard Error object
  if (err instanceof Error) {
    return err.message.trim() || FALLBACK_MESSAGE;
  }

  // Freighter-specific error object { code, message }
  if (isFreighterError(err)) {
    const code = String(err.code ?? "").trim();
    if (code && FREIGHTER_ERROR_MESSAGES[code]) {
      return FREIGHTER_ERROR_MESSAGES[code];
    }
    if (err.message?.trim()) {
      return err.message.trim();
    }
    return FALLBACK_MESSAGE;
  }

  return FALLBACK_MESSAGE;
}
