# Code Examples Repository Plan

Addresses issue #398 (planning/spec doc — see [scope note](#scope-note)). Defines the structure and content plan for a `examples/` directory of common-use-case code samples.

## Scope note

This document specifies what the examples repository should contain and how it should be organized; it does not itself add the runnable example code. Building out 10+ fully functional, tested examples across JS/Python/Rust is tracked separately against issue #398's acceptance criteria below.

## Acceptance Criteria (from #398)

- At least 10 examples
- Multiple languages (JS, Python, Rust)
- README per example
- Fully functional code
- Include comments
- Test all examples

## 1. Proposed Directory Layout

```
examples/
├── README.md                         # index of all examples, language matrix
├── js/
│   ├── build-manifest-hash/
│   │   ├── README.md
│   │   ├── index.js
│   │   └── package.json
│   ├── submit-verification-request/
│   ├── check-verification-status/
│   └── decode-provenance-cert-event/
├── python/
│   ├── verify-content-hash/
│   ├── generate-manifest/
│   └── query-provenance-cert/
└── rust/
    ├── invoke-oracle-submit/
    ├── invoke-registry-is-approved/
    └── parse-soroban-event/
```

Each leaf directory is a self-contained, runnable example with its own README and dependency manifest (`package.json` / `requirements.txt` / `Cargo.toml`), so a user can `cd` into one example and run it without touching the rest of the repo.

## 2. Candidate Examples (10, covering all three languages)

| # | Language | Example | Demonstrates |
|---|---|---|---|
| 1 | JS | `build-manifest-hash` | Constructing a `ContentManifest` and computing `manifestHash` with [`buildManifestHash`](../packages/shared/utils/hash.ts) |
| 2 | JS | `submit-verification-request` | Calling `OracleContract.submit` via the Soroban JS SDK |
| 3 | JS | `check-verification-status` | Polling `GET /api/verify/status/:jobId` |
| 4 | JS | `decode-provenance-cert-event` | Parsing the `minted` event emitted by `ProvenanceContract` |
| 5 | Python | `verify-content-hash` | Recomputing and comparing `sha256(file)` against a manifest's `contentHash` |
| 6 | Python | `generate-manifest` | Building and validating a manifest against [the JSON Schema](manifest-schema.md) |
| 7 | Python | `query-provenance-cert` | Reading a `ProvenanceCert` from Soroban RPC by ID |
| 8 | Rust | `invoke-oracle-submit` | Calling `OracleContract::submit` from a native Rust client via `soroban-client` |
| 9 | Rust | `invoke-registry-is-approved` | Checking TEE code-hash approval via `RegistryContract::is_approved` |
| 10 | Rust | `parse-soroban-event` | Deserializing contract events emitted by `contracts/provenance` |

## 3. Per-Example README Template

Every example README should follow the same shape so the index page can predictably link into it:

```markdown
# <Example Name>

**Language:** JS / Python / Rust
**Demonstrates:** one-sentence description

## Prerequisites
- Runtime/toolchain version
- Any environment variables (e.g. contract IDs, network)

## Run
\`\`\`bash
<exact command(s) to run this example>
\`\`\`

## Expected Output
\`\`\`
<sample output>
\`\`\`

## Notes
Anything non-obvious about the approach.
```

## 4. Code Standards for Examples

- **Fully functional**: every example must run as committed against a live testnet (or a documented local mock), not pseudocode. No `// TODO: implement` placeholders.
- **Commented**: comment the *why* of each non-obvious step (e.g. why a particular RPC call ordering matters), not a line-by-line narration of syntax.
- **Minimal dependencies**: prefer the official Stellar/Soroban SDKs for each language over third-party wrappers, to keep examples close to what a first-time integrator would actually reach for.
- **Self-contained config**: each example reads network/contract config from its own `.env.example` (JS/Python) or documented constants (Rust) — never hardcode secrets, and never depend on config living in a sibling example.

## 5. Testing Plan for Examples

Each example needs an automated smoke test confirming it still runs against the toolchain versions pinned in its manifest:

- **JS examples**: a `pnpm test` script per example (or a shared root script that iterates `examples/js/*`) running the example against a local Soroban sandbox/testnet and asserting on stdout or a return value.
- **Python examples**: `pytest` per example, same pattern, run via `python -m pytest`.
- **Rust examples**: `cargo test` (or `cargo run` wrapped in a shell assertion) per example crate.
- Wire a CI job (e.g. `examples-ci`) that runs all three language suites on a schedule (examples rot quietly when SDKs change) and on any PR touching `examples/`.

## 6. Index (`examples/README.md`) Contents

The top-level examples README should contain:

- A language/use-case matrix (rows = examples, columns = language, linking to each directory).
- A "quickstart" pointing to the single easiest example to run first (recommend `js/build-manifest-hash` — no network calls required).
- A link back to [`docs/manifest-schema.md`](manifest-schema.md) and [`docs/deployment-guide.md`](deployment-guide.md) for the concepts the examples build on.
