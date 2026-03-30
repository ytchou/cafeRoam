#!/usr/bin/env bash
# CafeRoam Smoke Test — verify a live deployed environment
#
# Usage:
#   BASE_URL=https://caferoam.tw API_URL=https://api.caferoam.com bash scripts/smoke-test.sh
#
# Defaults to production URLs if env vars are not set.
# Exit code 0 = all checks passed. Non-zero = one or more checks failed.

set -euo pipefail

BASE_URL="${BASE_URL:-https://caferoam.tw}"
API_URL="${API_URL:-https://api.caferoam.com}"

PASS=0
FAIL=0

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
_fail() { printf "${RED}[FAIL]${NC} %s — %s\n" "$1" "$2"; FAIL=$((FAIL + 1)); }

# check_http <description> <url> <expected_status> [jq_filter] [expected_value]
#
# Makes a GET request and verifies:
#   1. HTTP status matches expected_status
#   2. If jq_filter + expected_value provided: JSON field matches expected value
check_http() {
  local description="$1"
  local url="$2"
  local expected_status="$3"
  local jq_filter="${4:-}"
  local expected_value="${5:-}"

  local response
  local actual_status

  response=$(curl -sf --max-time 15 -w "\n%{http_code}" "$url" 2>/dev/null || true)
  actual_status=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | head -n -1)

  if [ "$actual_status" != "$expected_status" ]; then
    _fail "$description" "HTTP $actual_status (expected $expected_status) — $url"
    return
  fi

  if [ -n "$jq_filter" ] && command -v jq &>/dev/null; then
    local actual_value
    actual_value=$(echo "$body" | jq -r "$jq_filter" 2>/dev/null || echo "")
    if [ "$actual_value" != "$expected_value" ]; then
      _fail "$description" "JSON check failed: $jq_filter = '$actual_value' (expected '$expected_value')"
      return
    fi
  fi

  _pass "$description"
}

printf "\n${BOLD}CafeRoam Smoke Test${NC}\n"
printf "────────────────────────────────────────\n"
printf "Web: ${BOLD}%s${NC}\n" "$BASE_URL"
printf "API: ${BOLD}%s${NC}\n" "$API_URL"
printf "────────────────────────────────────────\n\n"

# ─── Frontend ─────────────────────────────────────────────────────────────────
printf "${BOLD}Frontend${NC}\n"
check_http "Homepage reachable" "$BASE_URL/" "200"
check_http "Next.js health proxy" "$BASE_URL/api/health" "200"
printf "\n"

# ─── API Health ───────────────────────────────────────────────────────────────
printf "${BOLD}API Health${NC}\n"
check_http "Shallow health (/health)" "$API_URL/health" "200" ".status" "ok"
check_http "Deep health — Postgres (/health/deep)" "$API_URL/health/deep" "200" ".checks.postgres.status" "healthy"
printf "\n"

# ─── Data Endpoints ───────────────────────────────────────────────────────────
printf "${BOLD}Data Endpoints${NC}\n"
check_http "Shop list returns data (/shops?limit=1)" "$API_URL/shops?limit=1" "200"
check_http "Search responds (/search?q=咖啡&limit=1)" "$API_URL/search?q=%E5%92%96%E5%95%A1&limit=1" "200"
printf "\n"

# ─── Summary ──────────────────────────────────────────────────────────────────
printf "────────────────────────────────────────\n"
if [ "$FAIL" -eq 0 ]; then
  printf "${GREEN}${BOLD}All %d checks passed.${NC}\n\n" "$PASS"
  printf "Automated checks complete. Proceed to manual critical path validation:\n"
  printf "  1. Sign up as a new user\n"
  printf "  2. Search for a coffee shop\n"
  printf "  3. View a shop detail page\n"
  printf "  4. Create a list\n"
  printf "  5. Submit a check-in with a photo\n\n"
  exit 0
else
  printf "${RED}${BOLD}%d/%d checks failed.${NC} Fix failures before proceeding.\n\n" "$FAIL" "$((PASS + FAIL))"
  exit 1
fi
