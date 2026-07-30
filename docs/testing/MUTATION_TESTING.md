# Mutation Testing

Mutation testing checks the *test suite itself*: [Stryker](https://stryker-mutator.io)
introduces small, automated bugs ("mutants") into the source — flipping a
comparison, deleting a string literal, changing an arithmetic operator — and
reruns the tests against each mutant. A mutant that still passes ("survived")
means the suite wouldn't have caught that class of bug; a mutant that fails a
test ("killed") means the suite is doing its job.

## Scope

Mutation testing currently covers `packages/shared` — the pure, dependency-free
logic (`utils/hash.ts`, `factories/index.ts`) that the rest of the monorepo
builds on. It is not yet wired up for the frontend or the Rust contracts:

- The frontend test suite runs on Jest, not Vitest; extending Stryker there
  would use `@stryker-mutator/jest-runner` instead of the vitest-runner used
  here, as a separate config (frontend code and test conventions are owned by
  a different set of contributors than this change).
- Rust mutation testing would use a separate tool ([`cargo-mutants`](https://mutants.rs/))
  and is tracked as follow-up work, not part of this setup.

## Running it

```bash
pnpm --filter @stellarveriphy/shared run test:mutation
# or, from anywhere in the repo:
pnpm run test:mutation
```

This runs `stryker run` using `packages/shared/stryker.conf.json`:

- **Test runner:** `@stryker-mutator/vitest-runner`, reusing the existing
  Vitest suite in `packages/shared/tests/`.
- **Type checker:** `@stryker-mutator/typescript-checker`, which discards
  mutants that don't type-check before wasting a test run on them (these show
  up as `# errors` in the report, not `# survived`).
- **Mutated files:** `utils/**/*.ts` and `factories/**/*.ts`.
- **Report:** an HTML report is written to `packages/shared/reports/mutation/mutation.html`
  (gitignored — regenerate locally or download the `mutation-report` artifact
  from the CI run).

## Current baseline

As of this setup, a full run reports:

| Scope                       | Mutation score |
|------------------------------|---------------:|
| `utils/hash.ts`               | 100%           |
| `factories/index.ts`          | 40%            |
| **Overall (`packages/shared`)** | **~42%**     |

(Re-run `pnpm run test:mutation` for the exact current number — it moves
slightly as factories are added or adjusted; 40–42% has been stable across
the factory additions made in this change.)

`hash.ts` is fully covered because it's pure and small. The surviving mutants
in `factories/index.ts` are mostly in the randomized fields the factories
intentionally don't pin down (e.g. exact random `storageRef`/`attestationHash`
strings, or which literal in a `faker.helpers.arrayElement([...])` list gets
picked) — the tests assert shape/format, not exact random output, so a mutant
that changes an unused literal in that list can survive.

## Path to the 80%+ target

The acceptance criterion for this work is an 80%+ mutation score. To get there
from the current baseline:

1. Assert exact **format** (regex) on every generated field, not just "is a
   string" — this kills empty-string and prefix/suffix mutants (already done
   for `contentHash`/`attestationHash`; extend the same pattern to
   `storageRef` and `id`).
2. Pin down **derived arithmetic** with a fixed input and an exact expected
   output (e.g. `provenanceCertFactory`'s `timestamp = floor(ms / 1000)`) —
   this kills `ArithmeticOperator` mutants that flip `/` to `*` or similar.
3. Test **option lists** (`DEVICE_OPTIONS`, `AI_MODEL_OPTIONS`) directly by
   asserting their exact contents, in addition to asserting a generated value
   is a member of the list — this kills `StringLiteral` mutants on unused
   entries.
4. Once the score clears 80%, raise `thresholds.break` in
   `packages/shared/stryker.conf.json` from `null` to `80` so CI's
   `mutation-testing` job actually fails the build on a regression, and drop
   `continue-on-error` if it was added to that job in the meantime.
5. As mutation coverage extends to the frontend and contracts, add a
   `stryker.conf.json` (or `cargo-mutants` config) scoped to those, following
   the same pattern.

Until (4) is done, the CI mutation-testing job runs on every push and
uploads its report as a build artifact, but does not fail the pipeline — it's
observability, not a gate, so the pipeline stays green while the suite is
brought up to the target score incrementally.
