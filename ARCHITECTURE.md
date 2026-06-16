# HHDMS — Architecture Overview

> Monorepo managed by **Turborepo** (`turbo.json`) with **npm workspaces**.
> Node ≥18, TypeScript 5.9, package manager: npm.

## Folder Tree

```
hhdms/
├── apps/
│   ├── api/                  # NestJS backend (CommonJS / nodenext)
│   └── web/                  # Next.js frontend (App Router)
├── packages/
│   ├── eslint-config/        # Shared ESLint presets (base, next, react-internal)
│   ├── typescript-config/    # Shared tsconfig bases (base, nextjs, react-library)
│   └── ui/                   # Shared React UI primitives (Button, Card, Code)
├── turbo.json                # Turborepo pipeline (build, lint, check-types, dev)
├── package.json              # Root workspace config + scripts
└── README.md
```

## Packages & Apps

| Workspace | Purpose & Stack |
|-----------|----------------|
| `apps/web` | Next.js (App Router) web frontend — React 19, client-side rendering, static assets in `public/`. |
| `apps/api` | NestJS REST API server — CommonJS/nodenext module system, Jest for e2e testing, modular controllers/services. |
| `packages/ui` | Shared UI component library — React components (`Button`, `Card`, `Code`) consumed by `web`. |
| `packages/eslint-config` | Shareable ESLint configurations — `base.js` (generic), `next.js` (Next.js rules), `react-internal.js` (React library rules). |
| `packages/typescript-config` | Shareable `tsconfig.json` bases — `base.json`, `nextjs.json`, `react-library.json`. |

## Data Flow

```
[Browser] —— HTTP/REST ——> [ apps/api (NestJS) ]
     │                          │
     │  Next.js SSR/CSR         │  Controllers → Services
     │  (App Router)            │  (Modular, CommonJS)
     ▼                          ▼
[ apps/web (Next.js) ]     [ JSON responses ]
     │
     ├── packages/ui    (shared React components)
     ├── packages/eslint-config
     └── packages/typescript-config
```

- **`web`** sends HTTP requests to **`api`** endpoints — typical REST JSON contract.
- **`api`** processes requests through NestJS controllers/services and returns JSON.
- No direct coupling: both apps share only tooling/config packages (`eslint-config`, `typescript-config`). The `ui` package is consumed exclusively by `web`.
- Turborepo orchestrates builds: `build`, `lint`, `check-types`, and `dev` tasks cascade via `dependsOn` (e.g., `^build` ensures dependencies build first).

## Key Conventions

- **Module system:** `api` uses CommonJS (`"module": "nodenext"`), `web` & `ui` use ESM/Next.js defaults.
- **Task orchestration:** `turbo run <task>` — parallel execution with topological dependency ordering.
- **TypeScript:** Single version (5.9.2) enforced at root; shared configs inherited via `extends` in each workspace.
- **Linting:** Unified via `@hhdms/eslint-config` packages; each app references the appropriate preset.
