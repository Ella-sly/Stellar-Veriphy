# #400 — Add Tests for React Hooks

**Labels:** testing, frontend · **Difficulty:** Intermediate · **Estimate:** 5-6h
**Depends on:** custom hooks existing (currently none do); [#401](./401-test-fixtures.md) fixtures help but aren't strictly required.

## Description

Write unit tests for custom React hooks using React Testing Library.

## Acceptance criteria (from issue)

- [ ] Test all custom hooks
- [ ] Test hook state changes
- [ ] Test hook side effects
- [ ] Test error handling
- [ ] 90%+ coverage
- [ ] Document hook testing approach

## Blocker

`frontend/app` currently contains only `layout.tsx`, `page.tsx`,
`api/health/route.ts`, and `creator/upload-content/page.tsx`. There is no
`hooks/` directory and no custom hook in the codebase yet (searched for
`use[A-Z]*` patterns — none found outside built-in React APIs). "Test all
custom hooks" is vacuous until hooks exist. Likely first candidates, based
on the product surface described in the README:

- a wallet-connection hook (`useWallet`) — feeds into #402's wallet flow
- an upload/manifest-submission hook for `creator/upload-content`
- a verification-status polling hook (`GET /api/verify/status/:jobId`)

If this issue is picked up before those hooks are written, scope it as
"stand up the hook-testing harness + write hooks as you go" rather than
"test existing hooks."

## Tooling to add (none currently installed)

```bash
pnpm --filter frontend add -D vitest @testing-library/react @testing-library/react-hooks-testing-library jsdom @testing-library/jest-dom
```

(Or Jest + `@testing-library/react`'s `renderHook` if the team prefers Jest
over Vitest — check with whoever owns #403, since Chromatic/Percy tooling
choice may influence the broader test-stack decision.)

Add to `frontend/package.json`:
```json
"scripts": { "test": "vitest run", "test:watch": "vitest", "coverage": "vitest run --coverage" }
```

## Suggested layout

```
frontend/
├── hooks/
│   ├── useWallet.ts
│   └── useWallet.test.ts       # colocated, or under __tests__/ — match whatever #402 settles on
└── vitest.config.ts            # jsdom environment, coverage.thresholds set to 90%
```

## Test approach per hook

- **State changes**: `renderHook` + `act(...)`, assert `result.current` at
  each transition (e.g. `idle → connecting → connected`).
- **Side effects**: mock the effect's dependency (fetch, wallet SDK) and
  assert it was called with expected args; assert cleanup runs on unmount.
- **Error handling**: force the mocked dependency to reject/throw, assert
  the hook surfaces an error state rather than throwing into the component
  tree.
- **Coverage**: set `coverage.thresholds` (lines/functions/branches/statements
  at 90) in the Vitest config so the 90%+ target is enforced by CI, not just
  eyeballed.

## Documentation deliverable

A short `frontend/hooks/README.md` (or a section in
[docs/testing/README.md](./README.md)) describing: test runner used, how to
mock browser/wallet APIs, and the coverage threshold + how to check it
locally (`pnpm --filter frontend coverage`).
