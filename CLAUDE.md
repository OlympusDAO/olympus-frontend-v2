# Olympus Frontend v2 (Amsterdam)

Unified Olympus DAO frontend. Modules: Convertible Deposits (CDs), Cooler Loans, Staking, and more.

## Tech Stack

- **React 19** + **TypeScript 5.8** (strict mode)
- **Vite 7** with SWC
- **Tailwind CSS 4** (OKLCH design tokens, no tailwind.config — uses `@theme inline` in CSS)
- **wagmi 2** + **viem 2** + **RainbowKit 2** (web3)
- **TanStack React Query 5** (server state)
- **React Router 7** (hash-based routing via `createHashRouter`)
- **Radix UI** primitives for accessible components
- **CVA** (class-variance-authority) for component variants

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm tsc --noEmit # Type check (no emit)
```

Package manager: **pnpm 10** (do not use npm or yarn).

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable | Required | Description |
|---|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID for wallet connections |
| `VITE_CDS_GRAPHQL_ENDPOINT` | Yes (CDs) | Convertible Deposits indexer URL |
| `VITE_COOLER_METRICS_SUBGRAPH` | Yes (Cooler) | Cooler Loans subgraph URL |
| `VITE_GA_MEASUREMENT_ID` | No | Google Analytics 4 measurement ID |
| `VITE_TESTNET_MODE` | No | Set to `true` to enable testnet chains (Sepolia) |

## Project Structure

```
src/
├── abis/              # Smart contract ABIs
├── assets/            # Images, icons, fonts
├── components/        # Shared components + modals
│   └── ui/            # Reusable UI primitives (shadcn/ui pattern)
├── css/               # Design system tokens + theme
│   ├── variables.css  # OKLCH color variables (light/dark)
│   ├── theme.css      # @theme inline mappings for Tailwind
│   └── index.css      # Base layer styles
├── icons/             # SVG icon components
├── layouts/           # App shell (Header, Sidebar, Nav)
├── lib/
│   ├── hooks/         # Generic reusable hooks
│   ├── hooks/cds/     # CD-specific hooks (~48)
│   ├── utils/         # Helper functions
│   ├── contracts.ts   # Contract addresses + registry
│   ├── tokens.ts      # Token definitions
│   └── chains.ts      # Chain configs
├── modules/           # Feature modules
│   ├── cds/           # Convertible Deposits pages + components
│   ├── borrow/        # Borrow pages + components
│   └── statistics/    # Statistics pages + components
├── routes.tsx         # Route definitions
└── main.tsx           # Entry point
```

## Naming Conventions

- **Files**: kebab-case (`create-position-modal.tsx`, `use-mobile.ts`)
- **Component exports**: PascalCase (`export function CreatePositionModal`)
- **Hook files**: camelCase with `use` prefix (`useTokenBalance.tsx`) — exception to kebab-case rule
- **Utility functions**: camelCase (`formatTermSuffix()`)
- **Contract enums**: UPPER_SNAKE_CASE (`ContractName.CONVERTIBLE_DEPOSIT_FACILITY`)
- **CSS variables**: kebab-case (`--surface-bg-l1`)

## Component Patterns

UI components follow the shadcn/ui pattern:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("base-classes", {
  variants: { variant: { ... }, size: { ... } },
  defaultVariants: { variant: "default", size: "default" },
});

export function Button({ className, variant, size, ...props }) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

Key patterns:
- Use `cn()` (clsx + tailwind-merge) for class composition
- Use `data-slot` attribute on root elements
- Use Radix UI primitives for interactive components (Dialog, Dropdown, Tabs, etc.)
- Use named exports (avoid default exports)

## Styling

- Use Tailwind utility classes, not inline styles
- Design tokens are OKLCH-based CSS variables defined in `css/variables.css`
- Light/dark mode via `.dark` CSS class (stored in localStorage as `olympus-theme`)
- Color hierarchy: `primary-t`, `secondary-t`, `tertiary-t`, `disabled-t` for text
- Surface hierarchy: `surface-a3` through `surface-a20` for backgrounds
- Border hierarchy: `a3-b` through `a20-b`

## Imports

- Use absolute imports with `@/` alias (maps to `src/`)
- Use named exports/imports (no default exports)

```tsx
import { Button } from "@/components/ui/button";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import { useBid } from "@/lib/hooks/cds/useBid";
import { cn } from "@/lib/utils";
```

## Hooks Organization

- **`lib/hooks/`** — Generic hooks reusable across modules (tokens, approvals, toasts, mobile)
- **`lib/hooks/cds/`** — CD-specific hooks (auction, positions, redemptions, borrow, limit orders, receipt tokens)

## Routing

Hash-based routing for IPFS/dApp compatibility:
```tsx
createHashRouter([
  { path: "/", Component: AppLayout, children: [...] }
])
```
URLs look like `/#/cds/deposit`, `/#/cds/borrow`, etc.

## Contracts

All contract addresses live in `lib/contracts.ts`. Use `ContractName` enum + `getContractAddress()` to look up addresses. ABIs are in `src/abis/`.

## Git

- Main branch: `master`
- Branch naming: `prefix/feature-description` (e.g., `brightiron/port-cd-functionality`)
