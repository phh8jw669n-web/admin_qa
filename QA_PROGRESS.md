# QA Progress

Branch: `qa-audit`. Updated after each module.

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 0 - Understand project | Done | Both folders read. Inventory in `qa_*/module_inventory.csv`. |
| 1 - Make it run | Done | Postgres 16 + Redis 7 local. Backend on :3000, frontend on :5173. |
| 2 - Plan tests | In progress | |
| 3 - Execute tests | In progress | |
| 4 - Code review | In progress | |
| 5 - CSVs + README | Not started | |

## Setup blockers found

- Backend `npm ci` failed: 6 lockfile entries point to `registry.npmmirror.com` (403). Fixed in lockfile (BE-CHG-001).
- No backend `.env.example`. Created `admin_backend/.env.example.qa` with dummy values.
- Frontend Vite proxy points to a hard-coded public IP. Changed to localhost for testing (FE-CHG-001).
- Only Chromium is installed for Playwright. Firefox and WebKit runs are Blocked.

## Modules

### Backend
| Module | Status |
|---|---|
| Auth (admin) | Pending |
| Super-Admin + Companies | Pending |
| Admins | Pending |
| Templates | Pending |
| Master data (languages, difficulties, categories, subjects, topics, CST mappings) | Pending |
| Instructions + Instruction languages | Pending |
| Tests + Test settings | Pending |
| Questions | Pending |
| Groups + Candidates + Documents | Pending |
| Candidate auth + Exam + Feedback | Pending |
| Locations (zones, regions, centres, labs) | Pending |
| Centre users | Pending |
| Events + Sessions | Pending |
| Mappings (test-candidate, candidate-centre) | Pending |
| Files | Pending |
| Health | Pending |

### Frontend
| Module | Status |
|---|---|
| Login / Forgot password | Pending |
| Workspace gate | Pending |
| Workspaces | Pending |
| Companies | Pending |
| Dashboard | Pending |
| Test Manager list | Pending |
| Test Wizard (steps 1-3) | Pending |
| Question Bank | Pending |
| Category Management | Pending |
| Layout / Sidebar / Profile menu | Pending |
