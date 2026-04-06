.PHONY: help doctor setup dev dev-all migrate seed-shops seed-kino restore-seed-user workers-enrich workers-embed test validate-supabase lint audit-staging snapshot-staging promote-to-prod restore-snapshot

help:
	@echo "CafeRoam — Available commands:"
	@echo "  make setup               Run full dev environment setup (install → link → migrate)"
	@echo "  make dev                 Start Next.js dev server on :3000"
	@echo "  make dev-all             Start frontend + backend concurrently (runs make doctor first)"
	@echo "  make migrate             Apply Supabase migrations (to linked staging project)"
	@echo "  make seed-shops          Seed shop data (requires DATABASE_URL)"
	@echo "  make seed-kino           Seed test data for Kino shop (requires DATABASE_URL)"
	@echo "  make restore-seed-user   Restore the dev admin user via Supabase Admin API"
	@echo "  make workers-enrich      Run data enrichment worker locally"
	@echo "  make workers-embed       Run embedding generation worker locally"
	@echo "  make test                Run Vitest tests"
	@echo "  make doctor              Run environment preflight check (run before starting work)"
	@echo "  make validate-supabase   Validate Supabase instance for schema parity (requires DATABASE_URL)"
	@echo "  make lint                Run ESLint + Prettier check + TypeScript check"
	@echo "  make audit-staging       Audit staging Supabase data quality (requires DATABASE_URL)"
	@echo "  make snapshot-staging    Snapshot staging shop data to supabase/snapshots/ (requires DATABASE_URL)"
	@echo "  make promote-to-prod     Promote staging → prod (requires STAGING_DATABASE_URL + PROD_DATABASE_URL)"
	@echo "  make restore-snapshot    Restore a snapshot (requires FILE + DATABASE_URL)"

doctor:
	@bash scripts/doctor.sh

setup:
	pnpm install
	@if [ ! -f .supabase/project-ref ]; then \
		echo ""; \
		echo "Supabase CLI is not linked to a project."; \
		echo "Run: supabase link --project-ref <your-project-ref>"; \
		echo "Then re-run: make setup"; \
		exit 1; \
	fi
	supabase db push
	@echo ""
	@echo "Setup complete. Next steps:"
	@echo "  make restore-seed-user   — create admin user (caferoam.tw@gmail.com / 00000000)"
	@echo "  make seed-shops          — seed shop data (requires DATABASE_URL)"
	@echo "  make dev-all             — start frontend + backend"

dev:
	pnpm dev

dev-all:
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@$(MAKE) doctor
	pnpm dev:all

migrate:
	supabase db diff
	supabase db push

restore-seed-user:
	@echo "Restoring dev admin user (caferoam.tw@gmail.com)..."
	@SUPABASE_URL=$$(grep -E "^SUPABASE_URL" backend/.env | cut -d'=' -f2-); \
	SERVICE_ROLE=$$(grep -E "^SUPABASE_SERVICE_ROLE_KEY" backend/.env | cut -d'=' -f2-); \
	if [ -z "$$SUPABASE_URL" ]; then echo "Error: SUPABASE_URL not set in backend/.env"; exit 1; fi; \
	if [ -z "$$SERVICE_ROLE" ]; then echo "Error: SUPABASE_SERVICE_ROLE_KEY not set in backend/.env"; exit 1; fi; \
	curl -s -o /tmp/seed_user_result.json -w "%{http_code}" \
	  -X POST "$$SUPABASE_URL/auth/v1/admin/users" \
	  -H "apikey: $$SERVICE_ROLE" \
	  -H "Authorization: Bearer $$SERVICE_ROLE" \
	  -H "Content-Type: application/json" \
	  -d '{"id":"00000000-0000-0000-0000-000000000001","email":"caferoam.tw@gmail.com","password":"00000000","email_confirm":true,"app_metadata":{"is_admin":true,"provider":"email","providers":["email"]}}' \
	  && echo "" \
	  || true
	@grep -q '"id":"00000000' /tmp/seed_user_result.json \
	  && echo "Done — admin user restored (caferoam.tw@gmail.com / 00000000)" \
	  || (grep -q "already been registered" /tmp/seed_user_result.json \
	      && echo "Already exists — no action needed." \
	      || (echo "Failed:" && cat /tmp/seed_user_result.json && exit 1))

seed-kino:
	@if [ -z "$$DATABASE_URL" ]; then \
		echo "Usage: DATABASE_URL=postgresql://... make seed-kino"; \
		exit 1; \
	fi
	@echo "Seeding test data for 木下庵 Kino..."
	@psql "$$DATABASE_URL" < supabase/seeds/kino_test_data.sql
	@echo "Done — Kino test data seeded."

seed-shops:
	@if [ -z "$$DATABASE_URL" ]; then \
		echo "Usage: DATABASE_URL=postgresql://... make seed-shops"; \
		exit 1; \
	fi
	@echo "Restoring scraped shop data from supabase/seeds/shops_data.sql..."
	@psql "$$DATABASE_URL" < supabase/seeds/shops_data.sql
	@echo "Applying payment methods seed..."
	@psql "$$DATABASE_URL" < supabase/seeds/payment_methods_seed.sql
	@echo "Done — shop data restored."

workers-enrich:
	pnpm workers:enrich

workers-embed:
	pnpm workers:embed

test:
	pnpm test

validate-supabase:
	@if [ -z "$$DATABASE_URL" ]; then \
		echo "Usage: DATABASE_URL=postgresql://... make validate-supabase"; \
		exit 1; \
	fi
	uv run scripts/validate_supabase.py

audit-staging:
	@if [ -z "$$DATABASE_URL" ]; then \
		echo "Usage: DATABASE_URL=postgresql://... make audit-staging"; \
		exit 1; \
	fi
	uv run scripts/sync_data.py audit

snapshot-staging:
	@if [ -z "$$DATABASE_URL" ]; then \
		echo "Usage: DATABASE_URL=postgresql://... make snapshot-staging"; \
		exit 1; \
	fi
	uv run scripts/sync_data.py snapshot --env staging

promote-to-prod:
	@if [ -z "$$STAGING_DATABASE_URL" ] || [ -z "$$PROD_DATABASE_URL" ]; then \
		echo "Usage: STAGING_DATABASE_URL=... PROD_DATABASE_URL=... make promote-to-prod"; \
		exit 1; \
	fi
	STAGING_DATABASE_URL=$$STAGING_DATABASE_URL PROD_DATABASE_URL=$$PROD_DATABASE_URL uv run scripts/sync_data.py promote

restore-snapshot:
	@if [ -z "$$FILE" ] || [ -z "$$DATABASE_URL" ]; then \
		echo "Usage: FILE=supabase/snapshots/latest.sql DATABASE_URL=postgresql://... make restore-snapshot"; \
		exit 1; \
	fi
	@echo "Restoring $$FILE → target DB"
	@uv run scripts/sync_data.py restore --file "$$FILE" --target-url "$$DATABASE_URL"

lint:
	pnpm lint && pnpm format:check && pnpm type-check
