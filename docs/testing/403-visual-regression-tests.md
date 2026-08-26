# #403 — Create Visual Regression Tests

**Labels:** testing, frontend, UI · **Difficulty:** Intermediate · **Estimate:** 6-8h
**Depends on:** enough built UI (key components/pages, dark mode support) to make snapshots worth taking.

## Description

Set up visual regression testing for UI components.

## Acceptance criteria (from issue)

- [ ] Set up Percy or Chromatic
- [ ] Test key components
- [ ] Test key pages
- [ ] Different viewport sizes
- [ ] Dark mode variants
- [ ] Integrate with CI

## Current state

Buildable UI surface today is thin: `app/page.tsx` (landing) and
`app/creator/upload-content/page.tsx`. There is no `components/` directory
yet (the README's monorepo diagram shows one but it hasn't been created),
and no dark mode implementation — `app/layout.tsx` has no theme provider or
`dark:` class toggling, and Tailwind's `darkMode` strategy isn't configured
in `frontend` (no `tailwind.config.*` present; Tailwind is only listed as a
devDependency). "Dark mode variants" as a criterion is not satisfiable until
dark mode is implemented — flag that with whoever scopes the work rather
than skipping the checkbox silently.

## Percy vs. Chromatic

| | Chromatic | Percy |
|---|---|---|
| Pairs with | Storybook (would need to be added — not currently in the repo) | Playwright/Cypress/Cypress-component, no Storybook requirement |
| Setup cost here | Higher — install Storybook, write stories per component first | Lower — can snapshot existing Next.js pages directly via Playwright |
| CI | GitHub Action, straightforward | GitHub Action, straightforward |

Given there's no Storybook and no component library yet, **Percy +
Playwright** is the lower-friction starting point: snapshot the actual
rendered Next.js routes rather than requiring a story per component first.
Revisit Chromatic if/when a Storybook instance gets added for other reasons.

## Proposed setup

```bash
pnpm --filter frontend add -D @playwright/test @percy/cli @percy/playwright
```

```
frontend/
├── visual/
│   ├── landing.spec.ts          # app/page.tsx
│   ├── upload-content.spec.ts   # app/creator/upload-content/page.tsx
│   └── percy.config.yml         # viewport widths, snapshot options
```

Example spec shape:

```ts
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('landing page', async ({ page }) => {
  await page.goto('/');
  await percySnapshot(page, 'Landing – light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await percySnapshot(page, 'Landing – dark');
});
```

## Viewport sizes

Configure in `percy.config.yml` (or per-snapshot `widths` option) — at
minimum mobile (375px), tablet (768px), desktop (1280px), matching whatever
breakpoints Tailwind's default config uses once `tailwind.config.*` is
added.

## Dark mode

Blocked until a theme mechanism exists. When added, prefer a
`class`-strategy (`darkMode: 'class'` in `tailwind.config.*`) so Playwright
can toggle it deterministically (`page.emulateMedia` for `prefers-color-scheme`
won't work if the app doesn't respect the media query — only works with the
`media` strategy, not `class`). Pick one strategy and make sure the visual
tests match it.

## CI integration

No `.github/workflows/` exists in this repo yet — this issue includes
creating one, not just adding a step:

```
.github/workflows/visual-regression.yml
```

Trigger on PR, run `pnpm --filter frontend build && pnpm --filter frontend
exec percy exec -- playwright test visual/`, gate on `PERCY_TOKEN` secret.
Coordinate with repo admins on adding that secret before this can go green
in CI.
