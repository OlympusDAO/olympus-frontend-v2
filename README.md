# Olympus Frontend v2

Unified frontend for [Olympus DAO](https://www.olympusdao.finance/) — Convertible Deposits, Cooler Loans, Staking, and more.

## Setup

```bash
pnpm install
cp .env.example .env   # Fill in required values
pnpm codegen           # Generate API client from OpenAPI spec (required)
pnpm dev
```

Requires Node.js 20+ and pnpm.

> **Important:** Run `pnpm codegen` after initial install and whenever the API spec changes. It generates `src/generated/olympusUnits.ts` — typed React Query hooks for the Olympus Units API. The app will not compile without this file.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | [WalletConnect Cloud](https://cloud.walletconnect.com) project ID |
| `VITE_THEGRAPH_API_KEY` | Yes | [The Graph](https://thegraph.com/studio) Gateway API key for subgraph queries |
| `VITE_OLYMPUS_UNITS_API_ENDPOINT` | Yes | Olympus Units API base URL (runtime requests) |
| `VITE_GA_MEASUREMENT_ID` | No | Google Analytics 4 measurement ID |
| `VITE_TESTNET_MODE` | No | Set to `true` to enable testnet chains (Sepolia) |
| `OLYMPUS_API_URL` | No | OpenAPI spec URL for codegen — defaults to the dev endpoint |

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
│   ├── olympus-logo.tsx  #   SVG omega logo
│   └── more-menu.tsx     #   "..." dropdown (theme toggle, links, socials)
├── layouts/
│   ├── AppLayout.tsx     #   Root layout shell (3-column desktop, responsive)
│   ├── IconSidebar.tsx   #   Floating pill sidebar (section icons)
│   ├── SubNav.tsx        #   Contextual sub-navigation panel
│   ├── Header.tsx        #   Top bar (page title, wallet button)
│   └── MobileNav.tsx     #   Hamburger drawer (combined nav)
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
