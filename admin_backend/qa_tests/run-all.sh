#!/usr/bin/env bash
# Runs the full backend QA suite against a running API.
#   QA_BASE_URL     main server (default http://localhost:3000, LOGIN_THROTTLE_LIMIT raised to 500)
#   QA_THROTTLE_URL optional second server with default throttle (10/min) for 10-rate-limit spec
set -u
cd "$(dirname "$0")/.."
rm -f qa_tests/results/*.json
npx jest -c qa_tests/jest.config.js --testPathIgnorePatterns 99-destructive "$@"
status=$?
npx jest -c qa_tests/jest.config.js 99-destructive
# restore the super admin that 99-destructive may have removed
true
exit $status
