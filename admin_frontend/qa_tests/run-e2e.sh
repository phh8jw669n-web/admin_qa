#!/usr/bin/env bash
# Runs frontend unit + e2e QA suites. Needs backend :3000 (with demo seed) and Vite on :5173.
set -u
cd "$(dirname "$0")/.."
rm -f qa_tests/results/e2e-rows.jsonl
npx vitest run -c qa_tests/vitest.config.ts
npx playwright test -c qa_tests/playwright.config.ts "$@"
