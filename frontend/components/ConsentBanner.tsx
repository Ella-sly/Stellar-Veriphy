"use client";

/**
 * ConsentBanner — issue #269
 *
 * StellarVeriphy doesn't set tracking cookies or run analytics — it uses
 * browser `localStorage` for functional purposes only (theme preference,
 * form autosave, the audit log, mock API keys). Under GDPR/ePrivacy-style
 * rules that still counts as non-essential local storage the user should be
 * informed about, so this banner discloses it and links to /privacy rather
 * than silently starting to write to localStorage on first load.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "sv_consent_ack";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(CONSENT_KEY) === null);
    } catch {
      // localStorage unavailable (e.g. private browsing lockdown) — skip the banner.
    }
  }, []);

  const acknowledge = () => {
    try {
      window.localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ acknowledgedAt: new Date().toISOString() })
      );
    } catch {
      // Nothing to persist to — dismiss for this session only.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Local storage notice"
      className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 text-slate-200 border-t border-slate-700 px-4 py-4 sm:px-6"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="text-sm flex-1">
          StellarVeriphy stores data such as your theme preference, in-progress form
          drafts, and admin audit log entries in your browser&apos;s local storage.
          It doesn&apos;t use tracking cookies or send this data to a server. See our{" "}
          <Link href="/privacy" className="underline hover:text-white">
            Privacy Policy
          </Link>{" "}
          for details, or export/delete this data at any time.
        </p>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/privacy"
            className="px-3 py-1.5 rounded text-xs font-semibold border border-slate-600 text-slate-200 hover:border-slate-400 transition-colors"
          >
            Manage
          </Link>
          <button
            type="button"
            onClick={acknowledge}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
