"use client";

import { useState } from "react";
import Link from "next/link";
import { BatchVerificationPanel } from "@/components/batch";
import { CertificateComparisonTool } from "@/components/comparison";
import { CertificateHistoryTimelineView } from "@/components/timeline";
import { useNotifications } from "@/components/notifications";
import { generateMockHistory } from "@/components/certificates/CertificateHistoryTimeline";

export default function FeaturesShowcasePage() {
  const [activeTab, setActiveTab] = useState<"batch" | "timeline" | "comparison">("batch");
  const { addNotification } = useNotifications();

  // Mock data for timeline
  const mockEvents = generateMockHistory(
    "12345",
    "GABC...XYZ",
    Math.floor(Date.now() / 1000) - 86400 * 7
  );

  // Add demo notification
  const handleAddDemoNotification = () => {
    addNotification({
      type: "verification",
      title: "Verification Complete",
      message: "Certificate CERT-ABC123 has been successfully verified",
      actionUrl: "/certificates/ABC123",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                New Features Showcase
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Explore the latest features added to Stellar-Veriphy
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAddDemoNotification}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Test Notification
              </button>
              <Link
                href="/"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("batch")}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "batch"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Batch Verification (#213)
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "timeline"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Timeline View (#212)
            </button>
            <button
              onClick={() => setActiveTab("comparison")}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "comparison"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Certificate Comparison (#215)
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        {activeTab === "batch" && (
          <div className="space-y-6">
            <div className="max-w-7xl mx-auto px-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  📦 Batch Verification Interface
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>✓ Multi-file drag-and-drop upload</li>
                  <li>✓ Real-time progress tracking</li>
                  <li>✓ CSV metadata import</li>
                  <li>✓ Retry failed items</li>
                  <li>✓ Batch statistics dashboard</li>
                </ul>
              </div>
            </div>
            <BatchVerificationPanel />
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div className="max-w-7xl mx-auto px-6">
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  📅 Certificate History Timeline View
                </h3>
                <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                  <li>✓ Interactive chronological timeline</li>
                  <li>✓ Event type filtering</li>
                  <li>✓ Expandable event details</li>
                  <li>✓ Export as image/PDF</li>
                  <li>✓ Color-coded event types</li>
                </ul>
              </div>
            </div>
            <CertificateHistoryTimelineView
              certificateId="CERT-DEMO-12345"
              events={mockEvents}
            />
          </div>
        )}

        {activeTab === "comparison" && (
          <div className="space-y-6">
            <div className="max-w-7xl mx-auto px-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                  🔍 Certificate Comparison Tool
                </h3>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <li>✓ Compare 2-3 certificates side-by-side</li>
                  <li>✓ Highlight differences automatically</li>
                  <li>✓ Export comparison report</li>
                  <li>✓ Share comparison links</li>
                  <li>✓ Visual content comparison</li>
                </ul>
              </div>
            </div>
            <CertificateComparisonTool />
          </div>
        )}
      </div>

      {/* Feature #214 Info Box */}
      <div className="fixed bottom-6 right-6 max-w-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 shadow-lg">
        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
          🔔 Notification Center (#214)
        </h3>
        <p className="text-xs text-amber-800 dark:text-amber-200 mb-3">
          Check the bell icon in the header to see the centralized notification system with categories, settings, and persistence.
        </p>
        <button
          onClick={handleAddDemoNotification}
          className="w-full px-3 py-2 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 transition-colors"
        >
          Add Demo Notification
        </button>
      </div>
    </div>
  );
}
