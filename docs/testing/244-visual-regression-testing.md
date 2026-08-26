# #244 — Add Visual Regression Testing

**Labels:** testing, frontend, UI · **Priority:** Medium

## Current state

More is already in place than the issue title suggests:

- `frontend/playwright.config.ts` already declares `snapshotDir:
"./e2e/snapshots"` and runs 5 projects — `chromium`, `firefox`, `webkit`,
  `mobile-chrome` (Pixel 5), `mobile-safari` (iPhone 13) — so
  cross-viewport coverage is already wired at the config level.
- Five `expect(page).toHaveScreenshot(...)` calls already exist, embedded
  inside feature specs (`wallet-connection.spec.ts`,
  `file-upload-verification.spec.ts`, `certificate-viewing.spec.ts`,
  `search-and-filtering.spec.ts`).
- Three purpose-built demo routes already exist and are close to ideal
  component-snapshot targets: `app/skeleton-demo`, `app/stepper-demo`,
  `app/features-showcase`.
- No Chromatic, Percy, or Storybook in the repo today.

So the gap isn't "set up visual regression from scratch" — it's
consolidating the ad-hoc screenshots into a real suite, and closing the
component-coverage and review-workflow gaps.

## Proposed approach

### Engine: Playwright's built-in `toHaveScreenshot`, not Chromatic/Percy

Both are paid SaaS requiring an account/org signup — out of scope to set up
unilaterally. Playwright's native comparison is already the tool in use
(see above), needs no new account, and satisfies every acceptance criterion
except the specific vendor name. Note this as a deliberate substitution;
revisit if the team later wants Chromatic's cross-browser cloud rendering
or its hosted approve/reject UI specifically.

### 1. Dedicated visual-regression suite

New `frontend/e2e/visual-regression.spec.ts` consolidating page-level
screenshot coverage (landing page, verify flow, certificate detail, batch
verification, comparison view) instead of leaving it scattered inside
feature specs — keeps "does this look right" separate from "does this
function right" so a visual diff doesn't fail a functional test and vice
versa.

### 2. Component snapshot tests

Point new specs at the existing demo routes plus any component that has
meaningful visual states not covered by a full-page flow: `app/skeleton-demo`
(loading states), `app/stepper-demo` (wizard steps), `app/features-showcase`.
For anything not already exposed via a demo route, add one — cheaper than
introducing Storybook for a first pass, and keeps the app itself as the
single rendering source of truth.

### 3. Cross-viewport

Already covered by the 5 existing Playwright projects; the new spec just
needs to run under all of them (default — no project-specific filtering
needed unless a component is desktop-only).

### 4. Approve/reject workflow

Snapshots are committed PNGs, which git can diff visually in a PR file view
but not summarize. Two additions:

- `npx playwright test --update-snapshots` documented in
  `frontend/README.md` as the accept step for an intentional visual change.
- CI: on failure, upload the Playwright HTML report (already configured —
  `playwright-report/`) as a build artifact so a reviewer can open the
  actual/expected/diff triptych without re-running locally.

### 5. PR review integration

Add a step to the `E2E Tests` job in `.github/workflows/ci.yml` that
uploads `playwright-report/` via `actions/upload-artifact` on failure, and
link it from a PR comment (`actions/github-script`, minimal — just posts
the artifact URL) so a failing visual check is one click from "see the
diff," not "re-run the suite locally."

## Acceptance criteria mapping

| Criterion                      | Delivered by                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Chromatic or Percy integration | Substituted with Playwright native (see rationale above) — flag if the team wants the paid alternative instead |
| Screenshot comparison          | `toHaveScreenshot`, consolidated into `visual-regression.spec.ts`                                              |
| Component snapshot tests       | Demo routes (`skeleton-demo`, `stepper-demo`, `features-showcase`) + new ones as needed                        |
| Test across viewports          | Existing 5 Playwright projects (desktop × 3, mobile × 2)                                                       |
| Approve/reject workflow        | `--update-snapshots` + documented process                                                                      |
| Integration with PR reviews    | CI artifact upload + PR comment link on failure                                                                |

## Rollout

1. Consolidate existing scattered screenshots into
   `e2e/visual-regression.spec.ts`; keep the feature-spec ones only if they
   assert something spec-specific (e.g. "connected" wallet state).
2. Add component-level specs against the 3 demo routes.
3. CI artifact upload + PR comment wiring.
4. Document the accept workflow in `frontend/README.md`.
