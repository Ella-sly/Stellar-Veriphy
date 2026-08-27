# Features Implementation Guide

This document provides implementation details for the newly added UI features.

## 1. Page Transitions

Smooth transitions between pages and routes with support for `prefers-reduced-motion`.

### Components

#### PageTransition
Wraps page content to provide fade, slide, or scale transitions.

```tsx
import { PageTransition } from "@/components/ui/PageTransition";

export default function Page() {
  return (
    <PageTransition type="fade">
      <div>Your page content</div>
    </PageTransition>
  );
}
```

**Props:**
- `type?: "fade" | "slide" | "scale"` - Transition type (default: "fade")
- `className?: string` - Additional CSS classes
- `children: ReactNode` - Page content

#### LoadingTransition
Handles loading states with smooth transitions.

```tsx
import { LoadingTransition } from "@/components/ui/LoadingTransition";

export function MyComponent() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <LoadingTransition isLoading={isLoading}>
      <div>Loaded content</div>
    </LoadingTransition>
  );
}
```

**Props:**
- `isLoading: boolean` - Loading state
- `loadingComponent?: ReactNode` - Custom loading component
- `className?: string` - Additional CSS classes
- `children: ReactNode` - Content to show when loaded

#### WizardTransition
Provides slide transitions for multi-step wizards.

```tsx
import { WizardTransition } from "@/components/ui/WizardTransition";

export function Wizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  return (
    <WizardTransition currentStep={currentStep} direction={direction}>
      <StepContent step={currentStep} />
    </WizardTransition>
  );
}
```

**Props:**
- `currentStep: number` - Current step index
- `direction?: "forward" | "backward"` - Animation direction
- `className?: string` - Additional CSS classes
- `children: ReactNode` - Current step content

### Features

- ✅ Fade transitions
- ✅ Slide transitions for wizards
- ✅ Loading state transitions
- ✅ Respects `prefers-reduced-motion`
- ✅ No layout shift (uses absolute positioning in AnimatePresence)
- ✅ Performant (uses `will-change` CSS property conditionally)

---

## 2. Chart Components

Reusable chart components for analytics dashboards built with Recharts.

### Installation

The `recharts` library has been added to package.json. Run:

```bash
pnpm install
```

### Components

#### LineChart

```tsx
import { LineChart } from "@/components/charts";

const data = [
  { name: "Jan", value: 400, value2: 240 },
  { name: "Feb", value: 300, value2: 139 },
  { name: "Mar", value: 200, value2: 980 },
];

export function Analytics() {
  return (
    <LineChart
      data={data}
      lines={[
        { dataKey: "value", stroke: "#3b82f6", name: "Sales" },
        { dataKey: "value2", stroke: "#8b5cf6", name: "Revenue" },
      ]}
      height={400}
      showGrid
      showLegend
    />
  );
}
```

**Props:**
- `data: DataPoint[]` - Chart data
- `lines: Array<{ dataKey, stroke, name? }>` - Line configurations
- `xAxisKey?: string` - X-axis data key (default: "name")
- `height?: number` - Chart height (default: 300)
- `className?: string` - Additional CSS classes
- `showGrid?: boolean` - Show grid lines (default: true)
- `showLegend?: boolean` - Show legend (default: true)

#### BarChart

```tsx
import { BarChart } from "@/components/charts";

const data = [
  { name: "Page A", uv: 4000, pv: 2400 },
  { name: "Page B", uv: 3000, pv: 1398 },
];

export function Analytics() {
  return (
    <BarChart
      data={data}
      bars={[
        { dataKey: "uv", fill: "#3b82f6", name: "Unique Visitors" },
        { dataKey: "pv", fill: "#8b5cf6", name: "Page Views" },
      ]}
      stacked
    />
  );
}
```

**Props:**
- `data: DataPoint[]` - Chart data
- `bars: Array<{ dataKey, fill, name? }>` - Bar configurations
- `xAxisKey?: string` - X-axis data key
- `height?: number` - Chart height
- `className?: string` - Additional CSS classes
- `showGrid?: boolean` - Show grid lines
- `showLegend?: boolean` - Show legend
- `stacked?: boolean` - Stack bars (default: false)

#### PieChart

```tsx
import { PieChart } from "@/components/charts";

const data = [
  { name: "Group A", value: 400 },
  { name: "Group B", value: 300 },
  { name: "Group C", value: 300 },
];

export function Analytics() {
  return (
    <PieChart
      data={data}
      colors={["#3b82f6", "#8b5cf6", "#ec4899"]}
      innerRadius={60} // Makes it a donut chart
    />
  );
}
```

**Props:**
- `data: DataPoint[]` - Chart data with `name` and `value`
- `colors?: string[]` - Custom color palette
- `height?: number` - Chart height
- `className?: string` - Additional CSS classes
- `showLegend?: boolean` - Show legend
- `innerRadius?: number` - Inner radius (0 for full pie, >0 for donut)
- `outerRadius?: number` - Outer radius

### Features

- ✅ Line chart component
- ✅ Bar chart component
- ✅ Pie chart component
- ✅ Uses Recharts library
- ✅ Responsive design (uses ResponsiveContainer)
- ✅ Accessible (adds ARIA labels and accessibility layer)
- ✅ Respects `prefers-reduced-motion`
- ✅ Dark mode support
- ✅ Custom tooltips with proper styling

---

## 3. Empty State Illustrations

Custom SVG illustrations for empty states with light/dark variants.

### Components

#### Available Illustrations

```tsx
import {
  EmptyCertificates,
  NoSearchResults,
  ErrorState,
} from "@/components/illustrations";

// Usage
<EmptyCertificates className="w-48 h-48 text-gray-400 dark:text-gray-600" />
```

**Available illustrations:**
- `EmptyCertificates` - Stack of certificate documents
- `NoSearchResults` - Magnifying glass with question mark
- `ErrorState` - Alert triangle with exclamation

#### EmptyState Component

Complete empty state component with illustrations, actions, and onboarding tips.

```tsx
import { EmptyState } from "@/components/ui/EmptyState";

export function CertificateList() {
  const certificates = [];

  if (certificates.length === 0) {
    return (
      <EmptyState
        illustration="certificates"
        heading="No Certificates Yet"
        body="Certificates you issue will appear here. Start by issuing your first one."
        primaryAction={{
          label: "Issue Certificate",
          href: "/certificates/new",
        }}
        secondaryAction={{
          label: "Learn more",
          href: "/docs/certificates",
        }}
        onboardingTip="Certificates are issued after a successful attestation."
      />
    );
  }

  return <div>{/* Certificate list */}</div>;
}
```

**Props:**
- `illustration: "certificates" | "search-no-results" | "error"` - Illustration type
- `heading: string` - Bold heading text
- `body: string` - Supporting text
- `primaryAction: { label, href?, onClick? }` - Main CTA
- `secondaryAction?: { label, href?, onClick? }` - Optional secondary action
- `onboardingTip?: string` - Dismissible tip (persists in localStorage)
- `className?: string` - Additional CSS classes

### Features

- ✅ No certificates illustration
- ✅ No search results illustration
- ✅ Error state illustration
- ✅ SVG format (inline, scalable)
- ✅ Consistent style (uses currentColor for theming)
- ✅ Light/dark variants (via Tailwind color classes)
- ✅ Accessible (proper ARIA labels)
- ✅ Onboarding tips with localStorage persistence

---

## 4. Mobile Navigation

Redesigned mobile navigation with smooth slide-out drawer.

### Component

#### MobileNav

```tsx
import { MobileNav } from "@/components/MobileNav";

export function Header() {
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/verify", label: "Verify" },
    { href: "/builder", label: "Builder" },
  ];

  const quickActions = [
    { href: "/verify", label: "Verify", icon: "🔍" },
    { href: "/builder", label: "Build", icon: "🔨" },
  ];

  return (
    <header>
      <MobileNav links={navLinks} quickActions={quickActions} />
    </header>
  );
}
```

**Props:**
- `links: Array<{ href, label, icon? }>` - Navigation links
- `quickActions?: Array<{ href, label, icon? }>` - Quick access actions

### Features

- ✅ Hamburger menu button
- ✅ Smooth slide-out drawer (using Framer Motion)
- ✅ Touch-friendly targets (min 44px)
- ✅ Quick access to key features
- ✅ Close on outside click
- ✅ Keyboard accessible (Tab navigation, Escape to close)
- ✅ Body scroll lock when open
- ✅ Respects `prefers-reduced-motion`
- ✅ Active link highlighting
- ✅ Backdrop overlay
- ✅ Integration with wallet, theme toggle, and notifications

---

## Accessibility Features

All components include:

- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- `prefers-reduced-motion` support
- Touch-friendly targets (44px minimum)
- Screen reader announcements
- Semantic HTML

## Dark Mode Support

All components support dark mode via Tailwind's `dark:` variants and use CSS custom properties for colors.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Graceful degradation for older browsers

## Performance Considerations

- Components use `will-change` CSS property conditionally
- Animations are disabled when `prefers-reduced-motion` is set
- Lazy loading for illustrations (inline SVG)
- Optimized re-renders with proper React hooks

## Next Steps

1. Install dependencies: `pnpm install`
2. Import and use components in your pages
3. Customize colors and styles via Tailwind classes
4. Add more illustration types as needed
5. Integrate with your data fetching logic for charts

## Testing

Recommended tests to add:

- Unit tests for component rendering
- Integration tests for user interactions
- Accessibility tests (axe-core)
- Visual regression tests
- Performance tests for animations

## Resources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Recharts Documentation](https://recharts.org/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
