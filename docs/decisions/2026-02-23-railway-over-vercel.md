# ADR: Railway over Vercel for Hosting

Date: 2026-02-23

## Decision

Use Railway as the single deployment platform for both the Next.js web app and background workers.

## Context

CafeRoam requires two types of deployed services: (1) the Next.js web application and (2) background workers for data pipeline (Apify triggers, LLM enrichment, embedding generation) and cron jobs (weekly email). Choosing a hosting platform that handles both avoids managing split infrastructure as a solo developer.

## Alternatives Considered

- **Vercel + Railway**: Vercel for Next.js (best DX), Railway for workers. Rejected: two platforms, two billing accounts, $20/mo (Vercel Pro — required for commercial use) + $5/mo (Railway) = $25/mo minimum during a 6+ month $0-revenue phase.
- **Vercel + Supabase only (no hosted workers)**: Data pipeline runs as local scripts; weekly email via Supabase pg_cron. Rejected: ongoing maintenance of cron jobs requires a reliable host; Apify crawler triggers should be automated, not manual.
- **Cloudflare Pages**: Free tier is generous but Next.js App Router support is partial; some features break at the edge.

## Rationale

Railway supports Node.js persistent services (not serverless), which means:

- No cold starts on API routes
- No timeout limits on long-running enrichment workers
- Native cron job support for the weekly email
- One platform, one bill (~$5/mo base)

The DX is slightly more configuration than Vercel for Next.js, but the worker support and cost savings outweigh this. If Railway DX proves painful during Phase 1, the app code is portable — migration to Vercel (app) + Railway (workers) is possible without code changes.

## Consequences

- Advantage: Single platform, single bill, worker + cron support included
- Advantage: Persistent services = no cold starts, no serverless timeout limits on enrichment
- Advantage: ~$15/mo cheaper than Vercel Pro during zero-revenue phase
- Disadvantage: Slightly more Next.js configuration than Vercel (no zero-config deploy)
- Disadvantage: No preview deployments per-PR (Vercel feature)
- Locked into: Railway deployment configuration (`railway.json`), but app code is portable
