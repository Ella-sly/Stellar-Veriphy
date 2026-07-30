export type AuditEventCategory = "admin" | "auth" | "contract" | "system";
export type AuditEventSeverity = "info" | "warning" | "critical";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  category: AuditEventCategory;
  action: string;
  severity: AuditEventSeverity;
  details: string;
  previousHash: string;
  chainHash: string;
}

const STORAGE_KEY = "sv_audit_events";
const RETENTION_DAYS = 90;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function hashValue(value: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value)
    );
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return Buffer.from(value).toString("base64");
}

function readStoredEntries(): AuditLogEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as AuditLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredEntries(entries: AuditLogEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

class AuditLogger {
  private entries: AuditLogEntry[] = [];

  constructor() {
    this.entries = readStoredEntries();
    void this.pruneExpiredEntries();
  }

  async logEvent(params: {
    actor: string;
    category: AuditEventCategory;
    action: string;
    severity?: AuditEventSeverity;
    details?: string;
  }): Promise<AuditLogEntry> {
    const previousHash = this.entries[0]?.chainHash ?? "genesis";
    const entry: AuditLogEntry = {
      id: createId(),
      timestamp: new Date().toISOString(),
      actor: params.actor,
      category: params.category,
      action: params.action,
      severity: params.severity ?? "info",
      details: params.details ?? "",
      previousHash,
      chainHash: "",
    };

    entry.chainHash = await hashValue(
      `${entry.previousHash}|${entry.timestamp}|${entry.actor}|${entry.category}|${entry.action}|${entry.severity}|${entry.details}`
    );

    this.entries = [entry, ...this.entries].slice(0, 250);
    writeStoredEntries(this.entries);
    return entry;
  }

  getEntries(): AuditLogEntry[] {
    return [...this.entries].sort((left, right) => {
      return left.timestamp < right.timestamp ? 1 : -1;
    });
  }

  getRetentionDays(): number {
    return RETENTION_DAYS;
  }

  getSummary() {
    const byCategory = this.entries.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});

    const bySeverity = this.entries.reduce<Record<string, number>>((acc, item) => {
      acc[item.severity] = (acc[item.severity] ?? 0) + 1;
      return acc;
    }, {});

    return {
      totalEntries: this.entries.length,
      byCategory,
      bySeverity,
      tamperProof: this.entries.every((entry, index) => {
        if (index === 0) return true;
        return entry.previousHash === this.entries[index - 1].chainHash;
      }),
    };
  }

  async pruneExpiredEntries(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const retained = this.entries.filter((entry) => {
      const stamp = new Date(entry.timestamp);
      return Number.isFinite(stamp.getTime()) && stamp >= cutoff;
    });

    if (retained.length !== this.entries.length) {
      this.entries = retained;
      writeStoredEntries(this.entries);
    }
  }
}

export const auditLogger = new AuditLogger();
