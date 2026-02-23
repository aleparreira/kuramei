#!/usr/bin/env bash
# Shared utilities for Kuramei git hooks

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Icons
ICON_BLOCK="✗"
ICON_WARN="⚠"
ICON_OK="✓"
ICON_INFO="→"

log_block()  { echo -e "${RED}${ICON_BLOCK} BLOCKED:${NC} $*"; }
log_warn()   { echo -e "${YELLOW}${ICON_WARN} WARNING:${NC} $*"; }
log_ok()     { echo -e "${GREEN}${ICON_OK}${NC} $*"; }
log_info()   { echo -e "${CYAN}${ICON_INFO}${NC} $*"; }

log_header() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  $*${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

get_staged_files() {
  git diff --cached --name-only --diff-filter=ACM
}

get_staged_matching() {
  local pattern="$1"
  git diff --cached --name-only --diff-filter=ACM | grep -E "$pattern" || true
}

get_matching_lines() {
  local file="$1"
  local pattern="$2"
  grep -n "$pattern" "$file" 2>/dev/null || true
}

exit_blocked() {
  echo ""
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  ✗ COMMIT BLOCKED — resolve os erros acima${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  exit 1
}

exit_ok() {
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✓ ALL CHECKS PASSED${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  exit 0
}
