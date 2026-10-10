# Frontend QA tests

Vitest unit/component tests and Playwright browser tests. Every browser check appends its real result to
`qa_tests/results/e2e-rows.jsonl`; Vitest writes `qa_tests/results/vitest.json`. `qa_frontend/*.csv` is
generated from these files by `python3 ../qa_tools/generate_csvs.py`.

## Needs

- Backend running on `:3000` with the demo seed (`admin_backend/qa_tests/seed/seed-large.ts`):
  workspace `qa-demo`, admin `admin@qa-demo.test / DemoAdmin@123`, super admin `superadmin@qa.test / SuperQa@12345` (dummy QA accounts).
- Vite dev server on `:5173` proxying to the local backend:

```bash
QA_API_PROXY_TARGET=http://localhost:3000 npx vite --port 5173 --host localhost --strictPort &
```

## Run (one command)

```bash
./qa_tests/run-e2e.sh                 # Vitest + Playwright (Chromium)
QA_ALL_BROWSERS=1 ./qa_tests/run-e2e.sh   # also Firefox/WebKit, if those browsers are installed
```

A failing test = the UI does not behave as expected = a bug (see `qa_frontend/bugs.csv`).
Screenshots go to `qa_frontend/screenshots/`.

## Layout

| Path | What |
|---|---|
| `unit/logic.test.ts` | Pure logic: step 1 schema, create-test payload, password rule, workspace URL, error messages |
| `unit/components.test.tsx` | PasswordField and ConfirmDialog with Testing Library |
| `e2e/auth.spec.ts` | Workspace gate, login, logout, session refresh, redirects, token storage |
| `e2e/super-admin.spec.ts` | Workspaces and Companies pages |
| `e2e/test-manager.spec.ts` | Test list, filters, delete, QTI import, wizard steps 1-3, questions |
| `e2e/wizard-extra.spec.ts` | Template previews with file storage down, dropdown with more than 20 items |
| `e2e/pages-states.spec.ts` | Placeholder pages, 500/empty/slow/offline/401 states, navigation |
| `e2e/a11y.spec.ts` | axe-core scan of every page, keyboard and screen reader checks |
| `e2e/responsive.spec.ts` | 8 pages at 360/768/1366/1920 px |
| `e2e/perf.spec.ts` | Load timings, request counts, slow 3G |
| `e2e/simulations.spec.ts` | Persona walk-throughs |
