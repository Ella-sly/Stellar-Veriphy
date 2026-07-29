"use client";

/**
 * APIKeyManagement — Issue #219
 *
 * UI for generating and managing API keys for programmatic access to
 * verification services. Includes key generation, revocation, permission/scope
 * management, usage analytics, rate limiting configuration, and expiration dates.
 */

import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import { copyToClipboard } from "@/utils/validation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApiKeyScope =
  | "read:certificates"
  | "write:verifications"
  | "read:analytics"
  | "admin:registry";

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: ApiKeyScope[];
  rateLimitPerMinute: number;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  status: "active" | "revoked";
}

interface ApiKeyManagementProps {
  /** User's public key or identifier (used to scope API keys to the user). */
  userAddress: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Scope definitions
// ---------------------------------------------------------------------------

const SCOPE_DEFINITIONS: Record<
  ApiKeyScope,
  { label: string; description: string }
> = {
  "read:certificates": {
    label: "Read Certificates",
    description: "View and retrieve provenance certificates",
  },
  "write:verifications": {
    label: "Submit Verifications",
    description: "Submit new verification requests via API",
  },
  "read:analytics": {
    label: "Read Analytics",
    description: "Access usage statistics and analytics dashboards",
  },
  "admin:registry": {
    label: "Admin Registry",
    description: "Manage TEE hashes and oracle provider registry (admin only)",
  },
};

// ---------------------------------------------------------------------------
// Mock API (replace with real backend calls in production)
// ---------------------------------------------------------------------------

const MOCK_STORAGE_KEY = "sv_api_keys";

function loadKeys(userAddress: string): ApiKey[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`${MOCK_STORAGE_KEY}_${userAddress}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveKeys(userAddress: string, keys: ApiKey[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${MOCK_STORAGE_KEY}_${userAddress}`, JSON.stringify(keys));
}

function generateRandomKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "sv_";
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function APIKeyManagement({ userAddress, className }: ApiKeyManagementProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Create key form state
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<Set<ApiKeyScope>>(new Set());
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(60);
  const [newKeyExpiration, setNewKeyExpiration] = useState<number>(30); // days
  const [newKeyNeverExpires, setNewKeyNeverExpires] = useState(false);

  // Newly created key (to show once, then hide)
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedRecently, setCopiedRecently] = useState(false);

  useEffect(() => {
    setKeys(loadKeys(userAddress));
  }, [userAddress]);

  const persistKeys = (updated: ApiKey[]) => {
    setKeys(updated);
    saveKeys(userAddress, updated);
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      alert("Please provide a key name.");
      return;
    }
    if (newKeyScopes.size === 0) {
      alert("Please select at least one permission scope.");
      return;
    }

    const now = new Date();
    const expiresAt = newKeyNeverExpires
      ? null
      : new Date(
          now.getTime() + newKeyExpiration * 24 * 60 * 60 * 1000
        ).toISOString();

    const newKey: ApiKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: newKeyName.trim(),
      key: generateRandomKey(),
      scopes: Array.from(newKeyScopes),
      rateLimitPerMinute: newKeyRateLimit,
      createdAt: now.toISOString(),
      expiresAt,
      lastUsedAt: null,
      usageCount: 0,
      status: "active",
    };

    const updated = [newKey, ...keys];
    persistKeys(updated);

    // Reveal the newly generated key
    setRevealedKey(newKey.key);

    // Reset form
    setNewKeyName("");
    setNewKeyScopes(new Set());
    setNewKeyRateLimit(60);
    setNewKeyExpiration(30);
    setNewKeyNeverExpires(false);
    setIsCreating(false);
  };

  const handleRevokeKey = (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) {
      return;
    }
    const updated = keys.map((k) =>
      k.id === id ? { ...k, status: "revoked" as const } : k
    );
    persistKeys(updated);
  };

  const handleDeleteKey = (id: string) => {
    if (!confirm("Permanently delete this API key?")) return;
    const updated = keys.filter((k) => k.id !== id);
    persistKeys(updated);
  };

  const handleCopyKey = async (key: string) => {
    try {
      await copyToClipboard(key);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("Failed to copy to clipboard.");
    }
  };

  const toggleScope = (scope: ApiKeyScope) => {
    const next = new Set(newKeyScopes);
    if (next.has(scope)) {
      next.delete(scope);
    } else {
      next.add(scope);
    }
    setNewKeyScopes(next);
  };

  const activeKeys = keys.filter((k) => k.status === "active");
  const revokedKeys = keys.filter((k) => k.status === "revoked");

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            API Key Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Generate and manage API keys for programmatic access to verification
            services.
          </p>
        </div>
        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-semibold transition-all shadow-md"
          >
            + Generate New Key
          </button>
        )}
      </div>

      {/* Revealed key banner (shown immediately after creation) */}
      {revealedKey && (
        <div
          role="alert"
          className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg"
        >
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
            ⚠️ Save your API key now — it won&apos;t be shown again!
          </p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-md break-all">
              {revealedKey}
            </code>
            <button
              type="button"
              onClick={() => handleCopyKey(revealedKey)}
              className={cn(
                "px-4 py-2 rounded-md text-xs font-semibold transition-all",
                copiedRecently
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              )}
            >
              {copiedRecently ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRevealedKey(null)}
            className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create key form */}
      {isCreating && (
        <div className="p-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New API Key
          </h3>

          {/* Key name */}
          <div>
            <label
              htmlFor="key-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Key Name <span className="text-red-500">*</span>
            </label>
            <input
              id="key-name"
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production API, Mobile App, Test Environment"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Scopes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Permissions / Scopes <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(SCOPE_DEFINITIONS) as ApiKeyScope[]).map((scope) => {
                const def = SCOPE_DEFINITIONS[scope];
                const isChecked = newKeyScopes.has(scope);
                return (
                  <label
                    key={scope}
                    className={cn(
                      "flex items-start gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all",
                      isChecked
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleScope(scope)}
                      className="mt-0.5 w-4 h-4 rounded"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                        {def.label}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {def.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Rate limit */}
          <div>
            <label
              htmlFor="rate-limit"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Rate Limit (requests/minute)
            </label>
            <input
              id="rate-limit"
              type="number"
              min="1"
              max="10000"
              value={newKeyRateLimit}
              onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value, 10) || 60)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expiration
            </label>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newKeyNeverExpires}
                  onChange={(e) => setNewKeyNeverExpires(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Never expires
                </span>
              </label>
            </div>
            {!newKeyNeverExpires && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={newKeyExpiration}
                  onChange={(e) =>
                    setNewKeyExpiration(parseInt(e.target.value, 10) || 30)
                  }
                  className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  days from now
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCreateKey}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
            >
              Create API Key
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active keys list */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Active API Keys ({activeKeys.length})
        </h3>
        {activeKeys.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No active API keys. Click &quot;Generate New Key&quot; to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {activeKeys.map((key) => (
              <div
                key={key.id}
                className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {key.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {key.id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRevokeKey(key.id)}
                      className="px-3 py-1 rounded text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {new Date(key.createdAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Expires:</span>{" "}
                    {key.expiresAt
                      ? new Date(key.expiresAt).toLocaleDateString()
                      : "Never"}
                  </div>
                  <div>
                    <span className="font-medium">Rate Limit:</span>{" "}
                    {key.rateLimitPerMinute} req/min
                  </div>
                  <div>
                    <span className="font-medium">Usage:</span> {key.usageCount}{" "}
                    requests
                  </div>
                  <div>
                    <span className="font-medium">Last Used:</span>{" "}
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleString()
                      : "Never"}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Scopes:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {key.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      >
                        {SCOPE_DEFINITIONS[scope].label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revoked keys list */}
      {revokedKeys.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Revoked API Keys ({revokedKeys.length})
          </h3>
          <div className="space-y-2">
            {revokedKeys.map((key) => (
              <div
                key={key.id}
                className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg opacity-60"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {key.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Revoked — ID: {key.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey(key.id)}
                    className="px-2 py-1 rounded text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
