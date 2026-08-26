# Empty State Designs

## Overview

Design and implement thoughtful empty state screens for every view that can render without data — no certificates, no verifications, no search results, no filtered results. Each empty state provides contextual guidance, a clear call-to-action, and optional onboarding hints to help users take their next step.

## Problem Statement

Currently, views that have no data render as blank or near-blank pages with no guidance. Users landing on an empty dashboard, receiving no search results, or applying a filter that matches nothing are left without context about why the screen is empty or what to do next. This creates confusion and increases abandonment.

## Acceptance Criteria

| #   | Criterion                    | Description                                                                                     |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Custom illustrations         | Each distinct empty state has a unique or contextually appropriate illustration (SVG preferred) |
| 2   | Contextual messages          | Heading and body copy are specific to the empty state context, not generic ("No data found")    |
| 3   | Clear call-to-action buttons | A primary CTA guides the user toward the most logical next action                               |
| 4   | Onboarding guidance          | First-time empty states include a brief tip or checklist explaining how to get started          |
| 5   | Search result empty states   | A dedicated empty state for zero-result searches, with the query echoed back and suggestions    |
| 6   | Filter result empty states   | A dedicated empty state when active filters produce no results, with a "Clear filters" action   |

## Empty State Inventory

The following views require empty state handling:

| View                           | Trigger Condition               | Primary CTA                             |
| ------------------------------ | ------------------------------- | --------------------------------------- |
| Dashboard — certificates list  | User has no certificates        | "Issue your first certificate"          |
| Dashboard — verifications list | No verifications recorded       | "Verify a certificate"                  |
| Certificate search             | Search query returns 0 results  | "Clear search" / "Try a different term" |
| Certificate list with filters  | Active filters return 0 results | "Clear filters"                         |
| Provider registry              | No providers registered         | "Register a provider"                   |
| Attestation history            | No attestations on record       | "Submit an attestation"                 |
| Notifications / activity feed  | No activity yet                 | (informational only, no CTA)            |
| Admin — pending requests       | No pending requests             | (informational only)                    |

## Component Structure

Each empty state is rendered by a shared `<EmptyState>` component that accepts props to customise content per context:

```
<EmptyState
  illustration="certificates"       // key selecting the SVG asset
  heading="No certificates yet"
  body="Issue your first certificate to get started."
  primaryAction={{ label: "Issue Certificate", href: "/certificates/new" }}
  secondaryAction={{ label: "Learn more", href: "/docs/certificates" }}  // optional
  onboardingTip="Certificates are issued after a successful attestation."  // optional
/>
```

### Props Reference

| Prop              | Type                         | Required | Description                                               |
| ----------------- | ---------------------------- | -------- | --------------------------------------------------------- |
| `illustration`    | `string` (asset key)         | Yes      | Selects the SVG illustration to display                   |
| `heading`         | `string`                     | Yes      | Bold heading, 1 short sentence                            |
| `body`            | `string`                     | Yes      | Supporting copy, 1–2 sentences max                        |
| `primaryAction`   | `{ label, href \| onClick }` | Yes      | The main CTA button                                       |
| `secondaryAction` | `{ label, href \| onClick }` | No       | Optional secondary link or button                         |
| `onboardingTip`   | `string`                     | No       | Shown as a subtle tip below the CTA for first-time states |
| `className`       | `string`                     | No       | Additional CSS class for layout overrides                 |

## Illustration Guidelines

- **Format:** SVG, inlined or referenced as an `<img>` with meaningful `alt` text.
- **Size:** Rendered at a maximum of 240×240px on desktop, 160×160px on mobile.
- **Style:** Match the application's visual language — use the same color palette, line weights, and border radii.
- **Tone:** Illustrations should be neutral to friendly. Avoid illustrations that imply user error (e.g., broken robots) for routine empty states like "no results yet".
- **Alt text:** Descriptive but brief. E.g., `alt="Empty certificate list illustration"`.

### Illustration Asset Keys

| Key                 | Description                           |
| ------------------- | ------------------------------------- |
| `certificates`      | Stack of blank certificate documents  |
| `verifications`     | Magnifying glass over a document      |
| `search-no-results` | Magnifying glass with a question mark |
| `filter-no-results` | Funnel with an X                      |
| `providers`         | Network nodes / connector graphic     |
| `attestations`      | Stamp or seal graphic                 |
| `activity`          | Bell or timeline graphic              |
| `pending`           | Hourglass or inbox graphic            |

## Copy Guidelines

### Heading

- State what is absent, not what went wrong.
- 4–8 words. Title case.
- Examples:
  - ✅ "No Certificates Yet"
  - ✅ "No Results for "blockchain audit""
  - ❌ "Nothing to show here"
  - ❌ "Error: No data"

### Body

- Explain why the state exists and what will change it.
- 1–2 sentences, plain language.
- Examples:
  - "Certificates you issue will appear here. Start by issuing your first one."
  - "No certificates match your search. Try different keywords or browse all certificates."
  - "Your active filters returned no results. Adjust or clear them to see more."

### CTA Label

- Use action verbs. Be specific.
- ✅ "Issue Certificate", "Clear Filters", "Register Provider"
- ❌ "Click here", "Go", "Submit"

## Search Empty State — Special Behaviour

When a search query returns zero results:

1. Echo the search term back in the heading: `No results for "[query]"`
2. Offer suggestions:
   - Check spelling
   - Try broader or fewer keywords
   - Browse all items (link)
3. Show the "Clear search" button prominently.
4. Do **not** show the onboarding tip in this state — the user already knows how the feature works.

## Filter Empty State — Special Behaviour

When active filters return zero results:

1. Heading: `"No [items] match your filters"`
2. List the active filters so the user can see what is restricting results (read-only chips).
3. Provide a single "Clear all filters" CTA that resets all filters at once.
4. Optionally provide individual "×" controls on each filter chip to remove one at a time.

## Onboarding Guidance

For first-time users (determined by a `hasCompletedOnboarding` flag in user state or local storage):

- Display an additional `onboardingTip` panel beneath the CTA.
- The tip is dismissible; dismissal persists in local storage so it does not reappear.
- Tips should be 1 sentence pointing to one key concept, not a full tutorial.
- Example: `"Tip: Certificates are linked to on-chain attestations. Learn how attestations work →"`

## Accessibility Considerations

- The empty state region should carry `role="status"` or `aria-live="polite"` when it replaces a dynamically loaded list so screen readers announce the transition.
- Illustrations must have non-empty `alt` attributes — never `alt=""` for decorative-only treatment here, since the illustration communicates context.
- CTA buttons must have descriptive labels; avoid "Click here" which is meaningless out of context.
- Maintain a minimum contrast ratio of 4.5:1 for all body and heading text.

## Layout

```
┌─────────────────────────────────┐
│                                 │
│        [Illustration SVG]       │
│                                 │
│      No Certificates Yet        │  ← heading (bold, ~20px)
│                                 │
│  Certificates you issue will    │  ← body copy (~14px, muted color)
│  appear here. Start by issuing  │
│  your first one.                │
│                                 │
│    [ Issue Certificate ]        │  ← primary CTA button
│    Learn more ↗                 │  ← optional secondary link
│                                 │
│  💡 Tip: Certificates are...    │  ← onboarding tip (dismissible)
│                                 │
└─────────────────────────────────┘
```

- Centred horizontally and vertically within the content area.
- Illustration sits above the heading with 24px gap.
- 16px gap between heading and body.
- 24px gap between body and CTA.
- Max width of the empty state block: 400px.

## Implementation Notes

- Create a single reusable `EmptyState` component at `frontend/src/components/common/EmptyState.tsx`.
- Store SVG illustrations in `frontend/src/assets/illustrations/`.
- Determine first-time state from a user context value or `localStorage.getItem('onboardingDismissed')`.
- Wrap list/table components so they render `<EmptyState>` when the data array is empty rather than rendering nothing or a skeleton.

## Files Likely Affected

- `frontend/src/components/common/EmptyState.tsx` — new shared component
- `frontend/src/assets/illustrations/` — SVG illustration assets
- `frontend/src/pages/dashboard/` — certificate and verification list views
- `frontend/src/components/certificate/CertificateList.tsx` — wraps list with empty state
- `frontend/src/components/search/SearchResults.tsx` — search empty state
- `frontend/src/components/filters/FilteredList.tsx` — filter empty state

## Related Issues

- Issue 1: Wizard Form Validation (new certificate flow triggered from empty state CTA)
- Issue 4: Micro-interactions (entrance animation when empty state appears)
