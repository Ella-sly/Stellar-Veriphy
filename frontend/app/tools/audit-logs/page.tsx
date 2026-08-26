"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { auditLogger, type AuditLogEntry } from "@/lib/security/auditLogger";

export default function AuditLogsPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState({
    totalEntries: 0,
    byCategory: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    tamperProof: true,
  });

  const refresh = async () => {
    const currentEntries = auditLogger.getEntries();
    setEntries(currentEntries);
    setSummary(auditLogger.getSummary());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const logDemoAction = async () => {
    await auditLogger.logEvent({
      actor: "security-operator",
      category: "admin",
      action: "reviewed verification settings",
      severity: "info",
      details: "Triggered from the audit log viewer",
    });
    await refresh();
  };

  const exportReport = () => {
    const report = JSON.stringify(
      {
        retentionDays: auditLogger.getRetentionDays(),
        summary: auditLogger.getSummary(),
        entries: auditLogger.getEntries(),
      },
      null,
      2
    );

    const blob = new Blob([report], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-log-report.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <Header />
      <div className="mx-auto max-w-6xl px-6">
        <Breadcrumbs variant="dark" />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <div className="space-y-3">
          <Link href="/tools" className="text-sm text-blue-400 hover:text-blue-300">
            ← Back to tools
          </Link>
          <h1 className="text-4xl font-semibold">Audit Logging</h1>
          <p className="max-w-3xl text-lg text-slate-300">
            Review tamper-evident security events, retention rules, and compliance-oriented
            summaries in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              void logDemoAction();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500"
          >
            Log sample admin action
          </button>
          <button
            onClick={exportReport}
            className="rounded-lg border border-slate-700 px-4 py-2 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Export audit report
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-sm text-slate-400">Total entries</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.totalEntries}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-sm text-slate-400">Retention</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {auditLogger.getRetentionDays()} days
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-sm text-slate-400">Tamper evidence</p>
            <p
              className={`mt-2 text-xl font-semibold ${summary.tamperProof ? "text-emerald-400" : "text-amber-400"}`}
            >
              {summary.tamperProof ? "Chain intact" : "Chain mismatch"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="mb-4 flex flex-wrap gap-2 text-sm text-slate-400">
            {Object.entries(summary.byCategory).map(([category, count]) => (
              <span key={category} className="rounded-full border border-slate-700 px-3 py-1">
                {category}: {count}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-800/70 text-slate-200">
                    <td className="px-3 py-2 whitespace-nowrap">{entry.timestamp}</td>
                    <td className="px-3 py-2">{entry.actor}</td>
                    <td className="px-3 py-2">{entry.category}</td>
                    <td className="px-3 py-2">{entry.action}</td>
                    <td className="px-3 py-2">{entry.severity}</td>
                    <td className="px-3 py-2">{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
