#!/usr/bin/env bash
# Runs frontend unit + e2e QA suites (one command).
# Needs: backend on :3000 with the demo seed, Vite dev server on :5173 started with
#   QA_API_PROXY_TARGET=http://localhost:3000 npx vite --port 5173 --host localhost --strictPort
# This script also builds the app and serves the production build on :4173 (vite preview)
# for the slow-network persona, then stops it.
set -u
cd "$(dirname "$0")/.."
rm -f qa_tests/results/e2e-rows.jsonl
export QA_API_PROXY_TARGET="${QA_API_PROXY_TARGET:-http://localhost:3000}"
npx vite build --logLevel error >/dev/null && {
  node node_modules/vite/bin/vite.js preview --port 4173 --host localhost --strictPort >/dev/null 2>&1 &
  PREVIEW_PID=$!
  export QA_PROD_URL=http://localhost:4173
}
npx vitest run -c qa_tests/vitest.config.ts
npx playwright test -c qa_tests/playwright.config.ts "$@"
status=$?
[ -n "${PREVIEW_PID:-}" ] && kill "$PREVIEW_PID" 2>/dev/null
exit $status
