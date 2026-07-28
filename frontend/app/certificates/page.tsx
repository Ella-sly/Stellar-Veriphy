"use client";

/**
 * Certificates Page (/certificates)
 *
 * Dedicated page for certificate verification and lookup.
 * Provides a full-featured search interface with three lookup modes
 * (ID, verification code, creator address) and displays detailed
 * certificate information including status, verification level,
 * cryptographic proofs, and history timeline.
 */

import { Header } from "@/components/landing/Header";
import { CertificateVerificationPanel } from "@/components/certificates/CertificateVerificationPanel";

export default function CertificatesPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <div className="pt-24 pb-16">
        {/* ── Page header ── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-10">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 mb-4">
              <svg
                className="w-8 h-8 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Certificate Verification
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Verify the authenticity of StellarVeriphy provenance certificates.
              Look up by certificate ID, verification code, or creator address.
            </p>
          </div>
        </div>

        {/* ── Verification panel ── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <CertificateVerificationPanel />
        </div>
      </div>
    </main>
  );
