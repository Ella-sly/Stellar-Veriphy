"use client";

import { generateMockHistory } from "@/components/certificates/CertificateHistoryTimeline";
import { CertificateHistoryTimelineView } from "@/components/timeline";

export default function TimelineViewPage() {
  // Generate mock data for demo
  const mockEvents = generateMockHistory(
    "12345",
    "GABC...XYZ",
    Math.floor(Date.now() / 1000) - 86400 * 7
  );

  // Add more events for a richer timeline
  mockEvents.push(
    {
      id: 3,
      action: "transferred",
      modifier: "GDEF...ABC",
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 5,
      details: "Ownership transferred to new creator",
    },
    {
      id: 4,
      action: "renewed",
      modifier: "GDEF...ABC",
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 2,
      details: "Certificate renewed for another year",
    },
    {
      id: 5,
      action: "linked",
      modifier: "GDEF...ABC",
      timestamp: Math.floor(Date.now() / 1000) - 86400,
      details: "Linked to certificate #12346",
    }
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <CertificateHistoryTimelineView certificateId="CERT-12345" events={mockEvents} />
    </div>
  );
}
