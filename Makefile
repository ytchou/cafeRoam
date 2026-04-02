.PHONY: help doctor setup dev dev-all migrate seed-shops restore-seed-user reset-db workers-enrich workers-embed test validate-supabase lint audit-staging snapshot-staging promote-to-prod restore-snapshot

help:
	@echo "CafeRoam — Available commands:"
	@echo "  make setup               Run full dev environment setup (install → supabase start → migrate → dev)"
	@echo "  make dev                 Start Next.js dev server on :3000"
	@echo "  make dev-all             Start frontend + backend concurrently (Supabase must already be running)"
	@echo "  make migrate             Apply Supabase migrations"
	@echo "  make seed-shops          Restore full scraped shop data (710 shops, 164 live) from supabase/seeds/shops_data.sql"
	@echo "  make restore-seed-user   Restore the local dev admin user via Supabase Admin API (safe — no data loss)"
	@echo "  make reset-db            !! DESTRUCTIVE: wipes all data. Use only on a fresh clone. Run 'make seed-shops' after."
	@echo "  make workers-enrich      Run data enrichment worker locally"
	@echo "  make workers-embed       Run embedding generation worker locally"
	@echo "  make test                Run Vitest tests"
	@echo "  make doctor              Run environment preflight check (run before starting work)"
	@echo "  make validate-supabase   Validate Supabase instance for schema parity (requires DATABASE_URL)"
	@echo "  make lint                Run ESLint + Prettier check + TypeScript check"
	@echo "  make audit-staging       Audit staging Supabase data quality (requires DATABASE_URL)"
	@echo "  make snapshot-staging    Snapshot staging shop data to supabase/snapshots/ (requires DATABASE_URL)"
	@echo "  make promote-to-prod     Promote staging → prod (requires STAGING_DATABASE_URL + PROD_DATABASE_URL)"
	@echo "  make restore-snapshot    Restore a snapshot to local dev (FILE=..., TARGET=...)"

doctor:
	@bash scripts/doctor.sh

setup:
	pnpm install
	supabase start
	supabase db push
	@echo ""
	@echo "Setup complete. Next steps:"
	@echo "  make restore-seed-user   — create admin user (caferoam.tw@gmail.com / 00000000)"
	@echo "  make seed-shops          — restore 164 live shops from supabase/seeds/shops_data.sql"
	@echo "  make dev-all             — start frontend + backend"

dev:
	pnpm dev

dev-all:
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	pnpm dev:all

migrate:
	supabase db diff
	supabase db push

restore-seed-user:
	@echo "Restoring local dev admin user (caferoam.tw@gmail.com)..."
	@SERVICE_ROLE=$$(grep -E "^SUPABASE_SERVICE_ROLE_KEY" backend/.env | cut -d'=' -f2); \
	curl -s -o /tmp/seed_user_result.json -w "%{http_code}" \
	  -X POST "http://127.0.0.1:54321/auth/v1/admin/users" \
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

seed-shops:
	@echo "Restoring scraped shop data from supabase/seeds/shops_data.sql..."
	@docker exec -i supabase_db_caferoam psql -U postgres -d postgres < supabase/seeds/shops_data.sql
	@echo "Applying payment methods seed..."
	@docker exec -i supabase_db_caferoam psql -U postgres -d postgres < supabase/seeds/payment_methods_seed.sql
	@echo "Done — shop data restored."

reset-db:
	@echo "!! WARNING: This will wipe ALL local data (shops, users, check-ins, lists)."
	@echo "   Use 'make restore-seed-user' to restore just the admin user without data loss."
	@echo "   Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	supabase db reset
	@echo ""
	@echo "Database reset. Run 'make restore-seed-user && make seed-shops' to restore data."

workers-enrich:
	pnpm workers:enrich

workers-embed:
	pnpm workers:embed

test:
	pnpm test

validate-supabase:
	@if [ -z "$$DATABASE_URL" ]; then \
		echo "Usage: DATABASE_URL=postgresql://... make validate-supabase"; \
		echo "Local: DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres make validate-supabase"; \
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
	@FILE=$${FILE:-supabase/snapshots/latest.sql}; \
	TARGET=$${TARGET:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}; \
	echo "Restoring $$FILE → target DB"; \
	uv run scripts/sync_data.py restore --file "$$FILE" --target-url "$$TARGET"

lint:
	pnpm lint && pnpm format:check && pnpm type-check
