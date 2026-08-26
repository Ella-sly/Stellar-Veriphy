# Skeleton Loading States Guide

## Overview

This guide documents the skeleton loading system implemented across the StellarVeriphy application. Skeleton screens provide content-aware loading placeholders that match the dimensions and structure of actual content, improving perceived performance and user experience.

## Benefits of Skeleton Screens

1. **Better Perceived Performance**: Users see immediate feedback instead of blank screens
2. **Reduced Cognitive Load**: Familiar shapes help users anticipate content
3. **Professional Appearance**: More polished than generic spinners
4. **Accessibility**: Screen readers announce loading states properly
5. **Progressive Loading**: Shows structure before content arrives

## Available Skeleton Components

### Base Skeleton

Location: `/frontend/components/ui/Skeleton.tsx`

The foundation component for all skeleton elements.

```tsx
import { Skeleton } from "@/components/ui/Skeleton";

<Skeleton className="h-4 w-32" />
<Skeleton className="h-10 w-full" rounded="lg" />
<Skeleton className="w-12 h-12" rounded="full" animate={false} />
```

**Props:**

- `className`: Tailwind classes for size and spacing
- `animate`: Enable/disable pulse animation (default: true)
- `rounded`: Border radius: "none" | "sm" | "md" | "lg" | "full" (default: "md")

### Certificate Card Skeleton

Matches the layout of certificate verification cards.

```tsx
import { CertificateCardSkeleton } from "@/components/ui/Skeleton";

<CertificateCardSkeleton />;
```

**Use Cases:**

- Certificate lookup loading
- Certificate verification in progress
- Certificate detail pages

### Transaction List Skeleton

Mimics transaction table rows with proper column structure.

```tsx
import { TransactionListSkeleton } from "@/components/ui/Skeleton";

<TransactionListSkeleton count={10} />;
```

**Props:**

- `count`: Number of skeleton rows (default: 5)

**Use Cases:**

- Transaction history loading
- Transaction search results
- Blockchain transaction lists

### Dashboard Widget Skeleton

Statistics card placeholder with icon and value layout.

```tsx
import { DashboardWidgetSkeleton } from "@/components/ui/Skeleton";

<DashboardWidgetSkeleton />;
```

**Use Cases:**

- Dashboard statistics
- Analytics widgets
- Summary cards

### Stats Cards Skeleton

Multiple dashboard widgets in a grid layout.

```tsx
import { StatsCardsSkeleton } from "@/components/ui/Skeleton";

<StatsCardsSkeleton count={3} />;
```

**Props:**

- `count`: Number of stat cards (default: 3)

### Table Skeleton

Full table with headers and rows.

```tsx
import { TableSkeleton } from "@/components/ui/Skeleton";

<TableSkeleton rows={8} cols={5} />;
```

**Props:**

- `rows`: Number of data rows (default: 5)
- `cols`: Number of columns (default: 4)

### Card Grid Skeleton

Grid of card-style content placeholders.

```tsx
import { CardGridSkeleton } from "@/components/ui/Skeleton";

<CardGridSkeleton count={6} />;
```

**Props:**

- `count`: Number of cards (default: 6)

### List Item Skeleton

Single list item with avatar and text.

```tsx
import { ListItemSkeleton } from "@/components/ui/Skeleton";

<ListItemSkeleton />;
```

### Form Skeleton

Form fields with labels and inputs.

```tsx
import { FormSkeleton } from "@/components/ui/Skeleton";

<FormSkeleton />;
```

### Page Header Skeleton

Page title and description placeholder.

```tsx
import { PageHeaderSkeleton } from "@/components/ui/Skeleton";

<PageHeaderSkeleton />;
```

### Text Line Skeleton

Single line of text placeholder.

```tsx
import { TextLineSkeleton } from "@/components/ui/Skeleton";

<TextLineSkeleton width="full" />
<TextLineSkeleton width={200} />
```

**Props:**

- `width`: String (Tailwind width class) or number (pixels)

## Implementation Examples

### Transaction History Page

```tsx
export default function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);

  return (
    <div>
      {/* Stats with skeleton */}
      {!stats ? (
        <StatsCardsSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-3 gap-4">{/* Stats content */}</div>
      )}

      {/* Transactions with skeleton */}
      {loading ? <TransactionListSkeleton count={10} /> : <table>{/* Transaction rows */}</table>}
    </div>
  );
}
```

### Certificate Verification

```tsx
export function CertificatePanel() {
  const [lookupState, setLookupState] = useState({ status: "idle" });

  return (
    <div>
      {lookupState.status === "loading" && <CertificateCardSkeleton />}

      {lookupState.status === "loaded" && (
        <CertificateResultCard certificate={lookupState.result} />
      )}
    </div>
  );
}
```

### Custom Skeleton Layout

```tsx
function CustomSkeleton() {
  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-16 h-16" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Skeleton className="h-10 flex-1" rounded="lg" />
        <Skeleton className="h-10 w-10" rounded="lg" />
      </div>
    </div>
  );
}
```

## Accessibility Features

### ARIA Attributes

All skeleton components include proper ARIA attributes:

```tsx
<div role="status" aria-live="polite" aria-busy="true" aria-label="Loading content">
  <span className="sr-only">Loading...</span>
</div>
```

### Screen Reader Announcements

Use the `useLoadingAnnouncement` hook for dynamic announcements:

```tsx
import { useLoadingAnnouncement } from "@/components/ui/LiveRegion";

function MyComponent() {
  const [loading, setLoading] = useState(true);
  const announcement = useLoadingAnnouncement(
    loading,
    "Loading transactions",
    "Transactions loaded"
  );

  return (
    <>
      <LiveRegion message={announcement} />
      {loading ? <TransactionListSkeleton /> : <TransactionTable />}
    </>
  );
}
```

### Reduced Motion Support

Skeleton animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-pulse {
    animation: none !important;
  }
}
```

## Styling Guidelines

### Match Content Dimensions

Skeleton elements should match the size of actual content:

```tsx
// ❌ Wrong - doesn't match content
<Skeleton className="h-4 w-20" />
<h1 className="text-2xl font-bold">{title}</h1>

// ✅ Correct - matches heading size
<Skeleton className="h-8 w-64" />
<h1 className="text-2xl font-bold">{title}</h1>
```

### Use Consistent Spacing

Maintain the same gaps and padding:

```tsx
<div className="space-y-4">
  {loading ? (
    <>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </>
  ) : (
    <>
      <p>{line1}</p>
      <p>{line2}</p>
      <p>{line3}</p>
    </>
  )}
</div>
```

### Preserve Layout Structure

Keep the same container structure:

```tsx
{
  loading ? (
    <div className="grid grid-cols-3 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  ) : (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.id} {...card} />
      ))}
    </div>
  );
}
```

## Animation

### Pulse Animation

Default pulse animation defined in Tailwind:

```css
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### Custom Animation Speed

Adjust animation speed with Tailwind config:

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
};
```

### Disable Animation

```tsx
<Skeleton animate={false} className="h-4 w-32" />
```

## Dark Mode Support

All skeleton components automatically adapt to dark mode:

```tsx
// Light mode: bg-gray-200
// Dark mode: bg-gray-800
<Skeleton className="h-4 w-32" />
```

Custom dark mode colors:

```tsx
<div className="bg-gray-100 dark:bg-gray-900">
  <Skeleton className="h-4 w-32 bg-gray-300 dark:bg-gray-700" />
</div>
```

## Performance Considerations

### Use Appropriate Count

Don't render too many skeleton elements:

```tsx
// ❌ Too many - may cause performance issues
<TransactionListSkeleton count={1000} />

// ✅ Reasonable amount matching viewport
<TransactionListSkeleton count={10} />
```

### Lazy Load Skeletons

For off-screen content, use intersection observer:

```tsx
function LazyList() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
      }
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{visible && <ListSkeleton count={20} />}</div>;
}
```

## Best Practices

### 1. Show Skeletons Immediately

Don't delay skeleton display:

```tsx
// ❌ Wrong - shows blank then skeleton
useEffect(() => {
  setTimeout(() => setLoading(true), 500);
}, []);

// ✅ Correct - immediate feedback
const [loading, setLoading] = useState(true);
```

### 2. Match Visual Hierarchy

Skeleton should reflect content importance:

```tsx
<div>
  <Skeleton className="h-8 w-2/3 mb-2" /> {/* Title */}
  <Skeleton className="h-4 w-1/2 mb-6" /> {/* Subtitle */}
  <Skeleton className="h-4 w-full" /> {/* Body */}
</div>
```

### 3. Use Semantic HTML

Even for skeletons:

```tsx
<article className="skeleton-card">
  <header>
    <Skeleton className="h-6 w-32" />
  </header>
  <main>
    <Skeleton className="h-24 w-full" />
  </main>
  <footer>
    <Skeleton className="h-10 w-20" />
  </footer>
</article>
```

### 4. Progressive Enhancement

Show skeletons for initial load only:

```tsx
const [isInitialLoad, setIsInitialLoad] = useState(true);

useEffect(() => {
  fetchData().then(() => {
    setIsInitialLoad(false);
  });
}, []);

// Subsequent loads can use different indicators
{
  loading ? isInitialLoad ? <Skeleton /> : <SpinnerOverlay /> : <Content />;
}
```

### 5. Consistent Timing

Don't show skeleton for very short loads:

```tsx
const [showSkeleton, setShowSkeleton] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    setShowSkeleton(true);
  }, 200); // Only show if loading > 200ms

  return () => clearTimeout(timer);
}, []);

{
  loading && showSkeleton && <Skeleton />;
}
```

## Testing

### Visual Regression Tests

Test that skeletons match content layout:

```typescript
test('skeleton matches content dimensions', () => {
  const { container } = render(<CardSkeleton />);
  const skeleton = container.querySelector('.skeleton-card');

  const { container: contentContainer } = render(<Card {...mockData} />);
  const content = contentContainer.querySelector('.card');

  expect(skeleton.offsetHeight).toBeCloseTo(content.offsetHeight, 10);
});
```

### Accessibility Tests

Ensure proper ARIA attributes:

```typescript
test('skeleton has accessibility attributes', () => {
  render(<Skeleton />);

  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  expect(screen.getByText(/loading/i)).toHaveClass('sr-only');
});
```

## Migration from Spinners

### Before (Spinner)

```tsx
{
  loading && (
    <div className="flex justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
}
```

### After (Skeleton)

```tsx
{
  loading && <CertificateCardSkeleton />;
}
```

## Browser Support

Skeleton loading states work in all modern browsers:

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

## Related Documentation

- [Tailwind CSS Animation](https://tailwindcss.com/docs/animation)
- [ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)
- [Perceived Performance](https://web.dev/rail/)
