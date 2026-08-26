# Micro-interactions and Animations

## Overview

Add subtle, purposeful animations and micro-interactions across the application to improve perceived responsiveness, reinforce user actions, and create a polished feel. All animations must respect the user's `prefers-reduced-motion` system preference.

## Problem Statement

The current UI responds to user actions statically — buttons depress without feedback, cards appear instantly, loading states are absent or unstyled, and success/error outcomes have no motion cues. This makes the interface feel flat and unresponsive, reducing the user's confidence that their actions are being processed correctly.

## Acceptance Criteria

| #   | Criterion                        | Description                                                                    |
| --- | -------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Button hover effects             | Buttons respond visually on hover with a subtle color shift and/or lift effect |
| 2   | Card entrance animations         | Cards and list items fade or slide in when first rendered                      |
| 3   | Loading spinners                 | Consistent spinner component used across all async operations                  |
| 4   | Success checkmark animations     | A brief animated checkmark confirms successful actions                         |
| 5   | Error shake animations           | Invalid form submissions or blocked actions trigger a horizontal shake         |
| 6   | Smooth page transitions          | Route changes fade or slide between views instead of cutting abruptly          |
| 7   | Respect `prefers-reduced-motion` | All animations are disabled or reduced when the OS setting is active           |

---

## Animation Catalogue

### 1. Button Hover Effect

**Trigger:** Mouse enters a button element  
**Duration:** 150ms  
**Easing:** `ease-out`

- Background color transitions to a slightly lighter/darker tint (no hard color jump).
- Subtle upward translate: `translateY(-1px)` with a soft box-shadow increase to simulate lift.
- On mouse leave, reverse the transition at the same duration.

```css
.btn {
  transition:
    background-color 150ms ease-out,
    transform 150ms ease-out,
    box-shadow 150ms ease-out;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.btn:active {
  transform: translateY(0);
  box-shadow: none;
}
```

---

### 2. Card Entrance Animation

**Trigger:** Component mounts / list item enters the DOM  
**Duration:** 300ms  
**Easing:** `ease-out`  
**Stagger:** 50ms delay per item when multiple cards load simultaneously

Cards fade in from slight opacity (0 → 1) and a small vertical offset (translateY 12px → 0).

```css
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: card-enter 300ms ease-out both;
}

/* stagger via CSS custom property or JS inline style */
.card:nth-child(n) {
  animation-delay: calc(var(--card-index, 0) * 50ms);
}
```

For React, use `animation-delay` set as an inline style with the item's index:

```tsx
<Card style={{ "--card-index": index } as React.CSSProperties} />
```

---

### 3. Loading Spinner

**Trigger:** Any async operation begins (data fetch, form submit, file upload)  
**Duration:** Continuous 800ms rotation loop  
**Size variants:** `sm` (16px), `md` (24px), `lg` (40px)

A single `<Spinner>` component covers all use cases:

```
<Spinner size="md" label="Loading certificates..." />
```

- Rendered as an SVG circle with a partial stroke (`stroke-dasharray`) and a rotating animation.
- The `label` prop is rendered as a visually-hidden `<span>` for screen readers (`aria-label` on the SVG).
- For full-page loading, a centered overlay uses `size="lg"`.
- For inline button loading states, replace button text with `size="sm"` and disable the button.

```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 800ms linear infinite;
}
```

---

### 4. Success Checkmark Animation

**Trigger:** A form submits successfully, a verification passes, or a certificate is issued  
**Duration:** 600ms total (draw: 400ms + fade-out: 200ms delay then 200ms)  
**Display:** Replaces the submit button or appears as a brief overlay on the action that succeeded

Two-phase animation:

1. **Draw phase (0–400ms):** An SVG checkmark path is drawn using `stroke-dashoffset` animation from full offset to 0, giving the appearance of being drawn in real time.
2. **Hold phase (400–600ms):** The checkmark holds at full opacity.
3. **Fade or transition:** The UI transitions to the success state (e.g., redirects, shows a success banner).

```css
@keyframes draw-check {
  from {
    stroke-dashoffset: 50;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.checkmark-path {
  stroke-dasharray: 50;
  stroke-dashoffset: 50;
  animation: draw-check 400ms ease-out forwards;
}
```

For toast/snackbar confirmations, the checkmark appears inside the toast icon slot with the same draw animation before the toast auto-dismisses.

---

### 5. Error Shake Animation

**Trigger:** Form submission blocked due to validation errors; "Next" button in wizard when current step has errors  
**Duration:** 400ms  
**Applied to:** The button that was clicked, or the first invalid field group

A rapid horizontal oscillation that communicates "no" without being alarming:

```css
@keyframes shake {
  0% {
    transform: translateX(0);
  }
  15% {
    transform: translateX(-6px);
  }
  30% {
    transform: translateX(6px);
  }
  45% {
    transform: translateX(-4px);
  }
  60% {
    transform: translateX(4px);
  }
  75% {
    transform: translateX(-2px);
  }
  90% {
    transform: translateX(2px);
  }
  100% {
    transform: translateX(0);
  }
}

.shake {
  animation: shake 400ms ease-in-out;
}
```

The `shake` class is added programmatically and removed via an `animationend` event listener to allow the animation to re-trigger on repeated submit attempts.

---

### 6. Page Transitions

**Trigger:** React Router route change  
**Duration:** 200ms fade  
**Easing:** `ease-in-out`

Implement a simple cross-fade between routes using a wrapper component that listens to route changes:

- Outgoing page fades from opacity 1 → 0 over 100ms.
- Incoming page fades from opacity 0 → 1 over 200ms, beginning after the outgoing fade completes.
- Use a CSS class toggle on the route wrapper, or a library such as `framer-motion` `<AnimatePresence>` / React Transition Group.

For slide transitions (e.g., wizard step navigation):

- Advancing to the next step: current step slides left (translateX 0 → -20px, opacity 1 → 0), next step slides in from right (translateX 20px → 0, opacity 0 → 1).
- Going back: reverse direction.
- Duration: 250ms, `ease-in-out`.

---

## `prefers-reduced-motion` Handling

All animations must be suppressed when the user's OS has reduced motion enabled.

### Global CSS rule (apply in the base stylesheet):

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### In JavaScript / React:

```ts
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```

Use this boolean to:

- Skip stagger delays on card lists.
- Skip the draw animation on the checkmark (show it fully drawn immediately).
- Replace page slide transitions with an instant swap.

---

## Animation Tokens

Define animation values as CSS custom properties for consistency:

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 600ms;
  --easing-default: ease-out;
  --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --easing-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

All animation durations and easing values in component stylesheets should reference these tokens rather than hard-coded values.

---

## Accessibility Considerations

- Never use animation as the sole means of communicating a state change — always pair with a text label, icon, or `aria-live` region.
- Loading spinners must include a visually-hidden text label read by screen readers.
- The success checkmark must be accompanied by an `aria-live="polite"` region announcing the outcome (e.g., "Certificate issued successfully.").
- The error shake must be accompanied by visible inline error messages and an `aria-live="assertive"` region — the shake alone is not sufficient for assistive technology users.
- Avoid flashing content at rates between 3–50 Hz, which can trigger photosensitive seizures.

---

## Performance Guidelines

- Prefer animating only `transform` and `opacity` — these are GPU-composited and do not trigger layout reflow.
- Avoid animating `width`, `height`, `top`, `left`, `margin`, or `padding` in hot paths.
- Use `will-change: transform` sparingly and only on elements that are actively animating; remove it after the animation completes.
- Keep total animation payload small — do not load a full animation library for effects achievable in CSS.

---

## Implementation Notes

- Create an `animations.css` (or `animations.ts` for CSS-in-JS) file with all `@keyframes` definitions and utility classes.
- Export a `useReducedMotion()` hook that wraps the `matchMedia` check with a React context so components can conditionally apply motion.
- The `<Spinner>` component should live at `frontend/src/components/common/Spinner.tsx`.
- The `<SuccessCheckmark>` component should live at `frontend/src/components/common/SuccessCheckmark.tsx`.
- Apply the `shake` class utility via a `useShake()` hook that manages adding and auto-removing the class.

## Files Likely Affected

- `frontend/src/styles/animations.css` — new keyframe definitions and animation utility classes
- `frontend/src/styles/tokens.css` — animation token custom properties
- `frontend/src/components/common/Spinner.tsx` — new loading spinner component
- `frontend/src/components/common/SuccessCheckmark.tsx` — new animated checkmark component
- `frontend/src/hooks/useReducedMotion.ts` — new hook
- `frontend/src/hooks/useShake.ts` — new hook for shake animation
- `frontend/src/components/layout/PageTransition.tsx` — route transition wrapper
- `frontend/src/components/ui/Button.tsx` — hover/active styles updated

## Related Issues

- Issue 1: Wizard Form Validation (shake on blocked navigation, checkmark on step complete)
- Issue 3: Empty State Designs (card entrance animation when empty state mounts)
