/**
 * Local data export/erasure helpers backing the GDPR/CCPA "right to access"
 * and "right to be forgotten" controls on /privacy.
 *
 * StellarVeriphy has no server-side account/database — this browser origin's
 * `localStorage` is the entire store of data the app keeps about a user
 * (audit log entries, mock API keys, form drafts, preferences). Exporting or
 * clearing "all local data" therefore means exporting/clearing every key in
 * this origin's `localStorage`, not a curated subset.
 */

export function readAllLocalData(): Record<string, unknown> {
  if (typeof window === "undefined") return {};

  const result: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key === null) continue;
    const raw = window.localStorage.getItem(key);
    if (raw === null) continue;
    try {
      result[key] = JSON.parse(raw);
    } catch {
      result[key] = raw;
    }
  }
  return result;
}

export function downloadLocalDataExport(): void {
  if (typeof window === "undefined") return;

  const payload = {
    exportedAt: new Date().toISOString(),
    origin: window.location.origin,
    data: readAllLocalData(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stellarveriphy-local-data-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function clearAllLocalData(): void {
  if (typeof window === "undefined") return;
  window.localStorage.clear();
}

export function countLocalDataKeys(): number {
  if (typeof window === "undefined") return 0;
  return window.localStorage.length;
}
