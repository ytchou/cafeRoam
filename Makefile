.PHONY: help setup dev migrate seed reset-db workers-enrich workers-embed test lint

help:
	@echo "CafeRoam — Available commands:"
	@echo "  make setup          Run full dev environment setup (install → supabase start → migrate → seed → dev)"
	@echo "  make dev            Start Next.js dev server on :3000"
	@echo "  make migrate        Apply Supabase migrations"
	@echo "  make seed           Seed ~50 Taipei shops from Cafe Nomad API"
	@echo "  make reset-db       Reset local database and reseed"
	@echo "  make workers-enrich Run data enrichment worker locally"
	@echo "  make workers-embed  Run embedding generation worker locally"
	@echo "  make test           Run Vitest tests"
	@echo "  make lint           Run ESLint + Prettier check + TypeScript check"

setup:
	pnpm install
	supabase start
	supabase db push
	pnpm db:seed
	pnpm dev

dev:
	pnpm dev

migrate:
	supabase db diff
	supabase db push

seed:
	pnpm db:seed

reset-db:
	supabase db reset

workers-enrich:
	pnpm workers:enrich

workers-embed:
	pnpm workers:embed

test:
	pnpm test

lint:
	pnpm lint && pnpm format:check && pnpm type-check
