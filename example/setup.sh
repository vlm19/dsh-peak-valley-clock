#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
#  setup.sh — build and launch the peak-valley-clock plugin
#
#  Prerequisites (one-time, see README "Install" section):
#    1. this package is copied into the harness workspace, e.g. at
#       packages/community/dsh-peak-valley-clock
#    2. the three registrations described in README are already in place
#
#  This script assumes the harness workspace root is four levels above this
#  file (packages/community/dsh-peak-valley-clock/example/). It then runs:
#    pnpm install
#    pnpm run build:lib:client
#    pnpm dsh --profile web --patch <this package>/example/cordis.yml
# ============================================================================

# Script lives at <harness>/packages/community/dsh-peak-valley-clock/example/,
# so the harness workspace root is four levels up.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Prefer pnpm; fall back to corepack-managed pnpm.
if command -v pnpm >/dev/null 2>&1; then
  PNPM="pnpm"
elif command -v corepack >/dev/null 2>&1; then
  PNPM="corepack pnpm"
else
  echo "[error] pnpm not found. Install it with: npm install -g pnpm" >&2
  exit 1
fi

echo "[1/3] Installing workspace dependencies (pnpm install)..."
(cd "$HARNESS_ROOT" && $PNPM install)

echo "[2/3] Building client packages, including this plugin (pnpm run build:lib:client)..."
(cd "$HARNESS_ROOT" && $PNPM run build:lib:client)

echo "[3/3] Launching dsh web with the peak-valley overlay..."
(cd "$HARNESS_ROOT" && $PNPM dsh --profile web --patch "$SCRIPT_DIR/cordis.yml")
