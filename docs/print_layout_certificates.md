# Print Layout for Certificates

## Overview

Provide an optimized print layout for verification certificates that renders professionally when printed from the browser or saved as a PDF. The layout hides all application chrome (navigation, sidebars, buttons) and presents only the certificate content in a clean, branded format.

## Problem Statement

Printing a certificate page currently outputs the full application UI — navigation bars, sidebars, action buttons, and background colors — producing an unprofessional result. There is no dedicated print stylesheet, no QR code for offline verification, and no print preview mode that lets users inspect the output before sending to a printer or PDF export.

## Acceptance Criteria

| #   | Criterion                     | Description                                                                                                  |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Print CSS stylesheet          | A dedicated `print.css` (or `@media print` block) hides UI chrome and applies print-safe styles              |
| 2   | Hide navigation and UI chrome | Nav bars, sidebars, action buttons, toasts, and modals are hidden via `display: none` in print context       |
| 3   | High-res certificate badge    | The certificate logo/badge renders at sufficient resolution (vector SVG preferred, or `@2x` raster fallback) |
| 4   | QR code for verification      | A QR code encoding the public verification URL is printed on the certificate for offline scanning            |
| 5   | Print preview mode            | A "Print Preview" button in the UI shows a modal or dedicated route with the print-ready certificate view    |
| 6   | Page break handling           | Long certificates do not break mid-section; `page-break-inside: avoid` is applied to key blocks              |

## Print Stylesheet Specification

### Elements to Hide (`display: none` in print)

- Top navigation bar
- Sidebar / drawer navigation
- Action button groups (Edit, Share, Delete, etc.)
- Breadcrumb trail
- Footer links
- Toast notifications
- Modal overlays
- Pagination controls
- Search and filter bars

### Elements to Show / Style for Print

- Certificate container — full page width, no box-shadow, white background
- Issuer logo — positioned top-left, max-height 60px
- Certificate title — large, bold, centered
- Recipient name — prominent display font
- Issue date and expiry date
- Unique certificate ID
- Verification URL (printed as visible text below the QR code)
- QR code — bottom-right corner, minimum 80×80px at 96dpi
- Digital signature / seal graphic (if applicable)

### Typography for Print

- Use system-safe serif or sans-serif fonts; avoid web fonts that may not embed correctly.
- Minimum body font size: 11pt
- Heading font sizes: 18pt (title), 14pt (section headers)
- Line spacing: 1.4

### Color

- Print in black and white by default with `color-adjust: exact` (or `print-color-adjust: exact`) only for the badge/seal graphic to preserve branding.
- Avoid backgrounds with low contrast — strip decorative gradients for print.

## Page Layout

```
┌─────────────────────────────────────────────────┐
│  [Issuer Logo]               [Certificate Seal]  │
│                                                   │
│           CERTIFICATE OF VERIFICATION             │
│                                                   │
│  This certifies that                              │
│  [Recipient Name]                                 │
│  has successfully completed / verified            │
│  [Subject / Asset Name]                           │
│                                                   │
│  Issue Date: YYYY-MM-DD                           │
│  Expiry Date: YYYY-MM-DD  (if applicable)         │
│  Certificate ID: XXXXXXXX-XXXX-XXXX               │
│                                                   │
│  Verify at: https://app.example.com/verify/ID     │
│                                           [QR]    │
└─────────────────────────────────────────────────┘
```

## QR Code

- Encode the full public verification URL: `https://<domain>/verify/<certificate-id>`
- Minimum printed size: 80×80px (ensures scannability at standard print resolution)
- Include a short text label beneath the QR code: `"Scan to verify"`
- Generate client-side using a library (e.g., `qrcode`, `react-qr-code`) so no server round-trip is needed
- The QR code should be hidden in normal screen view and only visible in the print layout (or in print preview mode)

## Print Preview Mode

A "Print Preview" button on the certificate detail page:

1. Opens a dedicated `/certificates/:id/print-preview` route **or** a full-screen modal.
2. Renders the certificate using the same print stylesheet applied via a CSS class (e.g., `.print-preview`), so what the user sees matches the printed output exactly.
3. Provides a "Print / Save as PDF" button that calls `window.print()`.
4. Provides a "Close Preview" button to return to the normal view.

The print preview route/modal should be excluded from the main navigation and not indexed.

## Page Break Rules

Apply the following CSS to prevent awkward mid-content breaks:

```css
@media print {
  .certificate-header {
    page-break-inside: avoid;
  }
  .certificate-body {
    page-break-inside: avoid;
  }
  .certificate-footer {
    page-break-inside: avoid;
    page-break-before: avoid;
  }
  .signature-block {
    page-break-inside: avoid;
  }
  h1,
  h2,
  h3 {
    page-break-after: avoid;
  }
}
```

For very long certificates (e.g., multi-page audit reports), insert explicit `page-break-before: always` before each major section.

## Accessibility Considerations

- The QR code image must carry a descriptive `alt` attribute: `alt="QR code — scan to verify certificate [ID]"`.
- The verification URL must also be printed as visible text so the certificate is usable without a camera.
- Ensure sufficient contrast ratio (≥ 4.5:1) for all printed text against the white background.

## Implementation Notes

- Add `@media print { ... }` blocks to the certificate component's stylesheet, or create a global `print.css` imported only in the certificate page/layout.
- Use a CSS class toggle (`.is-print-preview`) to apply print styles in the browser for the preview modal without actually triggering the print dialog.
- SVG assets (logo, seal) should be inlined or served as SVG so they scale without pixelation.
- Test output in both Chrome (Save as PDF) and a physical printer profile to confirm layout consistency.

## Files Likely Affected

- `frontend/src/components/certificate/CertificateView.tsx` — main certificate display component
- `frontend/src/components/certificate/PrintPreview.tsx` — new print preview component/route
- `frontend/src/styles/print.css` — new print stylesheet
- `frontend/src/pages/certificates/[id]/print-preview.tsx` — new print preview page (if route-based)
- `frontend/src/components/qr/QRCode.tsx` — QR code component

## Related Issues

- Issue 1: Wizard Form Validation (certificate issuance wizard)
- Issue 3: Empty State Designs (empty state when certificate ID is not found)
