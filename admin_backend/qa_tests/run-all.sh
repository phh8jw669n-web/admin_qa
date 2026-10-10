#!/usr/bin/env bash
# One command for the whole backend QA suite against a running API.
#   QA_BASE_URL     main server (default http://localhost:3000, LOGIN_THROTTLE_LIMIT raised to 500)
#   QA_THROTTLE_URL optional second server with default throttle (10/min) for 10-rate-limit spec
#   QA_SKIP_LOAD=1  skip the demo seed + load test
# Results: qa_tests/results/*.json  ->  python3 ../qa_tools/generate_csvs.py builds qa_backend/*.csv
set -u
cd "$(dirname "$0")/.."
rm -f qa_tests/results/*.json
npx jest -c qa_tests/jest.config.js --testPathIgnorePatterns 99-destructive "$@"
status=$?
# self-delete checks; the spec restores the super admin row itself
npx jest -c qa_tests/jest.config.js 99-destructive || status=1
npx ts-node -P qa_tests/tsconfig.json qa_tests/helpers/dump-endpoints.ts
if [ "${QA_SKIP_LOAD:-0}" != "1" ]; then
  npx ts-node -P qa_tests/tsconfig.json qa_tests/seed/seed-large.ts
  node qa_tests/load/load.js
fi
exit $status
