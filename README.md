# Olympus Frontend v2

Unified frontend for [Olympus DAO](https://www.olympusdao.finance/) — Convertible Deposits, Cooler Loans, Staking, and more.

## Setup

```bash
pnpm install
cp .env.example .env   # Fill in required values
pnpm codegen           # Generate API client from OpenAPI spec (required)
pnpm dev
```

Lockfile installs are frozen by default. If you intentionally need to re-generate `pnpm-lock.yaml`, run:

```bash
pnpm install --no-frozen-lockfile
```

Requires Node.js 24+ and pnpm.

> **Important:** Run `pnpm codegen` after initial install and whenever the API spec changes. It generates `src/generated/olympusUnits.ts` — typed React Query hooks for the Olympus Units API. The app will not compile without this file.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | [WalletConnect Cloud](https://cloud.walletconnect.com) project ID |
| `VITE_THEGRAPH_API_KEY` | Yes | [The Graph](https://thegraph.com/studio) Gateway API key for subgraph queries |
| `VITE_OLYMPUS_UNITS_API_ENDPOINT` | Yes | Olympus Units API base URL (runtime requests) |
| `VITE_OLYMPUS_SAFE_API_KEY` | Yes | Safe Transaction Service API key for submitting multisig transactions |
| `VITE_GA_MEASUREMENT_ID` | No | Google Analytics 4 measurement ID |
| `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` | No | PostHog project token for product analytics |
| `VITE_PUBLIC_POSTHOG_HOST` | No | PostHog host URL (defaults to `https://us.i.posthog.com`) |
| `VITE_PUBLIC_POSTHOG_INGEST_HOST` | No | PostHog ingest host URL; defaults to `VITE_PUBLIC_POSTHOG_HOST` locally, or `/panoptes` behind the Vercel rewrite |
| `VITE_TESTNET_MODE` | No | Set to `true` to enable testnet chains (Sepolia) |
| `VITE_TREASURY_SUBGRAPH_METRICS_API` | No | Treasury subgraph metrics API override; omitted values use the treasury client default |
| `VITE_MIGRATION_CLAIMS_BASE_URL` | No | OHM v1 migration claims/proof API base URL override; omitted values use the production API |
| `VITE_MIGRATION_MERKLE_ROOT_OVERRIDE` | No | OHM v1 migration merkle root override, used before the policy contract has a root set on-chain |
| `OLYMPUS_API_URL` | No | OpenAPI spec URL for codegen — defaults to the dev endpoint |

> **Why are the `VITE_*` keys public?**
> Vite inlines any `VITE_`-prefixed variable into the client bundle at build time, so these values ship to every visitor's browser and are inherently public — they are project identifiers, not secrets. Each provider enforces access at the edge via allowlisted domains or origins configured in their dashboard, not via key secrecy:
>
> - **WalletConnect Project ID** — restricted to approved domains in [WalletConnect Cloud](https://cloud.walletconnect.com).
> - **The Graph API key** — restricted to approved domains in [The Graph Studio](https://thegraph.com/studio).
> - **Safe API key** — origin-restricted by the Safe Transaction Service.
> - **PostHog project API key** — write-only, project-scoped, and domain-restricted in the PostHog project settings.
> - **Google Analytics Measurement ID** — public by design (GA4 measurement IDs are not credentials).
>
> Never place a true secret (server-side API key, signing key, private key) behind a `VITE_` prefix.

## Stack

- **React 19** + **TypeScript 5.8** — UI and type safety
- **Vite 7** with SWC — build tooling
- **Tailwind CSS 4** — styling via `@tailwindcss/vite` plugin (no config file, uses `@theme inline`)
- **wagmi 2** + **viem 2** + **RainbowKit 2** — web3 wallet and contract interactions
- **TanStack React Query 5** — server state management
- **React Router 7** — hash-based routing (`createHashRouter`) for dApp/IPFS compatibility
- **Orval** — OpenAPI → React Query codegen (`pnpm codegen`)
- **CVA** (class-variance-authority) — component variant management

## Architecture

```
src/
├── abis/                 # Smart contract ABIs
├── api/                  # HTTP client (customHttpClient — auth + fetch wrapper)
├── assets/               # Images, icons, fonts
├── css/                  # Design system
│   ├── variables.css     #   OKLCH color tokens (light + dark mode)
│   ├── theme.css         #   Tailwind @theme inline mapping
│   └── index.css         #   Entry point (imports, base styles)
├── generated/            # Auto-generated — do not edit manually
│   └── olympusUnits.ts   #   Typed hooks from Olympus Units OpenAPI spec
├── lib/
│   ├── contracts.ts      #   Contract address registry
│   ├── tokens.ts         #   Token definitions
│   ├── chains.ts         #   Chain configs
│   ├── utils.ts          #   cn() utility (clsx + tailwind-merge)
│   ├── navigation.ts     #   Navigation data model & helpers
│   ├── hooks/            #   Generic reusable hooks
│   └── hooks/cds/        #   CD-specific hooks (~48)
├── components/
│   ├── ui/               #   Reusable primitives (Button, Sheet, DropdownMenu)
│   ├── theme-provider.tsx#   Dark/light/system theme context
│   └── olympus-logo.tsx  #   SVG omega logo
├── layouts/
│   ├── AppLayout.tsx     #   Root layout shell (3-column desktop, responsive)
│   ├── IconSidebar.tsx   #   Floating pill sidebar (section icons)
│   ├── SubNav.tsx        #   Contextual sub-navigation panel (multisig-gated items)
│   ├── Header.tsx        #   Top bar (page title, wallet button)
│   ├── MobileNav.tsx     #   Hamburger drawer (combined nav)
│   └── footer.tsx        #   Sticky footer (Next Beat, token prices, gas, theme toggle)
├── modules/
│   ├── cds/              #   Convertible Deposits pages + components
│   ├── borrow/           #   Borrow pages + components
│   ├── engage/           #   Engage (Units rewards) pages + components
│   └── statistics/       #   Statistics pages + components
├── routes.tsx            #   Hash router definition
└── main.tsx              #   Entry point
```

### Layout

The app uses a 3-column layout on desktop:

1. **Icon Sidebar** — Floating pill-shaped bar with section icons. Uses a golden gradient for the active section.
2. **Sub-Nav** — Contextual links for the active section (220px).
3. **Main Content** — Header + routed page content.

On mobile, the two sidebars collapse into a hamburger drawer.

### Design System

Color tokens are defined in OKLCH color space in `variables.css`, with light and dark mode variants. These are mapped to Tailwind via `@theme inline` in `theme.css`. The surface hierarchy uses three levels:

- `bg-surface-bg-l1` — base background (slate)
- `bg-surface-bg-l2` — elevated surfaces
- `bg-surface-a3` — subtle overlay (pill sidebar)

Typography uses the **Neue Haas Grotesk Display Pro** font family.

### Navigation

Navigation structure is defined declaratively in `lib/navigation.ts`. Each section has an icon, label, route prefix, and sub-items. Helper functions derive active state from the current URL path. Adding a new section or page is a data change — no layout code needs to change.

### API Codegen

The Olympus Units API client is generated via [Orval](https://orval.dev) from the OpenAPI spec:

```bash
pnpm codegen   # regenerate src/generated/olympusUnits.ts
```

Config lives in `orval.config.ts`. The spec URL is controlled by the `OLYMPUS_API_URL` env var (defaults to the dev endpoint). The generated file is committed to the repo so the app builds without network access, but should be regenerated when the API spec changes.

## Contributing

See [CLAUDE.md](./CLAUDE.md) for coding conventions and architectural guidelines.

## Security Hardening

- **Package manager enforcement:** pnpm is required via `packageManager` and package-manager engines.
- **Frozen lockfile by default:** installs fail if `pnpm-lock.yaml` is out of sync, which keeps CI and local installs deterministic.
- **CI coverage:** `.github/workflows/ci.yml` runs `lint:check`, build, and tests (when a `test` script is present).
- **Dependency audit:** `.github/workflows/audit.yml` runs `pnpm audit --audit-level moderate` on pull requests.
- **Snyk verification:** run `snyk test --all-projects` locally to validate open-source dependency risk posture.
