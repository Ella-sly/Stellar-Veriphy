"use client";

/**
 * Content Hash Calculator Demo Page — Issue #217
 */

import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ContentHashCalculator } from "@/components/ContentHashCalculator";

export default function HashCalculatorPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <div className="max-w-4xl mx-auto px-6">
        <Breadcrumbs />
      </div>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <ContentHashCalculator className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800" />

        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
            ℹ️ About Content Hashing
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed mb-3">
            Content hashing generates a unique cryptographic fingerprint for your file. Any
            modification to the file — even a single byte — will produce a completely different
            hash, making it ideal for verifying file integrity and authenticity.
          </p>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1.5 list-disc list-inside">
            <li>
              <strong>SHA-256:</strong> Industry-standard 256-bit hash, widely used and supported.
            </li>
            <li>
              <strong>SHA-512:</strong> 512-bit hash, offering a larger digest and higher collision
              resistance.
            </li>
            <li>
              All computations happen locally in your browser — files never leave your device.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
