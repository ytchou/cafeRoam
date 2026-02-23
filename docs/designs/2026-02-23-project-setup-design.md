# Design: Phase 1 Section 1 — Project Setup

**Date:** 2026-02-23
**Hat:** CTO
**Status:** Approved

## Summary

Scaffold the CafeRoam Next.js 15 application with Tailwind CSS v4, shadcn/ui, ESLint (flat config), Prettier, full route skeleton, and complete `lib/` architecture stubs (provider interfaces + adapters, services, db client, shared types).

## Approach

**Approach A: `create-next-app` + Layer On Top** — Use official CLI tooling (`pnpm create next-app`, `npx shadcn init`) to generate the baseline config, then layer custom route structure and `lib/` architecture on top. Reconcile generated files with existing `package.json` and `tsconfig.json`.

Chosen over manual setup because Tailwind v4's CSS-based configuration and shadcn/ui's v4 integration have specific setup patterns that the official CLI handles correctly.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tailwind version | v4 | Latest engine, CSS-based config, shadcn/ui v4 support |
| Route structure | Full skeleton | Stub all route groups now for architecture visibility |
| Provider stubs | Interfaces + adapters + services | Maximum upfront architecture visibility |
| ESLint config | Flat config (`eslint.config.mjs`) | Next.js 15 default, modern standard |
| tsconfig strategy | Extend existing | Single config file, add Next.js-specific options |

## Architecture

### 1. Scaffold Generation

**Step 1:** Run `pnpm create next-app` in a temp directory, copy generated config files:
- `next.config.ts`
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- `postcss.config.mjs`
- `eslint.config.mjs`

**Step 2:** Merge dependencies into existing `package.json` (preserving prebuild scripts + deps).

**Step 3:** Run `npx shadcn@latest init` to generate `components.json` and `lib/utils.ts`.

shadcn/ui `components.json` config for Tailwind v4:
```json
{
  "tailwind": { "config": "", "css": "app/globals.css" },
  "rsc": true,
  "tsx": true,
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks",
    "utils": "@/lib/utils"
  }
}
```

### 2. Route Structure

```
app/
├── layout.tsx          # Root layout: fonts, metadata, providers wrapper
├── page.tsx            # Landing page (placeholder)
├── globals.css         # Tailwind v4 @import + @theme
├── (auth)/
│   ├── login/page.tsx      # Placeholder
│   └── signup/page.tsx     # Placeholder
├── (protected)/
│   ├── search/page.tsx     # Placeholder
│   ├── lists/page.tsx      # Placeholder
│   └── profile/page.tsx    # Placeholder
└── api/
    ├── auth/route.ts       # Placeholder
    ├── search/route.ts     # Placeholder
    └── shops/route.ts      # Placeholder
```

All placeholder pages return minimal JSX. API routes return `{ status: "not_implemented" }`.

### 3. lib/ Architecture Skeleton

```
lib/
├── providers/
│   ├── llm/
│   │   ├── llm.interface.ts         # ILLMProvider
│   │   ├── anthropic.adapter.ts     # implements ILLMProvider (throws NotImplemented)
│   │   └── index.ts                 # Factory: reads env, returns adapter
│   ├── embeddings/
│   │   ├── embeddings.interface.ts  # IEmbeddingsProvider
│   │   ├── openai.adapter.ts
│   │   └── index.ts
│   ├── email/
│   │   ├── email.interface.ts       # IEmailProvider
│   │   ├── resend.adapter.ts
│   │   └── index.ts
│   ├── maps/
│   │   ├── maps.interface.ts        # IMapsProvider
│   │   ├── mapbox.adapter.ts
│   │   └── index.ts
│   └── analytics/
│       ├── analytics.interface.ts   # IAnalyticsProvider
│       ├── posthog.adapter.ts
│       └── index.ts
├── services/
│   ├── search.service.ts            # Stub with interface
│   ├── checkin.service.ts           # Stub with interface
│   └── lists.service.ts             # Stub with interface
├── db/
│   └── supabase.ts                  # Client factory (browser + server)
├── types/
│   └── index.ts                     # Shared domain types
└── utils/
    └── index.ts                     # cn() helper + common utils
```

**Provider pattern:** Each provider directory contains:
- `*.interface.ts` — TypeScript interface defining the contract
- `*.adapter.ts` — Concrete implementation (stubs with `throw new Error("Not implemented")`)
- `index.ts` — Factory that reads env var and returns the appropriate adapter

### 4. Config File Updates

**tsconfig.json:**
- Add `jsx: "preserve"`, `lib: ["dom", "dom.iterable", "esnext"]`
- Add `plugins: [{ name: "next" }]`
- Expand `include` to `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`
- Keep `strict: true`, `moduleResolution: "bundler"`, path alias `@/*`

**package.json:**
- Add: `next@15`, `react@19`, `react-dom@19`, Tailwind v4, shadcn/ui deps
- Add: `@supabase/supabase-js`, `@supabase/ssr`
- Add dev: `@testing-library/react`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss`
- Update scripts: `dev`, `build`, `start`, `lint`, `format:check`, `type-check`
- Keep all existing `prebuild:*` scripts

**eslint.config.mjs:** Flat config with `core-web-vitals` + TypeScript rules.

**prettier:** Config with Tailwind plugin for class sorting.

### 5. Developer Experience

- `pnpm dev` boots Next.js dev server on :3000
- `pnpm lint` passes
- `pnpm type-check` passes
- `pnpm test` passes (existing prebuild tests + any new tests)

## Verification

After implementation, verify:
1. `pnpm install` succeeds without errors
2. `pnpm dev` starts and shows placeholder landing page at localhost:3000
3. `pnpm build` produces a successful production build
4. `pnpm lint` passes with zero errors
5. `pnpm type-check` passes with zero errors
6. `pnpm test` passes (existing tests still work)
7. All placeholder routes are accessible in the browser
8. `lib/` provider interfaces are importable and type-check correctly

## Out of Scope

- Supabase local setup and schema migrations (Phase 1 Section 2)
- Auth implementation (Phase 1 Section 3)
- Data pipeline integration (Phase 1 Section 4)
- Provider adapter implementations (Phase 1 Section 5)
- Observability setup (Phase 1 Section 6)
