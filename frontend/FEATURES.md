# New Features Documentation

This document describes the four new features implemented for the Stellar-Veriphy frontend.

## Feature #213: Batch Verification Interface

### Overview

Multi-file upload and verification system with progress tracking and CSV metadata import.

### Location

- Component: `/frontend/components/batch/BatchVerificationPanel.tsx`
- Demo Page: `/frontend/app/batch-verification/page.tsx`

### Features

- Drag-and-drop file upload
- Multiple file selection
- Individual file status tracking (pending, processing, completed, failed)
- Progress bars for each file
- Retry functionality for failed items
- Remove files from batch
- CSV import for metadata assignment
- Batch statistics dashboard
- Mock verification for demo purposes

### Usage

```tsx
import { BatchVerificationPanel } from "@/components/batch";

<BatchVerificationPanel
  onVerify={async (files) => {
    // Custom verification logic
  }}
/>;
```

### CSV Format for Metadata Import

```csv
filename,device,location,author
image1.jpg,iPhone 13,New York,John Doe
image2.png,Canon EOS,Los Angeles,Jane Smith
```

---

## Feature #212: Certificate History Timeline View

### Overview

Interactive timeline visualization showing the complete certificate lifecycle with filtering and export capabilities.

### Location

- Component: `/frontend/components/timeline/CertificateHistoryTimelineView.tsx`
- Demo Page: `/frontend/app/timeline-view/page.tsx`

### Features

- Chronological event timeline with icons and colors
- Event types: minted, transferred, metadata_updated, revoked, renewed, linked, locked
- Expandable event details
- Filter by event type
- Export timeline as image or PDF
- Load more pagination
- Responsive design

### Usage

```tsx
import { CertificateHistoryTimelineView } from "@/components/timeline";

<CertificateHistoryTimelineView
  certificateId="CERT-12345"
  events={historyEvents}
  onLoadMore={() => {}}
  hasMore={false}
/>;
```

### Event Structure

```typescript
interface HistoryEvent {
  id: number;
  action: string;
  modifier: string;
  timestamp: number;
  details?: string;
}
```

---

## Feature #214: Notification Center

### Overview

Centralized notification system with categories, settings, and persistent storage.

### Location

- Component: `/frontend/components/notifications/NotificationCenter.tsx`
- Integration: Added to `/frontend/app/layout.tsx` and `/frontend/components/Header.tsx`

### Features

- Notification bell icon with unread badge count
- Dropdown notification list
- Notification categories: verification, system, message, alert
- Mark as read functionality (individual and bulk)
- Remove individual notifications
- Clear all notifications
- Email notification opt-in setting
- Push notification support setting
- LocalStorage persistence
- Time-relative formatting (e.g., "5m ago", "2h ago")

### Usage

```tsx
// Provider (already added to layout.tsx)
import { NotificationProvider } from "@/components/notifications";

<NotificationProvider>{children}</NotificationProvider>;

// Bell component (already added to Header.tsx)
import { NotificationBell } from "@/components/notifications";

<NotificationBell />;

// Use notifications programmatically
import { useNotifications } from "@/components/notifications";

function MyComponent() {
  const { addNotification } = useNotifications();

  addNotification({
    type: "verification",
    title: "Verification Complete",
    message: "Your certificate has been verified",
    actionUrl: "/certificates/123",
  });
}
```

### Notification Types

- `verification`: Green - verification-related updates
- `system`: Blue - system alerts
- `message`: Purple - user messages
- `alert`: Red - important alerts

---

## Feature #215: Certificate Comparison Tool

### Overview

Side-by-side comparison tool to analyze differences between 2-3 certificates.

### Location

- Component: `/frontend/components/comparison/CertificateComparisonTool.tsx`
- Demo Page: `/frontend/app/comparison/page.tsx`

### Features

- Search certificates by ID, creator, or content hash
- Select 2-3 certificates for comparison
- Two comparison modes:
  - **Side by Side**: View all certificate fields in parallel
  - **Differences Only**: Highlight only the fields that differ
- Export comparison report as JSON
- Share comparison link
- Visual difference highlighting
- Metadata comparison

### Usage

```tsx
import { CertificateComparisonTool } from "@/components/comparison";

<CertificateComparisonTool
  onSearch={async (query) => {
    // Return search results
    return certificates;
  }}
  certificates={initialCertificates}
/>;
```

### Certificate Structure

```typescript
interface Certificate {
  id: string;
  contentHash: string;
  creator: string;
  timestamp: number;
  storageRef: string;
  manifestHash: string;
  attestationHash: string;
  metadata?: Record<string, any>;
  status: string;
}
```

---

## Demo Pages

All features have dedicated demo pages accessible via these routes:

- `/batch-verification` - Batch Verification Interface
- `/timeline-view` - Certificate History Timeline View
- `/comparison` - Certificate Comparison Tool
- Notification Center is accessible from the bell icon in the header on any page

---

## Styling

All components use:

- Tailwind CSS for styling
- Dark mode support via `dark:` variants
- Lucide React icons
- Responsive design (mobile, tablet, desktop)
- Consistent color scheme with the existing app

---

## Future Enhancements

### Batch Verification

- Integration with actual verification API
- Download verification results as PDF
- Email notification when batch completes
- Pause/resume batch processing

### Timeline View

- Advanced filtering (date range, multiple event types)
- Timeline export with custom branding
- Integration with blockchain explorer links
- Real-time updates via WebSocket

### Notification Center

- WebSocket integration for real-time notifications
- Notification sound effects
- Desktop notifications via Web Notifications API
- Notification templates
- Priority levels

### Comparison Tool

- Visual content comparison (image diff)
- Historical version comparison
- Blockchain data verification
- Advanced search filters
- Comparison history

---

## Testing

All components include mock data and demo functionality. To integrate with real data:

1. Replace mock search functions with actual API calls
2. Connect to Soroban contracts for certificate data
3. Implement WebSocket for real-time updates
4. Add backend endpoints for batch processing

---

## Dependencies

All features use existing dependencies from `package.json`:

- `react` and `react-dom`
- `lucide-react` for icons
- `tailwindcss` for styling
- No additional dependencies required
