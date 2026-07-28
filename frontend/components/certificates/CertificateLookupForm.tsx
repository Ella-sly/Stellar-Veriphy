"use client";

/**
 * CertificateLookupForm.tsx
 *
 * Search form that supports three lookup modes:
 *   1. Certificate ID (numeric on-chain identifier)
 *   2. Verification Code (8-character alphanumeric)
 *   3. Creator Address (Stellar public key G...)
 *
 * Emits search results via the onResult callback.
 */

import { useState, useCallback, FormEvent } from "react";
import type { CertificateLookupMethod } from "@/services/certificateVerificationService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CertificateLookupFormProps {
  onSearch: (method: CertificateLookupMethod, value: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Lookup method configuration
// ---------------------------------------------------------------------------

interface LookupMethodConfig {
  id: CertificateLookupMethod;
  label: string;
  description: string;
  placeholder: string;
  inputType: string;
  validate: (value: string) => string | null;
}

const LOOKUP_METHODS: LookupMethodConfig[] = [
  {
    id: "id",
    label: "Certificate ID",
    description: "Look up by the on-chain certificate number",
    placeholder: "e.g. 42",
    inputType: "number",
    validate: (value) => {
      if (!value.trim()) return "Please enter a certificate ID";
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) return "Certificate ID must be a positive number";
      return null;
    },
  },
  {
    id: "code",
    label: "Verification Code",
    description: "Look up using the 8-character verification code",
    placeholder: "e.g. ABC12345",
    inputType: "text",
    validate: (value) => {
      if (!value.trim()) return "Please enter a verification code";
      const cleaned = value.trim().toUpperCase();
      if (!/^[A-Z0-9]{8}$/.test(cleaned)) return "Code must be exactly 8 alphanumeric characters";
      return null;
    },
  },
  {
    id: "creator",
    label: "Creator Address",
    description: "Find all certificates created by a Stellar address",
    placeholder: "e.g. G...",
    inputType: "text",
    validate: (value) => {
      if (!value.trim()) return "Please enter a Stellar address";
      if (!value.trim().startsWith("G")) return "Stellar public key must start with G";
      if (value.trim().length < 56) return "Stellar public key is 56 characters long";
      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CertificateLookupForm({
  onSearch,
  isLoading = false,
  error = null,
}: CertificateLookupFormProps) {
  const [method, setMethod] = useState<CertificateLookupMethod>("id");
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const activeConfig = LOOKUP_METHODS.find((m) => m.id === method)!;

  const handleMethodChange = useCallback((newMethod: CertificateLookupMethod) => {
    setMethod(newMethod);
    setInputValue("");
    setInputError(null);
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const validationError = activeConfig.validate(inputValue);
      if (validationError) {
        setInputError(validationError);
        return;
      }
      setInputError(null);
      onSearch(method, inputValue.trim());
    },
    [activeConfig, inputValue, method, onSearch]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* ── Method selector tabs ── */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {LOOKUP_METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => handleMethodChange(m.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors border-b-2 -mb-px ${
              method === m.id
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
            aria-current={method === m.id ? "page" : undefined}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {activeConfig.description}
        </p>

        {/* Input */}
        <div>
          <div className="relative">
            <input
              type={activeConfig.inputType}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder={activeConfig.placeholder}
              disabled={isLoading}
              className={`w-full px-4 py-3 pr-12 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 ${
                inputError
                  ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-describedby={inputError ? "lookup-input-error" : undefined}
              aria-invalid={!!inputError}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Searching
                </span>
              ) : (
                "Search"
              )}
            </button>
          </div>
          {inputError && (
            <p id="lookup-input-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
              {inputError}
            </p>
          )}
        </div>

        {/* Server/global error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
      </form>
    </div>
  );
}

