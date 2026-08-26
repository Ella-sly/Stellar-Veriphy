# Accessibility Testing Plan (WCAG 2.1 AA)

Tracks issue #243. Defines how Stellar Veriphy's frontend (`frontend/`) will be
tested for WCAG 2.1 Level AA compliance.

## 1) axe-core Integration

- Add `@axe-core/react` for dev-mode console warnings during local development.
- Add `jest-axe` for component-level assertions in the existing Jest "components"
  project (`frontend/jest.config.js`), colocated with component tests under
  `src/components/**/__tests__/`.
- Add `@axe-core/playwright` for full-page scans inside the existing Playwright
  suite (`frontend/e2e/`), so violations are checked against fully-rendered
  pages (manifest wizard, certificate search, verification pipeline views).
- Fail the check on any `critical` or `serious` violation; `moderate`/`minor`
  are logged but non-blocking until triaged.

## 2) Screen Reader Testing

- Manual pass required before release on:
  - macOS VoiceOver + Safari
  - NVDA + Chrome (Windows)
- Focus areas: manifest creation wizard (`frontend/app/manifest/`), certificate
  search/filter flow, and any modal/dialog component.
- Record findings in a checklist per release (page, reader, pass/fail, notes).

## 3) Keyboard Navigation Testing

- Every interactive element (buttons, form fields, dropdowns, modals) must be
  reachable and operable via Tab/Shift+Tab/Enter/Space/Escape/Arrow keys, with
  no keyboard traps.
- Add Playwright E2E specs under `frontend/e2e/` that drive core flows using
  keyboard-only input (no mouse/click events) for:
  - Manifest wizard step navigation
  - Certificate search and filter form
  - Any modal open/close/dismiss interaction

## 4) Color Contrast Validation

- Minimum contrast ratios: 4.5:1 for normal text, 3:1 for large text and UI
  components, per WCAG 2.1 AA.
- Covered automatically by the axe-core scans above (`color-contrast` rule).
- Any custom Tailwind color token added to `frontend/tailwind.config.ts` must be
  checked against the app's light/dark backgrounds before use.

## 5) Focus Management Testing

- Modals/dialogs must trap focus while open and return focus to the triggering
  element on close.
- Route changes and async content updates must move focus to the new primary
  heading or content region so screen reader users aren't left on stale focus.
- Verified via the keyboard-navigation Playwright specs above plus targeted
  `jest-axe`/RTL assertions on focus-trap components.

## 6) Automated a11y Checks in CI

Add to `.github/workflows/ci.yml`:

- Extend `frontend-unit-tests` to run `jest-axe` assertions as part of the
  existing `npx jest --coverage` step (no new job needed).
- Extend the `e2e-tests` job (or add a dedicated `a11y-scan` job) to run
  `@axe-core/playwright` scans against the built app across the same
  chromium/firefox/webkit matrix, uploading violation reports as build
  artifacts on failure (mirroring the existing Playwright report upload step).

## Suggested Tooling

| Purpose                         | Tool                              |
| ------------------------------- | --------------------------------- |
| Component-level a11y assertions | `jest-axe`                        |
| Full-page a11y scans (E2E)      | `@axe-core/playwright`            |
| Dev-time console warnings       | `@axe-core/react`                 |
| Manual screen reader testing    | VoiceOver (macOS), NVDA (Windows) |
