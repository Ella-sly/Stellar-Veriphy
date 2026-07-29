"use client";

/**
 * ContentHashCalculator — Issue #217
 *
 * Standalone tool for calculating and verifying content hashes without blockchain
 * submission. Supports multiple hash algorithms (SHA-256, SHA-512), copy to
 * clipboard, hash comparison, large file chunking, and progress reporting.
 */

import { useState, useRef, useCallback } from "react";
import { cn } from "@/utils/cn";
import { hashFile } from "@/utils/hashing";
import { copyToClipboard } from "@/utils/validation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HashAlgorithm = "SHA-256" | "SHA-512";

interface HashResult {
  algorithm: HashAlgorithm;
  hash: string;
  fileName: string;
  fileSize: number;
  calculatedAt: string;
}

interface ContentHashCalculatorProps {
  className?: string;
  /** Called when a hash is successfully calculated. */
  onHashCalculated?: (result: HashResult) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Hash a file using the browser's SubtleCrypto API.
 * Falls back to Node.js crypto for test environments.
 */
async function calculateHash(
  file: File,
  algorithm: HashAlgorithm,
  onProgress: (p: number) => void
): Promise<string> {
  if (algorithm === "SHA-256") {
    return hashFile(file, onProgress);
  }

  // SHA-512 implementation
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  const total = file.size;

  if (total === 0) {
    const digest = await crypto.subtle.digest("SHA-512", new Uint8Array(0));
    return bufferToHex(digest);
  }

  let offset = 0;
  while (offset < total) {
    const end = Math.min(offset + CHUNK_SIZE, total);
    const slice = file.slice(offset, end);
    const buffer = await slice.arrayBuffer();
    chunks.push(new Uint8Array(buffer));
    loaded += end - offset;
    offset = end;

    if (onProgress) {
      onProgress((loaded / total) * 100);
    }
  }

  // Concatenate all chunks into one buffer and hash once
  const combined = mergeChunks(chunks, total);
  const digest = await crypto.subtle.digest("SHA-512", combined);
  return bufferToHex(digest);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function mergeChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ContentHashCalculator({
  className,
  onHashCalculated,
}: ContentHashCalculatorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<HashResult | null>(null);
  const [compareHash, setCompareHash] = useState("");
  const [compareResult, setCompareResult] = useState<
    "match" | "mismatch" | null
  >(null);
  const [copiedRecently, setCopiedRecently] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setCompareHash("");
      setCompareResult(null);
      setProgress(0);
    }
  };

  const handleCalculate = useCallback(async () => {
    if (!selectedFile) return;

    setIsCalculating(true);
    setProgress(0);
    setResult(null);
    setCompareResult(null);

    try {
      const hash = await calculateHash(selectedFile, algorithm, (p) => {
        setProgress(Math.round(p));
      });

      const hashResult: HashResult = {
        algorithm,
        hash,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        calculatedAt: new Date().toISOString(),
      };

      setResult(hashResult);
      onHashCalculated?.(hashResult);
    } catch (error) {
      console.error("Hash calculation failed:", error);
      alert(
        `Failed to calculate hash: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsCalculating(false);
    }
  }, [selectedFile, algorithm, onHashCalculated]);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await copyToClipboard(result.hash);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("Failed to copy to clipboard.");
    }
  };

  const handleCompare = () => {
    if (!result || !compareHash.trim()) {
      setCompareResult(null);
      return;
    }
    const normalized = compareHash.trim().toLowerCase();
    const matches = normalized === result.hash.toLowerCase();
    setCompareResult(matches ? "match" : "mismatch");
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setCompareHash("");
    setCompareResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const algorithmOptions: HashAlgorithm[] = ["SHA-256", "SHA-512"];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Content Hash Calculator
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Calculate cryptographic hashes for your files without submitting to the
          blockchain. Supports large files with progress tracking.
        </p>
      </div>

      {/* Algorithm selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Hash Algorithm
        </label>
        <div className="flex gap-3">
          {algorithmOptions.map((algo) => (
            <button
              key={algo}
              type="button"
              disabled={isCalculating}
              onClick={() => setAlgorithm(algo)}
              aria-pressed={algorithm === algo}
              className={cn(
                "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                algorithm === algo
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600"
              )}
            >
              {algo}
            </button>
          ))}
        </div>
      </div>

      {/* File input */}
      <div>
        <label
          htmlFor="file-input"
          className="block text-sm font-semibold text-gray-900 dark:text-white mb-2"
        >
          Select File
        </label>
        <input
          ref={fileInputRef}
          id="file-input"
          type="file"
          disabled={isCalculating}
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-blue-400"
        />
        {selectedFile && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{selectedFile.name}</span> —{" "}
            {formatFileSize(selectedFile.size)}
          </p>
        )}
      </div>

      {/* Calculate button */}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!selectedFile || isCalculating}
          onClick={handleCalculate}
          className={cn(
            "flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md"
          )}
        >
          {isCalculating ? `Calculating... ${progress}%` : "Calculate Hash"}
        </button>
        {(selectedFile || result) && (
          <button
            type="button"
            disabled={isCalculating}
            onClick={handleReset}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isCalculating && (
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Hash calculation progress"
          className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
        >
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Result display */}
      {result && (
        <div className="space-y-4 p-5 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
              ✓ Hash Calculated
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(result.calculatedAt).toLocaleString()}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {result.algorithm} Hash
            </label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-md break-all">
                {result.hash}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy hash to clipboard"
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
          </div>

          {/* Compare hash feature */}
          <div className="pt-3 border-t border-green-200 dark:border-green-700">
            <label
              htmlFor="compare-hash"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Compare Against Provided Hash
            </label>
            <div className="flex gap-2">
              <input
                id="compare-hash"
                type="text"
                value={compareHash}
                onChange={(e) => {
                  setCompareHash(e.target.value);
                  setCompareResult(null);
                }}
                placeholder="Paste hash to compare"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleCompare}
                disabled={!compareHash.trim()}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-gray-700 dark:bg-gray-600 text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Compare
              </button>
            </div>

            {compareResult && (
              <div
                role="alert"
                className={cn(
                  "mt-3 px-3 py-2 rounded-md text-sm font-medium",
                  compareResult === "match"
                    ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700"
                    : "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700"
                )}
              >
                {compareResult === "match" ? (
                  <span>✓ Hashes match — content is identical.</span>
                ) : (
                  <span>✗ Hashes do NOT match — content differs.</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
