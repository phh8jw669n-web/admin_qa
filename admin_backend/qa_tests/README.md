# Backend QA tests

Black-box API tests (Jest + Supertest) that run against a live server. Every check records its real
result to `qa_tests/results/*.json`; `qa_backend/*.csv` is generated from these files.

## One-time setup

```bash
# Postgres 16 + Redis 7 running locally
cp .env.example.qa .env            # dummy values only
npm ci && npm run build
npm run seed:super-admin
```

## Run

```bash
# main server, login throttle raised so the suite's own logins are not blocked
LOGIN_THROTTLE_LIMIT=500 PORT=3000 node dist/main.js &
# second server with default throttle (10/min) for the rate-limit spec
LOGIN_THROTTLE_LIMIT=10  PORT=3001 node dist/main.js &

# ONE command: all specs, endpoint dump, demo seed (1,200 candidates, 1,100 tests, 35+ companies), load test
QA_THROTTLE_URL=http://localhost:3001 ./qa_tests/run-all.sh

# then rebuild the CSVs in qa_backend/ and qa_frontend/
python3 ../qa_tools/generate_csvs.py
```

Set `QA_SKIP_LOAD=1` to skip the seed and load test.

A failing Jest test = the API does not behave as expected = a bug (see `qa_backend/bugs.csv`).

## Layout

| Path | What |
|---|---|
| `helpers/global-setup.ts` | Builds two isolated tenants (A, B) through the API before each run |
| `helpers/endpoints.ts` | Catalogue of all endpoints with access rules (drives the auth matrix) |
| `specs/01-matrix` | Every endpoint x role, cross-tenant ids, missing ids, bad ids, invalid bodies |
| `specs/02..08` | Module tests: auth, companies/admins/templates, master data, tests/questions, candidates/exam, locations/mappings, errors/security/files |
| `specs/09-simulations` | Persona flows |
| `specs/10-rate-limit` | Login throttle (needs QA_THROTTLE_URL) |
| `specs/99-destructive` | Super admin self-delete; restores the row afterwards |
| `seed/seed-large.ts` | Demo workspace `qa-demo` with large data |
| `load/load.js` | Load test, writes `results/load.json` |
