#!/usr/bin/env python3
"""
Builds every CSV in qa_backend/ and qa_frontend/ from:
  - real test results (admin_backend/qa_tests/results/*.json, admin_frontend/qa_tests/results/*)
  - hand-written findings (qa_tools/backend_findings.py, qa_tools/frontend_findings.py)
Run: python3 qa_tools/generate_csvs.py
"""
import csv
import glob
import json
import os
import re
import subprocess
import sys
from collections import Counter, OrderedDict, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import backend_findings as BF  # noqa: E402
import frontend_findings as FF  # noqa: E402

BE_RES = os.path.join(ROOT, "admin_backend", "qa_tests", "results")
FE_RES = os.path.join(ROOT, "admin_frontend", "qa_tests", "results")
OUT_BE = os.path.join(ROOT, "qa_backend")
OUT_FE = os.path.join(ROOT, "qa_frontend")
SEV_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
PROBLEMS = []


def clean(v):
    if v is None:
        return "N/A"
    s = str(v).replace("\r", " ").replace("\n", " ").strip()
    s = re.sub(r"\s+", " ", s)
    return s if s else "N/A"


def write(folder, name, header, rows):
    path = os.path.join(folder, name)
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, quoting=csv.QUOTE_MINIMAL)
        w.writerow(header)
        for r in rows:
            if len(r) != len(header):
                raise SystemExit(f"{name}: row has {len(r)} cells, header {len(header)}: {r}")
            w.writerow([clean(c) for c in r])
    return path


class Ids:
    def __init__(self):
        self.c = Counter()

    def next(self, prefix):
        self.c[prefix] += 1
        return f"{prefix}-{self.c[prefix]:03d}"


# ============================================================ BACKEND
def backend():
    ids = Ids()
    spec_order = sorted(f for f in glob.glob(os.path.join(BE_RES, "*.json")) if not f.endswith(("load.json", "endpoints.json")))
    rows = []
    seen = Counter()
    for fn in spec_order:
        for r in json.load(open(fn)):
            seen[r["key"]] += 1
            if seen[r["key"]] > 1:
                r["key"] = f"{r['key']}#{seen[r['key']]}"
            r["_spec"] = "admin_backend/qa_tests/specs/" + os.path.basename(fn).replace(".json", ".qa.spec.ts")
            rows.append(r)

    blocked = {
        "files.download.other-tenant": "Blocked: S3 is disabled in the QA env and the S3 check runs before the tenant-prefix check (503). Tenant check reviewed in code only.",
        "files.delete.other-tenant": "Blocked: S3 is disabled in the QA env and the S3 check runs before the tenant-prefix check (503). Tenant check reviewed in code only.",
    }
    for r in rows:
        if r["key"] in blocked:
            r["status"] = "Blocked"
            r["actual"] = blocked[r["key"]]

    eps = json.load(open(os.path.join(BE_RES, "endpoints.json")))
    api_ids = OrderedDict()
    for e in eps["endpoints"]:
        api_ids[e["apiId"]] = ids.next("BE-API")
    norm = lambda s: re.sub(r":[A-Za-z]+", ":x", s.split("?")[0].strip())  # noqa: E731
    ep_lookup = {norm(f"{e['method']} {e['path']}"): api_ids[e["apiId"]] for e in eps["endpoints"]}

    # file buckets + ids
    bucket_of = {"auth": "auth", "validation": "validation", "edge": "edge", "error": "error", "sim": "sim"}
    prefix_of = {"auth": "BE-TC", "validation": "BE-TC", "edge": "BE-EC", "error": "BE-ERR", "sim": "BE-SIM", "api": "BE-TC"}
    key_to_id = {}
    for r in rows:
        b = bucket_of.get(r["category"], "api")
        r["_bucket"] = b
        r["_id"] = ids.next(prefix_of[b])
        key_to_id[r["key"]] = r["_id"]

    # static checks (executed commands)
    static = [
        ("Install", "npm ci", "Dependencies install", "E403 from registry.npmmirror.com for 6 packages (fixed in lockfile, BE-CHG-001)", "Fail", "npm ci fails", "qa_backend/code_changes_log.csv"),
        ("Build", "npm run build", "Compiles", "nest build succeeded", "Pass", "", "admin_backend/dist"),
        ("Type check", "npx tsc --noEmit -p tsconfig.json", "0 errors", "1 error TS4053 (candidate-exam.controller.ts)", "Fail", "ESLint", "qa_backend/evidence/tsc-noemit.txt"),
        ("Lint", "npx eslint 'src/**/*.ts'", "0 errors", "116 errors, 3 warnings", "Fail", "ESLint", "qa_backend/evidence/eslint.txt"),
        ("Existing tests", "npm test", "Project tests pass", "No tests found", "Fail", "no tests", "qa_backend/evidence/existing-jest.txt"),
        ("Dependency audit", "npm audit", "0 high/critical", "2 critical, 5 high, 4 moderate", "Fail", "npm audit", "qa_backend/evidence/npm-audit.json"),
        ("Env docs", "Look for .env.example / README setup", "Documented env and setup", "No .env.example; README is NestJS template", "Fail", ".env.example", "admin_backend/README.md"),
        ("Migrations", "ls src/database/migrations; read database.config.ts", "Versioned migrations", "No migrations folder; synchronize used", "Fail", "migrations", "admin_backend/src/config/database.config.ts"),
        ("Scripts", "npm run db:create", "Creates DB", "tsconfig.scripts.json missing", "Fail", "db:create", "admin_backend/package.json"),
        ("CI config", "Read .github/workflows/main.yml", "Lint/test gate merges; deploy built artifact", "Lint '|| true'; deploy runs git reset + npm install on server", "Fail", "Deploy job", "admin_backend/.github/workflows/main.yml"),
        ("Seed", "npm run seed:super-admin", "Super admin created", "Created; idempotent", "Pass", "", "qa_backend/code_changes_log.csv"),
        ("Health", "GET /api/v1/health after start", "DB + Redis up", "Both up", "Pass", "", "curl"),
    ]
    static_rows = []
    for name, cmd, exp, act, status, bugmatch, ev in static:
        tid = ids.next("BE-TC")
        static_rows.append(dict(id=tid, name=name, cmd=cmd, exp=exp, act=act, status=status, bugmatch=bugmatch, ev=ev))

    # bugs
    bug_defs = []
    for b in BF.BUGS:
        bug_defs.append(dict(b, evidence=None, fixed="No"))
    for b in BF.SETUP_BUGS:
        bug_defs.append(dict(b, keys=[]))
    bug_defs.sort(key=lambda b: SEV_ORDER[b["severity"]])
    test_to_bugs = defaultdict(list)
    bug_rows = []
    for b in bug_defs:
        bid = ids.next("BE-BUG")
        b["id"] = bid
        rel = [key_to_id[k] for k in b.get("keys", []) if k in key_to_id]
        missing = [k for k in b.get("keys", []) if k not in key_to_id]
        if missing:
            PROBLEMS.append(f"backend bug '{b['title']}' refers to unknown keys {missing}")
        for k in b.get("keys", []):
            if k in key_to_id:
                test_to_bugs[key_to_id[k]].append(bid)
        # static check links
        for s in static_rows:
            if s["bugmatch"] and s["status"] == "Fail" and (s["bugmatch"].lower() in b["title"].lower() or s["bugmatch"].lower() in b.get("actual", "").lower()):
                rel.append(s["id"])
                test_to_bugs[s["id"]].append(bid)
        if not rel:
            PROBLEMS.append(f"backend bug without related test: {b['title']}")
        specs = sorted({r["_spec"] for r in rows if r["key"] in b.get("keys", [])})
        evidence = b.get("evidence") or "; ".join(specs) or "N/A"
        b["_rel"] = rel
        bug_rows.append([bid, b["module"], b["title"], b["steps"], b["expected"], b["actual"], b["severity"], b["priority"], "; ".join(rel) or "N/A", b["file"], b["fix"], evidence, b.get("fixed", "No")])
    bug_by_id = {b["id"]: b for b in bug_defs}

    def bug_ids(tid):
        return "; ".join(dict.fromkeys(test_to_bugs.get(tid, []))) or "N/A"

    def severity_of(tid):
        bl = test_to_bugs.get(tid, [])
        if not bl:
            return "N/A"
        return min((bug_by_id[x]["severity"] for x in bl), key=lambda s: SEV_ORDER[s])

    for r in rows:
        if r["status"] == "Fail" and not test_to_bugs.get(r["_id"]):
            PROBLEMS.append(f"backend failing test without bug: {r['key']} ({r['_id']})")
    for s in static_rows:
        if s["status"] == "Fail" and not test_to_bugs.get(s["id"]):
            PROBLEMS.append(f"backend failing static check without bug: {s['name']}")

    def api_id(r):
        return ep_lookup.get(norm(r["endpoint"]), "N/A")

    # ---- api_test_cases
    api_rows = []
    for r in rows:
        if r["_bucket"] != "api":
            continue
        api_rows.append([r["_id"], api_id(r), r["endpoint"], r["scenario"], r["request"], r["expectedStatus"], r["expected"], r["actualStatus"], r["actual"], r["status"], bug_ids(r["_id"]), r["evidence"]])
    write(OUT_BE, "api_test_cases.csv", ["Test ID", "API ID", "Endpoint", "Scenario", "Request Data", "Expected Status Code", "Expected Response", "Actual Status Code", "Actual Response (short)", "Status", "Bug ID", "Evidence"], api_rows)

    # ---- validation
    val_rows = [[r["_id"], r["endpoint"], r.get("field") or "N/A", r.get("rule") or r["scenario"], r["request"], f"{r['expectedStatus']} {r['expected']}", f"{r['actualStatus']} {r['actual']}", r["status"], bug_ids(r["_id"])] for r in rows if r["_bucket"] == "validation"]
    write(OUT_BE, "validation.csv", ["Test ID", "Endpoint", "Field", "Rule Checked", "Input Used", "Expected Result", "Actual Result", "Status", "Bug ID"], val_rows)

    # ---- edge cases
    edge_rows = [[r["_id"], r["module"], r["endpoint"], r["scenario"], r["request"], r["expected"], f"{r['actualStatus']} {r['actual']}", r["status"], severity_of(r["_id"]), bug_ids(r["_id"])] for r in rows if r["_bucket"] == "edge"]
    write(OUT_BE, "edge_cases.csv", ["Edge Case ID", "Module", "Endpoint", "Scenario", "Input", "Expected Behaviour", "Actual Behaviour", "Status", "Severity", "Bug ID"], edge_rows)

    # ---- auth permissions
    auth_rows = []
    for r in rows:
        if r["_bucket"] != "auth":
            continue
        action = f"{r['scenario']} ({r['endpoint'].split(' ')[0]})"
        auth_rows.append([r["_id"], r["endpoint"], r.get("role") or "N/A", action, r.get("shouldAllow", "N/A"), r.get("wasAllowed", "N/A"), r["status"], severity_of(r["_id"]), bug_ids(r["_id"])])
    write(OUT_BE, "auth_permissions.csv", ["Test ID", "Endpoint", "Role Used (or No Login)", "Action Tried", "Should Be Allowed (Yes/No)", "Was Allowed (Yes/No)", "Status", "Severity", "Bug ID"], auth_rows)

    # ---- error handling
    err_rows = []
    for r in rows:
        if r["_bucket"] != "error":
            continue
        fix = "; ".join(bug_by_id[b]["fix"] for b in dict.fromkeys(test_to_bugs.get(r["_id"], []))) or "None needed"
        err_rows.append([r["_id"], r["endpoint"], r["scenario"], r["expected"], f"{r['actualStatus']} {r['actual']}", r.get("leaks", "No"), r["status"], fix])
    for mod, scen, exp, act, leaks, status, fix in BF.ERR_AUTHORED:
        err_rows.append([ids.next("BE-ERR"), mod, scen, exp, act, leaks, status, fix])
    write(OUT_BE, "error_handling_logging.csv", ["Test ID", "Endpoint/Module", "Error Scenario", "Expected Handling", "Actual Handling", "Leaks Internal Info (Yes/No)", "Status", "Suggested Fix"], err_rows)

    # ---- simulations
    sim_rows = []
    for r in rows:
        if r["_bucket"] != "sim":
            continue
        sim_rows.append([r["_id"], r["endpoint"], r["scenario"], r["expected"], r["actual"], r.get("wasAllowed", "N/A"), r["status"], f"{r.get('rule') or ''} Bugs: {bug_ids(r['_id'])}"])
    write(OUT_BE, "business_flow_simulations.csv", ["Simulation ID", "Persona", "Flow (sequence of API calls)", "Expected Outcome", "Actual Outcome", "Data Correct (Yes/No)", "Status", "Notes"], sim_rows)

    # ---- static checks (extra file)
    write(OUT_BE, "static_checks.csv", ["Test ID", "Check", "Command", "Expected", "Actual", "Status", "Bug ID", "Evidence"],
          [[s["id"], s["name"], s["cmd"], s["exp"], s["act"], s["status"], bug_ids(s["id"]), s["ev"]] for s in static_rows])

    # ---- security
    sec_rows = []
    for mod, issue, how, risk, fix, sev, keys in BF.SECURITY:
        tids = [key_to_id[k] for k in keys if k in key_to_id]
        sec_rows.append([ids.next("BE-SEC"), mod, issue, f"{how}{' [' + ', '.join(tids) + ']' if tids else ''}", risk, fix, sev])
    write(OUT_BE, "security.csv", ["Security ID", "Module/Endpoint", "Issue", "How It Was Found/Tested", "Risk (in simple words)", "Suggested Fix", "Severity"], sec_rows)

    # ---- database integrity
    write(OUT_BE, "database_integrity.csv", ["DB ID", "Table/Model", "Issue", "Example/Proof", "Risk", "Suggested Fix", "Priority"],
          [[ids.next("BE-DB"), *d] for d in BF.DB])

    # ---- performance
    perf_rows = []
    load = json.load(open(os.path.join(BE_RES, "load.json")))
    for l in load:
        prob, fix = BF.PERF_PROBLEMS.get(l["name"], ("N/A", "N/A"))
        prio = "P2" if l["avgMs"] > 100 else "P3"
        perf_rows.append([ids.next("BE-PERF"), f"{l['endpoint']} {('?' + l['query']) if l['query'] else ''} ({l['name']})", f"{l['load']}; {l['requests']} requests; {round(l['rps'])} req/s", f"{l['avgMs']:.1f} ms", f"{l['maxMs']} ms (p99 {l['p99Ms']} ms)", f"{l['errorRate']}%", prob, fix, prio])
    sim_power = next((r for r in rows if r["key"] == "sim.power-admin"), None)
    if sim_power:
        m = re.search(r"60/60 in (\d+) ms", sim_power["actual"])
        if m:
            perf_rows.append([ids.next("BE-PERF"), "POST /api/v1/candidates (60 sequential creates)", "1 client, 60 requests", f"{int(m.group(1)) / 60:.0f} ms", "N/A", "0%", "No bulk import endpoint; bcrypt hash per candidate", "Add bulk import (CSV) endpoint with batched inserts", "P2"])
    write(OUT_BE, "performance_load.csv", ["Perf ID", "Endpoint", "Load Used", "Avg Response Time", "Slowest Response Time", "Error Rate", "Problem", "Suggested Fix", "Priority"], perf_rows)

    # ---- dependency audit
    audit = json.load(open(os.path.join(OUT_BE, "evidence", "npm-audit.json")))
    outdated = json.load(open(os.path.join(OUT_BE, "evidence", "npm-outdated.json")))
    lock = json.load(open(os.path.join(ROOT, "admin_backend", "package-lock.json")))
    dep_rows = []
    for name, v in audit["vulnerabilities"].items():
        cur = lock["packages"].get(f"node_modules/{name}", {}).get("version", "N/A")
        titles = [x.get("title") for x in v["via"] if isinstance(x, dict)]
        via = [x for x in v["via"] if isinstance(x, str)]
        vuln = "; ".join(titles[:2]) if titles else f"Through {', '.join(via)}"
        fixa = v.get("fixAvailable")
        action = f"Upgrade {fixa['name']} to {fixa['version']}" if isinstance(fixa, dict) else ("npm audit fix" if fixa else "No fix yet; track advisory")
        latest = latest_version(name)
        dep_rows.append([ids.next("BE-DEP"), name, cur, latest, vuln, v["severity"].capitalize(), action])
    for name, v in outdated.items():
        if v.get("current") and v.get("latest") and v["current"].split(".")[0] != v["latest"].split(".")[0]:
            dep_rows.append([ids.next("BE-DEP"), name, v["current"], v["latest"], "None known (major version behind)", "Low", f"Plan upgrade to {v['latest']} (breaking changes)"])
    write(OUT_BE, "dependency_audit.csv", ["Dep ID", "Package", "Current Version", "Latest Version", "Known Vulnerability", "Risk", "Suggested Action"], dep_rows)

    # ---- optimisation
    write(OUT_BE, "code_optimization.csv", ["Opt ID", "File Path", "Line(s)", "Current Problem", "Why It Matters", "Suggested Change", "Expected Benefit", "Priority", "Effort"],
          [[ids.next("BE-OPT"), *o] for o in BF.OPT])

    # ---- bugs + changes + inventories
    write(OUT_BE, "bugs.csv", ["Bug ID", "Module", "Title", "Steps to Reproduce", "Expected Result", "Actual Result", "Severity", "Priority", "Related Test ID", "File Path (if known)", "Suggested Fix", "Evidence", "Fixed During QA (Yes/No)"], bug_rows)
    write(OUT_BE, "code_changes_log.csv", ["Change ID", "File Path", "What Was Changed", "Why (to run/to test/to unblock)", "Affects Real Behaviour (Yes/No)", "Should Be Kept in Main Code (Yes/No)"],
          [[ids.next("BE-CHG"), *c] for c in BF.CHANGES])
    write(OUT_BE, "module_inventory.csv", ["Module", "Main Files", "Models/Tables Used", "Endpoints", "Description", "Notes"], [list(m) for m in BF.MODULES])
    access_roles = {"public": "Anyone", "admin": "Company admin", "super": "Super admin", "both": "Company admin, Super admin", "any-admin-jwt": "Company admin, Super admin", "candidate": "Candidate", "centre": "Centre user"}
    fe_missing = "; ".join(f"{m['method']} {m['path']}" for m in eps["frontendOnly"])
    inv = []
    for e in eps["endpoints"]:
        note = "Not used by the frontend" if e["usedByFrontend"] == "No" else "Used by frontend"
        inv.append([api_ids[e["apiId"]], e["method"], e["path"], e["purpose"], "No" if e["access"] == "public" else "Yes", access_roles[e["access"]], e["params"], e["success"], e["usedByFrontend"], note])
    inv.append(["N/A", "Various", "(missing)", "Endpoints the frontend calls that do not exist: " + fe_missing, "N/A", "N/A", "N/A", "N/A", "Yes", "Calls return 404 (see qa_frontend/frontend_backend_map.csv)"])
    write(OUT_BE, "api_inventory.csv", ["API ID", "Method", "Path", "Purpose", "Auth Required", "Allowed Roles", "Request Body/Params", "Success Response", "Used By Frontend (Yes/No)", "Notes"], inv)
    write(OUT_BE, "use_cases.csv", ["Use Case ID", "Module", "Actor (Role)", "Goal", "Preconditions", "Main Flow", "Alternate Flows", "Expected Outcome", "Priority"],
          [[ids.next("BE-UC"), *u] for u in BF.USE_CASES])

    # ---- summary
    def counts(bucket_rows):
        st = Counter(r[1] for r in bucket_rows)
        bugs = set()
        for tid, _ in bucket_rows:
            bugs.update(test_to_bugs.get(tid, []))
        sev = Counter(bug_by_id[b]["severity"] for b in bugs)
        return st, sev

    summary = []
    groups = [
        ("API functional tests", [(r["_id"], r["status"]) for r in rows if r["_bucket"] == "api"], "Tenant isolation and auth checks hold; data rules and exam window checks are missing"),
        ("Auth and permissions", [(r["_id"], r["status"]) for r in rows if r["_bucket"] == "auth"], "Every endpoint rejects no-login and wrong-role calls; no cross-tenant (IDOR) leak found"),
        ("Validation", [(r["_id"], r["status"]) for r in rows if r["_bucket"] == "validation"], "DTOs catch types and formats; business rules (dates, marks, passwords) and string-to-boolean are weak"),
        ("Edge cases", [(r["_id"], r["status"]) for r in rows if r["_bucket"] == "edge"], "Case-insensitive duplicates, multi-day times, time zone, parallel creates fail"),
        ("Error handling", [(r["_id"], r["status"]) for r in rows if r["_bucket"] == "error"], "Consistent JSON errors; numeric overflow and bad dates still give 500"),
        ("Business flow simulations", [(r["_id"], r["status"]) for r in rows if r["_bucket"] == "sim"], "Onboarding, exam day and concurrent editing flows have blocking gaps"),
        ("Static checks", [(s["id"], s["status"]) for s in static_rows], "Install, lint, type check, audit and CI need work"),
    ]
    for name, rr, take in groups:
        st, sev = counts(rr)
        summary.append([name, len(rr), st["Pass"], st["Fail"], st["Blocked"], st["Not Run"], sev["Critical"], sev["High"], sev["Medium"], sev["Low"], take])
    summary.append(["Load tests (autocannon)", len(load), sum(1 for l in load if l["errorRate"] == 0), sum(1 for l in load if l["errorRate"] > 0), 0, 0, 0, 0, 0, 0, "0% errors at 10 connections; big lists 130-180 ms avg"])
    all_rows = [(r["_id"], r["status"]) for r in rows] + [(s["id"], s["status"]) for s in static_rows]
    st = Counter(s for _, s in all_rows)
    sev_all = Counter(b["severity"] for b in bug_defs)
    summary.append(["ALL TESTS", len(all_rows), st["Pass"], st["Fail"], st["Blocked"], st["Not Run"], sev_all["Critical"], sev_all["High"], sev_all["Medium"], sev_all["Low"], f"{len(bug_defs)} bugs in bugs.csv; fix the Critical/High list first"])
    write(OUT_BE, "00_summary.csv", ["Category", "Total", "Passed", "Failed", "Blocked", "Not Run", "Critical Bugs", "High Bugs", "Medium Bugs", "Low Bugs", "Key Takeaway"], summary)
    return dict(total=len(all_rows), status=st, bugs=sev_all, nbugs=len(bug_defs), bug_defs=bug_defs, key_to_id=key_to_id, rows=rows, load=load)


_latest_cache = {}


def latest_version(name):
    if name in _latest_cache:
        return _latest_cache[name]
    try:
        v = subprocess.run(["npm", "view", name, "version"], capture_output=True, text=True, timeout=30).stdout.strip() or "N/A"
    except Exception:
        v = "N/A"
    _latest_cache[name] = v
    return v


# ============================================================ FRONTEND
FE_VALIDATION_META = {
    "fe.login.empty": ("Login", "Login", "Email", "Required (browser)", "(empty)", "Yes"),
    "fe.companies.create.empty": ("Companies", "Create Company", "All required fields", "Required", "(empty form)", "Yes"),
    "fe.wizard.step1.empty": ("Test Wizard", "Create test step 1", "All * fields", "Required + focus first error", "(empty form)", "Yes"),
    "fe.wizard.step1.handicapped-equal": ("Test Wizard", "Create test step 1", "For Handicapped", "UI: > duration; API: >= duration", "60 / 60", "No"),
    "fe.questions.empty": ("Test Wizard", "Add Question", "Subject, Topic, Type", "Required", "(nothing selected)", "Yes"),
    "fe.unit.schema.valid": ("Test Wizard", "Create test step 1", "All", "Valid values pass", "Valid form", "Yes"),
    "fe.unit.schema.handicapped-equal": ("Test Wizard", "Create test step 1", "For Handicapped", ">= duration (API)", "60 / 60", "No"),
    "fe.unit.schema.name-max": ("Test Wizard", "Create test step 1", "Test Name", "Max 200 (API)", "201 chars", "No"),
    "fe.unit.schema.code-max": ("Test Wizard", "Create test step 1", "Test Code", "Max 10 (API)", "11 chars", "No"),
    "fe.unit.schema.buffer-format": ("Test Wizard", "Create test step 1", "Start Buffer Time", "HH:MM (API)", "15 min", "No"),
    "fe.unit.schema.decimal-marks": ("Test Wizard", "Create test step 1", "Total Marks", "2 decimals allowed (API)", "12.5", "No"),
    "fe.unit.schema.grace": ("Test Wizard", "Create test step 1", "Grace Marks", "<= Total Marks", "500 vs 20", "No (API also misses it)"),
    "fe.unit.schema.end-before-start": ("Test Wizard", "Create test step 1", "End Date", ">= Start Date", "2029-12-31 < 2030-01-01", "Yes"),
    "fe.unit.password.strong": ("Forgot Password", "Reset password", "New password", "8+ chars, upper, lower, number, symbol", "Abcdef1!", "No (API has no strength rule)"),
    "fe.unit.password.weak": ("Forgot Password", "Reset password", "New password", "Needs a symbol", "Abcdefg1", "No (API has no strength rule)"),
    "fe.unit.password.short": ("Forgot Password", "Reset password", "New password", "Min 8", "Ab1!xyz", "Yes"),
}
FE_API_META = {
    "fe.forgot.api": ("Forgot password page", "POST /auth/forgot-password", "success"),
    "fe.workspaces.load": ("Workspaces page", "GET /workspaces", "success"),
    "fe.tests.import-qti": ("Import Tests dialog", "POST /tests/import-qti", "success"),
    "fe.dashboard.real-data": ("Dashboard", "GET /dashboard (forced mock, not called)", "success"),
    "fe.state.500": ("Test Manager list", "GET /tests (mocked 500)", "error"),
    "fe.state.empty": ("Test Manager list", "GET /tests (mocked empty)", "empty"),
    "fe.state.slow": ("Test Manager list", "GET /tests (4 s delay)", "slow"),
    "fe.state.offline": ("Test Manager list", "GET /tests (offline)", "error"),
    "fe.state.401": ("Test Manager list", "GET /tests (mocked 401)", "error"),
    "fe.state.companies-500": ("Companies page", "GET /super-admin/companies (mocked 500)", "error"),
}
A11Y_FIX = {
    "button-name": ("Screen reader users", "Add aria-label to icon-only buttons (row actions, theme, sidebar collapse, CKEditor custom buttons)"),
    "color-contrast": ("Low-vision users", "Raise text/background contrast to 4.5:1 (muted-foreground on card, primary on dark)"),
    "label": ("Screen reader users", "Connect every input to a <label> or aria-label (option inputs, filters)"),
    "link-name": ("Screen reader users", "Give links visible text or aria-label"),
    "aria-allowed-attr": ("Screen reader users", "Use only ARIA attributes valid for the role"),
    "aria-required-children": ("Screen reader users", "Use correct child roles (e.g. listbox > option)"),
    "aria-prohibited-attr": ("Screen reader users", "Remove aria-label from elements that cannot be named"),
    "nested-interactive": ("Keyboard and screen reader users", "Do not put buttons inside other buttons/links"),
    "scrollable-region-focusable": ("Keyboard users", "Make scroll areas focusable (tabIndex=0) or ensure they contain focusable items"),
    "aria-hidden-focus": ("Keyboard users", "Do not hide focusable elements with aria-hidden"),
    "select-name": ("Screen reader users", "Label the hidden native <select> elements"),
    "aria-input-field-name": ("Screen reader users", "Give comboboxes an accessible name"),
    "frame-title": ("Screen reader users", "Add title to iframes"),
    "list": ("Screen reader users", "Use only <li> inside lists"),
    "listitem": ("Screen reader users", "Wrap <li> in <ul>/<ol>"),
    "image-alt": ("Blind users", "Add alt text to images"),
    "aria-progressbar-name": ("Screen reader users", "Name the progress bar"),
    "aria-command-name": ("Screen reader users", "Name buttons with role=button"),
    "aria-valid-attr-value": ("Screen reader users", "Fix ARIA attribute values (aria-controls points to missing id)"),
    "region": ("Screen reader users", "Put content inside landmarks"),
}
SEV_FROM_IMPACT = {"critical": "High", "serious": "Medium", "moderate": "Low", "minor": "Low"}


def frontend(be):
    ids = Ids()
    rows = OrderedDict()
    jl = os.path.join(FE_RES, "e2e-rows.jsonl")
    if os.path.exists(jl):
        for line in open(jl, encoding="utf-8"):
            if line.strip():
                r = json.loads(line)
                rows[r["key"]] = r
    rows = list(rows.values())
    unit = []
    vt = os.path.join(FE_RES, "vitest.json")
    if os.path.exists(vt):
        for f in json.load(open(vt))["testResults"]:
            for a in f["assertionResults"]:
                m = re.match(r"\[([^\]]+)\]\s*(.*)", a["title"])
                if not m:
                    continue
                key, title = m.group(1), m.group(2)
                status = "Pass" if a["status"] == "passed" else "Fail"
                msg = "; ".join(a.get("failureMessages", []))[:200] if status == "Fail" else "As expected"
                cat = "validation" if key.startswith(("fe.unit.schema", "fe.unit.password.")) else "functional"
                module = " > ".join(a.get("ancestorTitles", [])) or "Unit"
                unit.append(dict(key=key, category=cat, module=module, page="Unit test (Vitest)", title=title, steps=f"Run: npx vitest run -c qa_tests/vitest.config.ts ({os.path.basename(f['name'])})", expected=title, actual=re.sub(r"\x1b\[[0-9;]*m", "", msg), status=status, evidence=f"admin_frontend/qa_tests/unit/{os.path.basename(f['name'])}"))
    allrows = rows + unit

    bucket = {"functional": "func", "security": "func", "design": "func", "edge": "edge", "validation": "val", "api": "api", "a11y": "a11y", "responsive": "resp", "perf": "perf", "sim": "sim"}
    prefix = {"func": "FE-TC", "val": "FE-TC", "api": "FE-TC", "edge": "FE-EC", "a11y": "FE-A11Y", "resp": "FE-RESP", "perf": "FE-PERF", "sim": "FE-SIM"}
    key_to_id = {}
    # a11y: assign ids only to issues and keyboard checks
    for r in allrows:
        b = bucket.get(r["category"], "func")
        if b == "a11y" and r["key"].endswith(".summary"):
            r["_bucket"] = "a11y-summary"
            continue
        r["_bucket"] = b
        r["_id"] = ids.next(prefix[b])
        key_to_id[r["key"]] = r["_id"]

    static = [
        ("Type check", "npx tsc -b", "0 errors", "0 errors", "Pass", "", "qa_frontend/evidence/tsc.txt"),
        ("Lint", "npm run lint (oxlint)", "0 warnings", "10 warnings (react-refresh, exhaustive-deps)", "Fail", "Prettier", "qa_frontend/evidence/oxlint.txt"),
        ("Format", "npm run format:check", "Clean", "31 files need formatting", "Fail", "Prettier", "qa_frontend/evidence/prettier-check.txt"),
        ("Build", "npx vite build", "Build, chunks < 500 KB", "Built; 2 chunks > 1.1 MB (warning)", "Fail", "bundle", "qa_frontend/evidence/vite-build.txt"),
        ("Dependency audit", "npm audit", "0 high", "2 high (axios, source-map-js)", "Fail", "npm audit", "qa_frontend/evidence/npm-audit.json"),
        ("Existing tests", "Look for test script/files", "Tests exist", "None", "Fail", "No tests", "admin_frontend/package.json"),
        ("Config review", "Read vite.config.ts, netlify.toml, _redirects, .gitignore", "HTTPS API from env; .env ignored", "Hard-coded http IP; .env committed", "Fail", "hard-coded public IP", "admin_frontend/vite.config.ts"),
        ("Secrets in git", "git ls-files admin_frontend/.env", ".env not tracked", ".env is tracked (holds only VITE_API_BASE_URL and VITE_USE_MOCK_API today)", "Fail", ".env is committed", "admin_frontend/.gitignore"),
        ("Cross-browser", "Playwright projects firefox/webkit", "Run on Firefox and WebKit", "Browsers not installed in container (only Chromium 141)", "Blocked", "", "admin_frontend/qa_tests/playwright.config.ts"),
        ("Lighthouse", "lighthouse on production build", "Scores recorded", "Not run: tool not installed in the container; bundle size and timings measured instead", "Not Run", "", "qa_frontend/performance.csv"),
    ]
    static_rows = []
    for name, cmd, exp, act, status, match, ev in static:
        static_rows.append(dict(id=ids.next("FE-TC"), name=name, cmd=cmd, exp=exp, act=act, status=status, match=match, ev=ev))

    bug_defs = [dict(b) for b in FF.BUGS] + [dict(b, keys=[]) for b in FF.STATIC_BUGS]
    bug_defs.sort(key=lambda b: SEV_ORDER[b["severity"]])
    test_to_bugs = defaultdict(list)
    bug_rows = []
    for b in bug_defs:
        bid = ids.next("FE-BUG")
        b["id"] = bid
        rel = []
        for k in b.get("keys", []):
            if k in key_to_id:
                rel.append(key_to_id[k])
                test_to_bugs[key_to_id[k]].append(bid)
            else:
                PROBLEMS.append(f"frontend bug '{b['title'][:50]}' unknown key {k}")
        for k in b.get("be_keys", []):
            if k in be["key_to_id"]:
                rel.append(be["key_to_id"][k])
            else:
                PROBLEMS.append(f"frontend bug '{b['title'][:50]}' unknown backend key {k}")
        for s in static_rows:
            if s["match"] and s["status"] == "Fail" and (s["match"].lower() in b["title"].lower() or s["match"].lower() in b.get("actual", "").lower()):
                rel.append(s["id"])
                test_to_bugs[s["id"]].append(bid)
        if not rel:
            PROBLEMS.append(f"frontend bug without related test: {b['title']}")
        evs = []
        for r in allrows:
            if r["key"] in b.get("keys", []):
                evs.append(r.get("evidence", ""))
        evidence = b.get("evidence") or "; ".join(dict.fromkeys(e for e in evs if e)) or "N/A"
        bug_rows.append([bid, b["module"], b["title"], b["steps"], b["expected"], b["actual"], b["severity"], b["priority"], "; ".join(dict.fromkeys(rel)) or "N/A", b["file"], b["fix"], evidence, b.get("fixed", "No")])
    bug_by_id = {b["id"]: b for b in bug_defs}

    # a11y axe violations are their own findings; link them to the generic accessibility bug
    a11y_bug = next(b["id"] for b in bug_defs if b["module"] == "Accessibility")
    resp_bug = next(b["id"] for b in bug_defs if b["module"] == "Responsive")
    for r in allrows:
        if r.get("_bucket") == "a11y" and r["status"] == "Fail" and not test_to_bugs.get(r["_id"]):
            test_to_bugs[r["_id"]].append(a11y_bug)
        if r.get("_bucket") == "resp" and r["status"] == "Fail" and not test_to_bugs.get(r["_id"]):
            test_to_bugs[r["_id"]].append(resp_bug)
    for b in bug_rows:
        if b[0] in (a11y_bug, resp_bug):
            linked = [tid for tid, bl in test_to_bugs.items() if b[0] in bl]
            b[8] = "; ".join(dict.fromkeys(linked))

    def bug_ids(tid):
        return "; ".join(dict.fromkeys(test_to_bugs.get(tid, []))) or "N/A"

    def severity_of(tid):
        bl = test_to_bugs.get(tid, [])
        return min((bug_by_id[x]["severity"] for x in bl), key=lambda s: SEV_ORDER[s]) if bl else "N/A"

    for r in allrows:
        if r.get("_id") and r["status"] == "Fail" and not test_to_bugs.get(r["_id"]):
            PROBLEMS.append(f"frontend failing test without bug: {r['key']} ({r['_id']})")

    uc_ids = OrderedDict()
    for u in FF.USE_CASES:
        uc_ids.setdefault(u[0], ids.next("FE-UC"))
    uc_rows = []
    ucid_iter = ids  # reuse ids already allocated
    allocated = list(uc_ids.items())
    used = Counter()
    for u in FF.USE_CASES:
        uid = uc_ids[u[0]] if used[u[0]] == 0 else ids.next("FE-UC")
        used[u[0]] += 1
        uc_rows.append([uid, *u])

    def uc_for(module):
        for m, uid in uc_ids.items():
            if m.lower() in module.lower() or module.lower() in m.lower():
                return uid
        return "N/A"

    func = []
    for r in allrows:
        if r.get("_bucket") != "func":
            continue
        func.append([r["_id"], uc_for(r["module"]), r["module"], r["title"], "Demo workspace seeded; servers running" if r["page"] != "Unit test (Vitest)" else "None", r["steps"], r.get("data") or "N/A", r["expected"], r["actual"], r["status"], bug_ids(r["_id"]), r["evidence"], f"Category: {r['category']}"])
    for s in static_rows:
        func.append([s["id"], "N/A", "Build & Tooling", s["name"], "Repository checkout", s["cmd"], "N/A", s["exp"], s["act"], s["status"], bug_ids(s["id"]), s["ev"], "Static check"])
    write(OUT_FE, "functional_test_cases.csv", ["Test ID", "Use Case ID", "Module", "Title", "Preconditions", "Steps", "Test Data", "Expected Result", "Actual Result", "Status", "Bug ID", "Evidence", "Notes"], func)

    edge = [[r["_id"], r["module"], r["title"], r["steps"], r["expected"], r["actual"], r["status"], severity_of(r["_id"]), bug_ids(r["_id"]), r["evidence"]] for r in allrows if r.get("_bucket") == "edge"]
    write(OUT_FE, "edge_cases.csv", ["Edge Case ID", "Module", "Scenario", "Input/Action", "Expected Behaviour", "Actual Behaviour", "Status", "Severity", "Bug ID", "Evidence"], edge)

    val = []
    for r in allrows:
        if r.get("_bucket") != "val":
            continue
        mod, form, field, rule, inp, match = FE_VALIDATION_META.get(r["key"], (r["module"], r["page"], "N/A", r["title"], r.get("data") or "N/A", "N/A"))
        val.append([r["_id"], mod, form, field, rule, inp, r["expected"], r["actual"], match, r["status"], bug_ids(r["_id"])])
    write(OUT_FE, "form_validation.csv", ["Test ID", "Module", "Form", "Field", "Rule Checked", "Input Used", "Expected Message/Behaviour", "Actual Message/Behaviour", "Matches Backend Rule (Yes/No)", "Status", "Bug ID"], val)

    api = []
    for r in allrows:
        if r.get("_bucket") != "api":
            continue
        page, called, scen = FE_API_META.get(r["key"], (r["page"], "N/A", "success"))
        api.append([r["_id"], page, called, scen, r["expected"], r["actual"], r["status"], bug_ids(r["_id"])])
    write(OUT_FE, "api_integration.csv", ["Test ID", "Page/Component", "API Called", "Scenario (success/error/slow/empty)", "Expected UI Behaviour", "Actual UI Behaviour", "Status", "Bug ID"], api)

    a11y = []
    for r in allrows:
        if r.get("_bucket") != "a11y" or r["status"] != "Fail":
            continue
        ex = r.get("extra", {})
        rule = ex.get("rule")
        if rule:
            who, fix = A11Y_FIX.get(rule, ("Assistive technology users", ex.get("helpUrl", "See axe help")))
            a11y.append([r["_id"], r["page"], f"{r['title']} ({r['actual']})", who, f"{rule}: {ex.get('tags', '')}", fix, SEV_FROM_IMPACT.get(ex.get("impact"), "Low"), f"{r['evidence']} (axe-core 4.10)"])
        else:
            a11y.append([r["_id"], r["page"], f"{r['title']}: {r['actual']}", ex.get("who", "Keyboard users"), ex.get("wcag", "N/A"), r["expected"], severity_of(r["_id"]), r["evidence"]])
    a11y.append([ids.next("FE-A11Y"), "All app pages", "Pages have no <h1>; PageHeader renders <h2>", "Screen reader users navigating by headings", "1.3.1 Info and Relationships / best practice", "Render the page title as <h1>", "Low", "admin_frontend/src/components/shared/page-header.tsx"])
    a11y.append([ids.next("FE-A11Y"), "Layout / Sidebar", "Active menu item shown only by colour (no aria-current)", "Screen reader and colour-blind users", "1.4.1 Use of Color; 4.1.2", "Add aria-current='page' to the active link", "Low", "admin_frontend/src/components/sidebar.tsx"])
    write(OUT_FE, "accessibility.csv", ["A11y ID", "Page/Component", "Issue", "Who Is Affected", "WCAG Rule", "Suggested Fix", "Severity", "Evidence"], a11y)

    resp = []
    for r in allrows:
        if r.get("_bucket") != "resp":
            continue
        ex = r.get("extra", {})
        resp.append([r["_id"], r["page"], f"{ex.get('width', 'N/A')}px", ex.get("browser", "Chromium"), r["actual"] if r["status"] == "Fail" else "None", r["expected"], r["status"], severity_of(r["_id"]) if r["status"] == "Fail" else "N/A", r["evidence"]])
    pages_tested = sorted({r["page"] for r in allrows if r.get("_bucket") == "resp"})
    for p in pages_tested:
        for br in ("Firefox", "WebKit (Safari)"):
            resp.append([ids.next("FE-RESP"), p, "1366px", br, "Not tested", "Same layout as Chromium", "Blocked", "N/A", "Blocked: browser binaries not installed in the QA container (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD). Run QA_ALL_BROWSERS=1 npx playwright test -c qa_tests/playwright.config.ts on a machine with browsers"])
    write(OUT_FE, "responsive_cross_browser.csv", ["Test ID", "Page", "Screen Width", "Browser", "Issue Found", "Expected", "Status", "Severity", "Screenshot"], resp)

    perf = []
    for r in allrows:
        if r.get("_bucket") != "perf":
            continue
        fix = "; ".join(bug_by_id[b]["fix"] for b in dict.fromkeys(test_to_bugs.get(r["_id"], []))) or "None needed"
        perf.append([r["_id"], r["page"], r["title"], r["actual"], r["expected"], "OK" if r["status"] == "Pass" else "Slower than target", fix, "P2" if r["status"] == "Fail" else "P3"])
    build = open(os.path.join(OUT_FE, "evidence", "vite-build.txt"), encoding="utf-8").read()
    for name, raw_kb, gz_kb in re.findall(r"dist/assets/([\w.-]+\.(?:js|css))\s+([\d,.]+) kB\s+│ gzip:\s+([\d,.]+) kB", build):
        size = float(raw_kb.replace(",", ""))
        perf.append([ids.next("FE-PERF"), f"Bundle: {name}", "Production asset size (vite build)", f"{raw_kb} kB ({gz_kb} kB gzip)", "< 500 kB raw / < 170 kB gzip per chunk", "Too large" if size > 500 else "OK", "Code-split routes and lazy-load CKEditor" if size > 500 else "None needed", "P2" if size > 500 else "P3"])
    perf.append([ids.next("FE-PERF"), "Test Manager list", "Re-renders", "Render loop 'Maximum update depth exceeded' while loading", "No render loop", "Wasted CPU and possible frozen tab", "Stable empty array; selection effect only on change", "P1"])
    perf.append([ids.next("FE-PERF"), "Template picker", "Requests", "1 POST /files/download-url per template (16+) on every open, expiresIn 86400", "Batched or cached URLs", "Many requests", "Cache signed URLs; one batch endpoint", "P3"])
    perf.append([ids.next("FE-PERF"), "All pages (Lighthouse)", "Lighthouse score", "Not Run (tool not available in container)", "Performance >= 80", "N/A", "Run Lighthouse in CI on the production build", "P3"])
    write(OUT_FE, "performance.csv", ["Perf ID", "Page/Area", "Metric", "Measured Value", "Target Value", "Problem", "Suggested Fix", "Priority"], perf)

    sims = []
    for r in allrows:
        if r.get("_bucket") != "sim":
            continue
        ex = r.get("extra", {})
        sims.append([r["_id"], ex.get("persona", r["module"]), r["title"], r["actual"], ex.get("well", "N/A"), ex.get("stuck", "N/A") if ex.get("result") != "Completed" else "Nothing", ex.get("result", "N/A"), ex.get("severity", "N/A") if ex.get("result") != "Completed" else "N/A", ex.get("suggestion", "N/A")])
    write(OUT_FE, "user_simulations.csv", ["Simulation ID", "Persona", "Goal", "Steps Taken", "What Went Well", "Where User Got Stuck or Confused", "Result (Completed/Partly/Failed)", "Severity", "Suggestion"], sims)

    sec = []
    for mod, issue, how, risk, fix, sev, keys in FF.SECURITY:
        tids = [key_to_id[k] for k in keys if k in key_to_id]
        sec.append([ids.next("FE-SEC"), mod, issue, f"{how}{' [' + ', '.join(tids) + ']' if tids else ''}", risk, fix, sev])
    write(OUT_FE, "security.csv", ["Security ID", "Module", "Issue", "How It Was Found/Tested", "Risk (in simple words)", "Suggested Fix", "Severity"], sec)
    write(OUT_FE, "ui_design_enhancements.csv", ["Design ID", "Module", "Page/Component", "Current Problem", "Why It Matters to the User", "Suggested Improvement", "Priority", "Effort", "Screenshot"], [[ids.next("FE-DES"), *d] for d in FF.DESIGN])
    write(OUT_FE, "code_optimization.csv", ["Opt ID", "File Path", "Line(s)", "Current Problem", "Why It Matters", "Suggested Change", "Expected Benefit", "Priority", "Effort"], [[ids.next("FE-OPT"), *o] for o in FF.OPT])
    write(OUT_FE, "bugs.csv", ["Bug ID", "Module", "Title", "Steps to Reproduce", "Expected Result", "Actual Result", "Severity", "Priority", "Related Test ID", "File Path (if known)", "Suggested Fix", "Evidence", "Fixed During QA (Yes/No)"], bug_rows)
    write(OUT_FE, "code_changes_log.csv", ["Change ID", "File Path", "What Was Changed", "Why (to run/to test/to unblock)", "Affects Real Behaviour (Yes/No)", "Should Be Kept in Main Code (Yes/No)"], [[ids.next("FE-CHG"), *c] for c in FF.CHANGES])
    write(OUT_FE, "module_inventory.csv", ["Module", "Page/Route", "Main Components", "APIs Used", "User Roles With Access", "Description", "Notes"], [list(m) for m in FF.MODULES])
    write(OUT_FE, "use_cases.csv", ["Use Case ID", "Module", "Actor (Role)", "Goal", "Preconditions", "Main Flow", "Alternate Flows", "Expected Outcome", "Priority"], uc_rows)

    eps = json.load(open(os.path.join(BE_RES, "endpoints.json")))
    fe_map = []
    calls = [
        ("Login (platform)", "POST /super-admin/login"), ("Login (workspace)", "POST /auth/login"), ("Profile menu", "POST /auth/logout"),
        ("Workspace gate", "POST /companies/verify-workspace"), ("Forgot password", "POST /auth/forgot-password"), ("Forgot password", "POST /auth/forgot-password/verify"),
        ("Forgot password", "POST /auth/forgot-password/reset"), ("Workspaces", "GET /workspaces"), ("Companies", "GET /super-admin/companies"),
        ("Companies", "POST /super-admin/companies"), ("Companies", "GET /super-admin/companies/:id"), ("Companies", "PUT /super-admin/companies/:id"),
        ("Companies", "DELETE /super-admin/companies/:id"), ("Dashboard", "GET /dashboard"), ("Test Manager", "GET /tests"), ("Test Manager", "DELETE /tests/:id"),
        ("Test Manager", "POST /tests/import-qti"), ("Test Manager / Wizard", "GET /categories"), ("Test Manager / Wizard", "GET /super-admin/templates"),
        ("Wizard step 1", "GET /instructions"), ("Wizard step 1", "POST /tests"), ("Wizard step 1", "PATCH /tests/:id"), ("Wizard", "GET /tests/:id"),
        ("Wizard step 2", "GET /test-settings/test/:testId"), ("Wizard step 2", "POST /test-settings"), ("Wizard step 2", "PATCH /test-settings/:id"),
        ("Wizard step 3", "GET /questions"), ("Wizard step 3", "GET /questions/:id"), ("Wizard step 3", "POST /questions"), ("Wizard step 3", "PATCH /questions/:id"),
        ("Wizard step 3", "GET /subjects"), ("Wizard step 3", "GET /topics"), ("Wizard step 3", "GET /difficulties"), ("Wizard step 3", "GET /languages"),
        ("Rich text editor / template picker", "POST /files/upload"), ("Rich text editor / template picker", "POST /files/download-url"),
    ]
    be_lookup = {re.sub(r":[A-Za-z]+", ":x", f"{e['method']} {e['path'].replace('/api/v1', '')}"): e for e in eps["endpoints"]}
    be_ids = {}
    k = 0
    for e in eps["endpoints"]:
        k += 1
        be_ids[e["apiId"]] = f"BE-API-{k:03d}"
    for page, call in calls:
        e = be_lookup.get(re.sub(r":[A-Za-z]+", ":x", call))
        fe_map.append([page, call, "Yes" if e else "No", be_ids[e["apiId"]] if e else "N/A", "Works" if e else "Missing in backend: returns 404"])
    write(OUT_FE, "frontend_backend_map.csv", ["Page/Component", "Endpoint Called", "Exists In Backend (Yes/No)", "Backend API ID", "Notes"], fe_map)

    # summary
    def grp(b):
        return [(r["_id"], r["status"]) for r in allrows if r.get("_bucket") == b]

    def counts(rr):
        st = Counter(s for _, s in rr)
        bugs = set()
        for tid, _ in rr:
            bugs.update(test_to_bugs.get(tid, []))
        return st, Counter(bug_by_id[b]["severity"] for b in bugs)

    summary = []
    a11y_pages = [r for r in allrows if r.get("_bucket") == "a11y-summary"]
    for name, rr, take in [
        ("Functional (e2e + unit + static)", grp("func") + [(s["id"], s["status"]) for s in static_rows], "Core flows break: company created from UI is unreachable; create-test fails with empty optional fields"),
        ("Form validation", grp("val"), "Frontend and backend rules differ in 7 places"),
        ("Edge cases", grp("edge"), "Refresh loses data; double click and redirect handled"),
        ("API integration and states", grp("api"), "Three pages call APIs that do not exist; error states lack Retry"),
        ("Accessibility (axe + keyboard)", grp("a11y"), f"{len(a11y_pages)} pages scanned with axe; icon buttons and contrast are the main issues"),
        ("Responsive (Chromium)", grp("resp"), "Desktop OK; 360/768 px layouts squeeze content behind a fixed sidebar"),
        ("Performance", grp("perf"), "Test list waits for 50 requests; 1.2 MB main bundle"),
        ("User simulations", grp("sim"), "New admin, power admin and mobile users get stuck"),
    ]:
        st, sev = counts(rr)
        summary.append([name, len(rr), st["Pass"], st["Fail"], st["Blocked"], st["Not Run"], sev["Critical"], sev["High"], sev["Medium"], sev["Low"], take])
    blocked_cb = sum(1 for r in resp if r[6] == "Blocked")
    summary.append(["Cross-browser (Firefox/WebKit)", blocked_cb, 0, 0, blocked_cb, 0, 0, 0, 0, 0, "Blocked: only Chromium installed in the QA container"])
    all_tests = [(r["_id"], r["status"]) for r in allrows if r.get("_id")] + [(s["id"], s["status"]) for s in static_rows]
    st = Counter(s for _, s in all_tests)
    st["Blocked"] += blocked_cb
    sev_all = Counter(b["severity"] for b in bug_defs)
    summary.append(["ALL TESTS", len(all_tests) + blocked_cb, st["Pass"], st["Fail"], st["Blocked"], st["Not Run"], sev_all["Critical"], sev_all["High"], sev_all["Medium"], sev_all["Low"], f"{len(bug_defs)} bugs in bugs.csv; fix Critical/High first"])
    write(OUT_FE, "00_summary.csv", ["Category", "Total", "Passed", "Failed", "Blocked", "Not Run", "Critical Bugs", "High Bugs", "Medium Bugs", "Low Bugs", "Key Takeaway"], summary)
    return dict(total=len(all_tests) + blocked_cb, status=st, bugs=sev_all, nbugs=len(bug_defs), bug_defs=bug_defs, a11y_pages=len(a11y_pages))


BE_INDEX = [
    ("00_summary.csv", "Totals per test category: passed, failed, blocked, not run, bugs by severity."),
    ("module_inventory.csv", "Every backend module with its main files, tables and endpoints."),
    ("api_inventory.csv", "Every API endpoint (method, path, auth, roles, body, response, used by frontend)."),
    ("use_cases.csv", "What each role (super admin, admin, centre user, candidate) does with the API."),
    ("api_test_cases.csv", "Functional API tests, role-matrix happy paths, not-found and bad-id checks with real status codes."),
    ("edge_cases.csv", "Odd inputs and situations: long text, unicode, overflow, invalid dates, concurrency, boundaries."),
    ("validation.csv", "Field rules checked per endpoint (required, type, length, enum, format)."),
    ("auth_permissions.csv", "Every endpoint called with no login, wrong role, other-tenant ids and the right role."),
    ("security.csv", "Security findings (auth, IDOR, injection, CORS, rate limits, secrets, files) with risk and fix."),
    ("database_integrity.csv", "Data integrity problems: missing constraints, orphan rows, deletes of in-use data, timezones."),
    ("error_handling_logging.csv", "How errors are returned and logged; whether internal details leak."),
    ("performance_load.csv", "Load test results (autocannon, 10 connections) and slow query patterns."),
    ("business_flow_simulations.csv", "End-to-end persona flows run as API call sequences."),
    ("dependency_audit.csv", "npm packages with known vulnerabilities or far behind the latest version."),
    ("code_optimization.csv", "Code review findings with a concrete suggested change."),
    ("bugs.csv", "All backend bugs with steps, expected/actual, severity, related test ids and fix."),
    ("code_changes_log.csv", "Every file changed or added during QA and why."),
    ("static_checks.csv", "Extra: install, build, type check, lint, audit, migrations, CI config checks that were executed."),
    ("evidence/", "Extra: raw output of eslint, tsc, npm audit, npm outdated and the project's own test command."),
]
FE_INDEX = [
    ("00_summary.csv", "Totals per test category: passed, failed, blocked, not run, bugs by severity."),
    ("module_inventory.csv", "Every page/route with its components, APIs used and roles."),
    ("use_cases.csv", "What each role does in the admin UI."),
    ("functional_test_cases.csv", "Browser (Playwright) and unit (Vitest) tests of real user flows."),
    ("edge_cases.csv", "Odd inputs and situations: double clicks, bad URLs, refresh, back button, XSS strings, huge lists."),
    ("form_validation.csv", "Form rules in the UI compared with the backend rules."),
    ("user_simulations.csv", "Persona walk-throughs (new admin, power admin, keyboard user, mobile user, attacker and more)."),
    ("ui_design_enhancements.csv", "UX and visual design improvements with priority and effort."),
    ("responsive_cross_browser.csv", "Pages at 360/768/1366/1920 px in Chromium; Firefox/WebKit rows are Blocked."),
    ("accessibility.csv", "axe-core violations, keyboard and screen reader findings per page."),
    ("performance.csv", "Bundle size, load times, request counts and slow-network behaviour."),
    ("security.csv", "Frontend security findings (token storage, redirects, XSS, secrets, transport)."),
    ("api_integration.csv", "How each page behaves on API success, error, slow, empty, offline and 401."),
    ("code_optimization.csv", "Code review findings with a concrete suggested change."),
    ("bugs.csv", "All frontend bugs with steps, expected/actual, severity, related test ids and fix."),
    ("code_changes_log.csv", "Every file changed or added during QA and why."),
    ("frontend_backend_map.csv", "Extra: every API the frontend calls and whether the backend has it."),
    ("screenshots/", "Extra: screenshots referenced from the CSVs."),
    ("evidence/", "Extra: raw output of oxlint, tsc, vite build, prettier, npm audit and npm outdated."),
]


def write_readme(folder, title, index, res, run_cmds, extra):
    st, sev = res["status"], res["bugs"]
    top = sorted(res["bug_defs"], key=lambda b: SEV_ORDER[b["severity"]])[:10]
    lines = [f"# {title}", "", "All CSVs are UTF-8, one row per finding, `N/A` for empty cells. They are generated by",
             "`python3 qa_tools/generate_csvs.py` from real test results, so numbers here match the files.", "",
             "## Overall numbers", "",
             "| Total tests | Passed | Failed | Blocked | Not Run |", "|---|---|---|---|---|",
             f"| {res['total']} | {st.get('Pass', 0)} | {st.get('Fail', 0)} | {st.get('Blocked', 0)} | {st.get('Not Run', 0)} |", "",
             f"Bugs: **{res['nbugs']}** in total. Critical **{sev.get('Critical', 0)}**, High **{sev.get('High', 0)}**, Medium **{sev.get('Medium', 0)}**, Low **{sev.get('Low', 0)}**.", ""]
    lines += extra + ["", "## File index", ""]
    lines += [f"- `{n}`: {d}" for n, d in index]
    lines += ["", "## Most serious bugs", ""]
    lines += [f"{i}. {b['id']} ({b['severity']}): {b['title']}" for i, b in enumerate(top, 1)]
    lines += ["", "## Re-run", "", "```bash", *run_cmds, "```", ""]
    open(os.path.join(folder, "README.md"), "w", encoding="utf-8").write("\n".join(lines))


def validate(folder):
    bad = []
    for path in sorted(glob.glob(os.path.join(folder, "*.csv"))):
        with open(path, encoding="utf-8", newline="") as fh:
            rows = list(csv.reader(fh))
        width = len(rows[0])
        for i, r in enumerate(rows[1:], start=2):
            if len(r) != width:
                bad.append(f"{os.path.basename(path)} line {i}: {len(r)} cells")
            if any(c.strip() == "" for c in r):
                bad.append(f"{os.path.basename(path)} line {i}: empty cell")
            if any("\n" in c for c in r):
                bad.append(f"{os.path.basename(path)} line {i}: line break in cell")
    return bad


if __name__ == "__main__":
    be = backend()
    fe = frontend(be)
    issues = validate(OUT_BE) + validate(OUT_FE)
    json.dump({"backend": {"total": be["total"], "status": be["status"], "bugs": be["bugs"], "nbugs": be["nbugs"]},
               "frontend": {"total": fe["total"], "status": fe["status"], "bugs": fe["bugs"], "nbugs": fe["nbugs"], "a11yPages": fe["a11y_pages"]}},
              open(os.path.join(HERE, "summary.json"), "w"), indent=1)
    write_readme(OUT_BE, "Backend QA results (admin_backend)", BE_INDEX, be, [
        "cd admin_backend",
        "# Postgres 16 + Redis 7 running; cp .env.example.qa .env; npm ci && npm run build && npm run seed:super-admin",
        "LOGIN_THROTTLE_LIMIT=500 PORT=3000 node dist/main.js &",
        "LOGIN_THROTTLE_LIMIT=10 PORT=3001 node dist/main.js &",
        "QA_THROTTLE_URL=http://localhost:3001 ./qa_tests/run-all.sh   # one command: all specs + seed + load",
        "cd .. && python3 qa_tools/generate_csvs.py                     # rebuild CSVs and READMEs",
    ], ["Tests are black-box API calls (Jest + Supertest) against a running server: 161 endpoints, every role,",
        "two isolated tenants, plus a seeded demo workspace (1,200 candidates, 1,100 tests, 35+ companies) for load.",
        "Blocked = could not run here (S3 disabled in the QA environment). Details: `admin_backend/qa_tests/README.md`."])
    write_readme(OUT_FE, "Frontend QA results (admin_frontend)", FE_INDEX, fe, [
        "cd admin_frontend",
        "# backend running on :3000 with the demo seed (see qa_backend/README.md)",
        "QA_API_PROXY_TARGET=http://localhost:3000 npx vite --port 5173 --host localhost --strictPort &",
        "./qa_tests/run-e2e.sh                       # one command: Vitest unit tests + Playwright e2e",
        "cd .. && python3 qa_tools/generate_csvs.py  # rebuild CSVs and READMEs",
    ], ["Tests are Vitest unit/component tests and Playwright browser tests (Chromium 141) against the real",
        f"backend, plus axe-core scans of {fe['a11y_pages']} pages. Firefox/WebKit rows are Blocked (browsers not installed);",
        "Lighthouse is Not Run (not installed). Bug counts include static findings (lint, audit, config)."])
    print("backend", be["total"], dict(be["status"]), dict(be["bugs"]))
    print("frontend", fe["total"], dict(fe["status"]), dict(fe["bugs"]))
    for p in PROBLEMS + issues:
        print("PROBLEM:", p)
    sys.exit(1 if (PROBLEMS or issues) else 0)
