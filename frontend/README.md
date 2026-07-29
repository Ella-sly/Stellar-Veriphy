# Frontend

This is the Next.js frontend for StellarVeriphy, a decentralized platform for digital content verification and provenance on the Stellar blockchain.

## Prerequisites

- Node.js 18+
- pnpm (recommended package manager)

## Scripts

```bash
pnpm dev      # Start development server (localhost:3000)
pnpm build    # Build for production
pnpm start    # Start production server
pnpm lint     # Run ESLint
pnpm test     # Run Jest tests
pnpm test:watch  # Run tests in watch mode
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_MOCK_WALLET` | Set to `"true"` to enable mock wallet mode for development |
| `NEXT_PUBLIC_ORACLE_CONTRACT_ID` | Soroban contract ID for the Oracle contract |
| `NEXT_PUBLIC_PROVENANCE_CONTRACT_ID` | Soroban contract ID for the Provenance contract |
| `NEXT_PUBLIC_REGISTRY_CONTRACT_ID` | Soroban contract ID for the Registry contract |

Create a `.env.local` file based on `.env.example` (if available) or set these variables in your deployment environment.

## Pages and Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with landing sections (hero, about, how it works, ecosystem) |
| `/verify` | Content verification wizard with multiple steps |
| `/manifest` | Interactive manifest generator with live preview |
| `/builder` | Certificate builder page |
| `/stepper-demo` | Demo page for stepper component |
| `/skeleton-demo` | Demo page for skeleton loading component |
| `/creator/upload-content` | Content upload flow (creator mode) |
| `/creator/upload-content/media-input` | Media input step |
| `/creator/upload-content/manifest-step` | Manifest step in creator flow |
| `/creator/upload-content/review` | Review step before submission |
| `/report-issue` | Issue reporting page |
| `/api/health` | Health check API endpoint |

## Component Structure

### `components/`
- **ui/** - Reusable UI primitives (Modal, ScrollToTop, Skeleton, Stepper)
- **wallet/** - Wallet connection components (AccountDropdown, NetworkBadge, TransactionTracker, WrongNetworkWarning)
- **landing/** - Landing page sections (Header, HeroSection, AboutSection, HowItWorksSection, EcosystemSection, CallToActionSection)
- **manifest/** - Manifest-related components (ManifestPreview, ManifestModal, ManifestModalTrigger, KeyValueBuilder, FormatToggle)

### `features/verification/`
- **components/** - Verification wizard components
  - **steps/** - Individual wizard steps (ModeSelection, MediaInput, ManifestStep, AdvancedInput, SPVOptions, SPVResults)
  - WizardNavigation.tsx - Navigation controls
  - WizardPageShell.tsx - Page layout wrapper
  - WizardStepper.tsx - Progress stepper UI
- **store/** - Zustand store (wizard.store.ts)
- **hooks/** - Custom hooks (useWizardGuard.ts)
- **types/** - TypeScript types (wizard.types.ts)

### `context/`
- WizardContext.tsx - React context for wizard state
- WalletContext.tsx - Wallet connection context
- ThemeContext.tsx - Theme management
- ToastContext.tsx - Toast notification context

### `app/`
- Next.js App Router pages and layouts
- `/api/` - API route handlers