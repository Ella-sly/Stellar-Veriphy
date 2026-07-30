# STYLE GUIDE

This document defines code-style conventions used across **TypeScript/React** (frontend + shared packages) and **Rust** (Soroban contracts) in this repository.

## TypeScript / React

### 1) Naming conventions

#### Types and Components
- Use **PascalCase**.
- Apply to:
  - `interface` / `type` names
  - React component names
  - enums
  - classes (if any)

Examples:
- `ContentManifest`, `ProvenanceCert`
- `Header`, `ThemeProvider`, `Modal`

#### Functions and Variables
- Use **camelCase**.

Examples:
- `generateManifest`, `exportManifestAsJSON`
- `handleWalletClick`, `toggleTheme`, `navLinks`

#### Constants
- Use **UPPER_SNAKE_CASE** for file/module-level constants.

Example:
- `const STORAGE_KEY = "stellarproof-theme";`

#### Boolean variables
- Prefer a “question” form:
  - `isOpen`, `hasAnyField`, `approved`, `connected`

#### String/union literal types
- Use quoted string literals in union types.

Example:
- `export type VerificationMode = "standard" | "advanced";`

### 2) React component structure

Use the following consistent structure for React components.

#### Props typing
- Prefer an explicit `Props` interface (or `type`) for component props.

Example:
- `interface ModalProps { ... }`

#### Function component
- Place hooks at the top of the component body.
- Keep event handlers / helper functions close to the JSX they serve.

Preferred order:
1. hook declarations (`useState`, `useEffect`, `useRef`, etc.)
2. derived values (e.g., `navLinks`)
3. handlers (`handleXxx`)
4. return JSX

#### Exports
- Components in `frontend/components/**` are typically exported as **named exports**:
  - `export function Header() { ... }`
- Next.js route pages (`frontend/app/**/page.tsx`) commonly use **default exports**:
  - `export default function Home() { ... }`

Follow the existing convention for the file’s role:
- `app/*/page.tsx` / `route.ts` → default export where applicable
- `components/**` → named export

### 3) Import ordering

Use a stable grouping order to keep diffs small and reviewable.

Suggested order:
1. **Side-effect/absolute** imports from the app (aliases like `@/...`)
2. **External dependencies** (e.g., `react`, `next/*`, `lucide-react`)
3. **Relative imports** (`./` and `../`)

Also follow these rules:
- Keep one blank line between groups.
- Sort imports within a group consistently (alphabetical is acceptable).
- Prefer `import type { ... }` for type-only imports.

### 4) File naming conventions (TypeScript)

Based on current repo usage:
- UI components: use **PascalCase** filenames ending in `.tsx` when colocated under `components/**` (e.g., `Header.tsx`, `ThemeToggle.tsx`).
- Utility modules/services: use **camelCase** filenames ending in `.ts` (e.g., `manifestUseCases.ts`, `transactionService.ts`, `wallet.ts`).
- Context/store files generally follow the same camelCase `.ts/.tsx` pattern (e.g., `ThemeContext.tsx`, `wizard.store.ts`).

If a directory already uses a pattern (e.g., `components/` using PascalCase `.tsx`), follow that existing pattern.

## Rust (Soroban contracts)

### 1) Naming conventions

#### Types (structs/enums) and modules
- Use **PascalCase**.

Examples:
- `OracleContract`, `RequestState`

#### Functions and variables
- Use **snake_case**.

Examples:
- `submit_request`, `verify_attestation`
- `approved`, `provider_ok`

#### Constants
- Use **UPPER_SNAKE_CASE**.

Example:
- `const REQUEST_TTL_LEDGERS: u32 = 100;`

### 2) Doc comments

Use Rust doc comments so `cargo doc` remains useful.

- Use `///` for public items.
- Prefer 1–2 sentence summaries followed by details.
- Keep doc comments consistent with the rest of the contracts.

Example style:
- `/// Unique job identifier returned by the Oracle `submit_request` call.`

### 3) Import ordering

Within Rust modules:
- Keep the `use soroban_sdk::{ ... }` list grouped.
- Prefer a single `use` statement per crate/module where reasonable.
- Keep local `mod` declarations at the bottom of the file when they follow the implementation (e.g., `mod test;`).

### 4) File/module organization

- Put contract unit tests behind `mod test;` and locate the implementation in `src/test.rs` (or the existing contract pattern).
- Keep the contract entrypoint module in `src/lib.rs`.

## General conventions

- Keep formatting aligned with the tooling used in the repo:
  - TypeScript: ESLint (and existing Next.js config)
  - Rust: `cargo fmt`
- Prefer explicit naming over clever abbreviations.
- Prefer immutable/derived values where possible; use `let` only where reassignment is needed.

