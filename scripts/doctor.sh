#!/usr/bin/env bash
# CafeRoam Doctor — Local environment preflight check
# Checks all required services and environment variables before dev work.
#
# Usage: make doctor (or bash scripts/doctor.sh)
#
# HOW TO ADD A NEW CHECK:
#   1. Call the `check` function with three arguments:
#      check "Description" "command_that_returns_0_on_success" "Fix: what to run"
#   2. The command runs silently — only exit code matters (0 = pass, non-zero = fail)
#   3. Add checks in the appropriate group (Infrastructure / Env Files / Dependencies / Data)
#   4. Update the CLAUDE.md extensibility note if the check covers a new service category

set -euo pipefail

PASS=0
FAIL=0

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  GREEN=''
  RED=''
  YELLOW=''
  BOLD=''
  NC=''
fi

_pass() { printf "${GREEN}[PASS]${NC} %s\n" "$1"; PASS=$((PASS + 1)); }
_fail() { printf "${RED}[FAIL]${NC} %s\n" "$1"; printf "       ${YELLOW}Fix: %s${NC}\n" "$2"; FAIL=$((FAIL + 1)); }

check() {
  local description="$1"
  local command="$2"
  local fix_hint="$3"
  if bash -c "$command" > /dev/null 2>&1; then
    _pass "$description"
  else
    _fail "$description" "$fix_hint"
  fi
}

check_env_var_localhost() {
  local file="$1"
  local var_name="$2"
  local description="$3"

  if [ ! -f "$file" ]; then
    _fail "$description" "File $file does not exist"
    return
  fi

  local value
  value=$(grep "^${var_name}=" "$file" 2>/dev/null | head -1 | cut -d'=' -f2- || true)

  if echo "$value" | grep -qE '(127\.0\.0\.1|localhost)'; then
    _pass "$description"
  else
    _fail "$description" "Update $var_name in $file to http://127.0.0.1:54321"
  fi
}

# ─── Find project root (where Makefile lives) ────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

printf "\n${BOLD}CafeRoam Doctor${NC}\n"
printf "────────────────────────────────\n\n"

# ─── Infrastructure ───────────────────────────────────────────────────────────
printf "${BOLD}Infrastructure${NC}\n"
check "Docker running" \
  "docker info" \
  "Start Docker Desktop"

check "Supabase DB healthy (127.0.0.1:54321)" \
  "curl -sf http://127.0.0.1:54321/rest/v1/ -H 'apikey: placeholder' -o /dev/null" \
  "Run: supabase start"

check "Supabase Auth healthy" \
  "curl -sf http://127.0.0.1:54321/auth/v1/health" \
  "Run: supabase stop && supabase start"

printf "\n"

# ─── Env Files ────────────────────────────────────────────────────────────────
printf "${BOLD}Env Files${NC}\n"
check ".env.local exists" \
  "test -f '${PROJECT_ROOT}/.env.local'" \
  "Copy from .env.example: cp .env.example .env.local"

check_env_var_localhost "${PROJECT_ROOT}/.env.local" "NEXT_PUBLIC_SUPABASE_URL" \
  ".env.local SUPABASE_URL points to localhost"

check "NEXT_PUBLIC_MAPBOX_TOKEN is set" \
  "grep -q '^NEXT_PUBLIC_MAPBOX_TOKEN=.' '${PROJECT_ROOT}/.env.local'" \
  "Add NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx to .env.local (get token at mapbox.com)"

check "MAPBOX_ACCESS_TOKEN is set in backend/.env (required for directions + geocoding)" \
  "grep -q '^MAPBOX_ACCESS_TOKEN=.' '${PROJECT_ROOT}/backend/.env'" \
  "Add MAPBOX_ACCESS_TOKEN=sk.xxx to backend/.env (get token at mapbox.com)"

check "backend/.env exists" \
  "test -f '${PROJECT_ROOT}/backend/.env'" \
  "Create backend/.env with SUPABASE_URL=http://127.0.0.1:54321"

check_env_var_localhost "${PROJECT_ROOT}/backend/.env" "SUPABASE_URL" \
  "backend/.env SUPABASE_URL points to localhost"

check "ANON_SALT is set" \
  "grep -q '^ANON_SALT=.' '${PROJECT_ROOT}/backend/.env'" \
  "Add ANON_SALT=\$(openssl rand -hex 32) to backend/.env"

check "ANTHROPIC_API_KEY is set (required for LLM enrichment and photo classification)" \
  "grep -q '^ANTHROPIC_API_KEY=.' '${PROJECT_ROOT}/backend/.env'" \
  "Add ANTHROPIC_API_KEY=<key> to backend/.env (get from console.anthropic.com)"

check "OPENAI_API_KEY is set (required for semantic search embeddings)" \
  "grep -q '^OPENAI_API_KEY=.' '${PROJECT_ROOT}/backend/.env'" \
  "Add OPENAI_API_KEY=<key> to backend/.env (get from platform.openai.com)"

# Production safety warning — does not count as a failure
if grep -q '^ANON_SALT=caferoam-dev-salt$' "${PROJECT_ROOT}/backend/.env" 2>/dev/null; then
  printf "${YELLOW}[WARN]${NC} ANON_SALT is set to the default dev value — change before deploying to production\n"
fi

check "SEARCH_CACHE_PROVIDER is set in backend/.env" \
  "grep -q '^SEARCH_CACHE_PROVIDER=.' '${PROJECT_ROOT}/backend/.env'" \
  "Add SEARCH_CACHE_PROVIDER=supabase (or 'none' to disable) to backend/.env"

# GA4 is optional for local dev — warn if not set, don't fail
if ! grep -q '^NEXT_PUBLIC_GA_MEASUREMENT_ID=.' "${PROJECT_ROOT}/.env.local" 2>/dev/null; then
  printf "${YELLOW}[WARN]${NC} NEXT_PUBLIC_GA_MEASUREMENT_ID not set in .env.local — GA4 analytics disabled\n"
fi

printf "\n"

# ─── Dependencies ─────────────────────────────────────────────────────────────
printf "${BOLD}Dependencies${NC}\n"
check "Python 3.12+" \
  "python3 -c 'import sys; exit(0 if sys.version_info >= (3, 12) else 1)'" \
  "Install Python 3.12+: brew install python@3.12 (or pyenv install 3.12)"

check "uv installed" \
  "command -v uv" \
  "Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"

check "Backend deps synced" \
  "uv sync --frozen --check --directory '${PROJECT_ROOT}/backend'" \
  "Run: cd backend && uv sync"

check "pnpm deps installed" \
  "test -f '${PROJECT_ROOT}/node_modules/.modules.yaml'" \
  "Run: pnpm install"

check "Playwright browsers installed" \
  "pnpm exec playwright --version > /dev/null 2>&1 && test -d '${PROJECT_ROOT}/node_modules/.cache/ms-playwright'" \
  "Run: pnpm exec playwright install chromium webkit"

printf "\n"

# ─── E2E ──────────────────────────────────────────────────────────────────────
printf "${BOLD}E2E (optional — only needed for e2e tests)${NC}\n"

check "E2E_BASE_URL set or dev server available" \
  "[ -n \"\${E2E_BASE_URL:-}\" ] || curl -sf http://localhost:3000 -o /dev/null" \
  "Set E2E_BASE_URL in .env.local, or run: pnpm dev"

check "E2E_USER_EMAIL set" \
  "[ -n \"\${E2E_USER_EMAIL:-}\" ]" \
  "Set E2E_USER_EMAIL in .env.local (test account email)"

check "E2E_USER_PASSWORD set" \
  "[ -n \"\${E2E_USER_PASSWORD:-}\" ]" \
  "Set E2E_USER_PASSWORD in .env.local (test account password)"

printf "\n"

# ─── Data ─────────────────────────────────────────────────────────────────────
printf "${BOLD}Data${NC}\n"
check "Migrations in sync" \
  "cd '${PROJECT_ROOT}' && test -z \"\$(supabase db diff 2>/dev/null)\"" \
  "Run: supabase db push"

# PostHog (optional — owner analytics degrades gracefully without it)
if [ -z "${POSTHOG_API_KEY:-}" ]; then
  printf "${YELLOW}[WARN]${NC} POSTHOG_API_KEY not set — owner analytics will show 0 page views\n"
fi

# ─── Ops / Environment Sync (optional — only needed for promote-to-prod) ──────
printf "\n${BOLD}Ops (environment sync)${NC}\n"

if [ -z "${STAGING_DATABASE_URL:-}" ]; then
  printf "${YELLOW}[WARN]${NC} STAGING_DATABASE_URL not set — needed for: make audit-staging, snapshot-staging, promote-to-prod\n"
else
  _pass "STAGING_DATABASE_URL set"
fi

if [ -z "${PROD_DATABASE_URL:-}" ]; then
  printf "${YELLOW}[WARN]${NC} PROD_DATABASE_URL not set — needed for: make promote-to-prod\n"
else
  _pass "PROD_DATABASE_URL set"
fi

# ─── Anti-Crawling / Rate Limiting ───────────────────────────────────────────
printf "\n${BOLD}Anti-Crawling (optional — defaults used if unset)${NC}\n"

if ! grep -q '^RATE_LIMIT_DEFAULT=.' "${PROJECT_ROOT}/backend/.env" 2>/dev/null; then
  printf "${YELLOW}[WARN]${NC} RATE_LIMIT_DEFAULT not set in backend/.env — using default '60/minute'\n"
fi

if ! grep -q '^BOT_DETECTION_ENABLED=.' "${PROJECT_ROOT}/backend/.env" 2>/dev/null; then
  printf "${YELLOW}[WARN]${NC} BOT_DETECTION_ENABLED not set in backend/.env — defaults to True\n"
fi

# ─── Railway (optional) ───────────────────────────────────────────────────────
printf "\n${BOLD}Railway${NC}\n"

if command -v railway &> /dev/null; then
  RAILWAY_VERSION=$(railway --version 2>/dev/null | head -1 || echo "unknown")
  _pass "Railway CLI installed: ${RAILWAY_VERSION}"
else
  printf "${YELLOW}[WARN]${NC} Railway CLI not installed — needed for staging/prod deploys\n"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
printf "\n────────────────────────────────\n"
if [ "$FAIL" -eq 0 ]; then
  printf "${GREEN}${BOLD}Result: All %d checks passed${NC}\n\n" "$((PASS + FAIL))"
  exit 0
else
  printf "${RED}${BOLD}Result: %d/%d checks passed (%d failed)${NC}\n" "$PASS" "$((PASS + FAIL))" "$FAIL"
  printf "Fix the issues above before proceeding.\n\n"
  exit 1
fi
