"use client";

import Link from "next/link";
import { useState } from "react";

import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import {
  clearAllLocalData,
  countLocalDataKeys,
  downloadLocalDataExport,
} from "@/lib/privacy/localData";

const LAST_UPDATED = "2026-07-30";

export default function PrivacyPage() {
  const [keyCount, setKeyCount] = useState<number | null>(null);
  const [deleted, setDeleted] = useState(false);

  const refreshCount = () => setKeyCount(countLocalDataKeys());

  const handleDelete = () => {
    if (
      !confirm(
        "Delete all locally stored StellarVeriphy data (preferences, audit log, API keys, drafts)? This cannot be undone and cannot be recovered."
      )
    ) {
      return;
    }
    clearAllLocalData();
    setDeleted(true);
    setKeyCount(0);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <Header />
      <div className="mx-auto max-w-4xl px-6">
        <Breadcrumbs variant="dark" />
      </div>
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold">Privacy Policy</h1>
          <p className="text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Manage your data</h2>
          <p className="text-slate-300">
            Because StellarVeriphy keeps everything described below in your browser rather than on a
            server, you can export or permanently delete it yourself at any time — no request or
            waiting period required.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={downloadLocalDataExport}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500"
            >
              Export my data (JSON)
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-500"
            >
              Delete all my data
            </button>
            <button
              type="button"
              onClick={refreshCount}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Check stored item count
            </button>
            {keyCount !== null && (
              <span className="text-sm text-slate-400">
                {keyCount} item{keyCount === 1 ? "" : "s"} currently stored
              </span>
            )}
          </div>
          {deleted && (
            <p className="text-sm text-emerald-400" role="status">
              All locally stored data has been deleted from this browser.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">What we store, and where</h2>
          <p className="text-slate-300">
            StellarVeriphy has no user-account database and no analytics or advertising trackers.
            Everything the app remembers about you lives in your browser&apos;s{" "}
            <code className="text-slate-200">localStorage</code>, scoped to this site&apos;s origin,
            and is never transmitted to a StellarVeriphy server:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-slate-300">
            <li>Theme preference (light/dark)</li>
            <li>In-progress form drafts (manifest builder, issue report) for autosave/recovery</li>
            <li>
              The security{" "}
              <Link href="/tools/audit-logs" className="text-blue-400 hover:text-blue-300">
                audit log
              </Link>{" "}
              of admin actions taken in this browser (90-day retention, pruned automatically)
            </li>
            <li>
              Mock API keys you generate for the demo API key manager (only a hash is kept — see
              below)
            </li>
            <li>Keyboard shortcut and notification preferences</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Blockchain data is public</h2>
          <p className="text-slate-300">
            Verification requests, provenance certificates, and registry entries submitted through
            StellarVeriphy are written to the Stellar public ledger via `contracts/oracle`,
            `contracts/provenance`, and `contracts/registry`. Public ledger data is, by design,
            permanent and visible to anyone — it is not covered by the export/delete controls above,
            since no one (including StellarVeriphy) can remove data from the chain after it&apos;s
            confirmed. Do not submit content you don&apos;t want to be permanently, publicly
            associated with your wallet address.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Wallet keys</h2>
          <p className="text-slate-300">
            StellarVeriphy never has access to your wallet&apos;s private key. Signing happens
            entirely inside your connected wallet extension (e.g. Freighter); the app only ever
            receives your public address and signed transactions. See{" "}
            <a
              href="https://github.com/Stellar-Veriphy/Stellar-Veriphy/blob/main/docs/security/key-management.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              our key management policy
            </a>{" "}
            for how every other key category in the system is handled.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Cookies and tracking</h2>
          <p className="text-slate-300">
            StellarVeriphy does not set tracking or advertising cookies, and does not run
            third-party analytics. The only browser storage in use is the functional{" "}
            <code className="text-slate-200">localStorage</code> described above.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Your rights (GDPR / CCPA)</h2>
          <ul className="list-disc space-y-1 pl-6 text-slate-300">
            <li>
              <strong className="text-white">Right to access:</strong> use &quot;Export my
              data&quot; above to download everything stored about you, in full, at any time.
            </li>
            <li>
              <strong className="text-white">Right to erasure:</strong> use &quot;Delete all my
              data&quot; above. Because storage is local-only, deletion is immediate and complete —
              there is no server-side copy to separately purge.
            </li>
            <li>
              <strong className="text-white">Right to know / opt out of sale:</strong>{" "}
              StellarVeriphy does not sell or share personal data with third parties, because it
              does not collect any on a server in the first place.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Data retention</h2>
          <p className="text-slate-300">
            See the{" "}
            <a
              href="https://github.com/Stellar-Veriphy/Stellar-Veriphy/blob/main/docs/legal/data-retention-policy.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              data retention policy
            </a>{" "}
            for the retention window of each data category listed above.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Contact</h2>
          <p className="text-slate-300">
            Questions about this policy or how StellarVeriphy handles data can be raised as a{" "}
            <a
              href="https://github.com/Stellar-Veriphy/Stellar-Veriphy/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              GitHub issue
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
