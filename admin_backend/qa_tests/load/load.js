/**
 * Moderate load test (10 connections, 10 s per endpoint) with autocannon.
 * Needs the demo seed (qa_tests/seed/seed-large.ts) and fixtures (.fixtures.json).
 * Run: node qa_tests/load/load.js   -> writes qa_tests/results/load.json
 */
const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

const BASE = process.env.QA_BASE_URL || 'http://localhost:3000';
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.fixtures.json'), 'utf8'));

async function json(method, url, body, token) {
  const r = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

function run(name, opts) {
  return new Promise((resolve) => {
    autocannon({ url: BASE + opts.path, connections: 10, duration: 10, method: opts.method || 'GET', headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined }, (err, res) => {
      const total = res.requests.total || 1;
      const errors = res.errors + res.timeouts + (res.non2xx || 0);
      resolve({ name, endpoint: `${opts.method || 'GET'} ${opts.path.split('?')[0]}`, query: opts.path.includes('?') ? opts.path.split('?')[1] : '', load: '10 connections x 10 s', requests: res.requests.total, avgMs: res.latency.average, p99Ms: res.latency.p99, maxMs: res.latency.max, rps: res.requests.average, errorRate: +(100 * errors / total).toFixed(2), non2xx: res.non2xx || 0 });
    });
  });
}

(async () => {
  const ws = await json('POST', '/api/v1/companies/verify-workspace', { workspaceUrl: 'http://localhost:5173/w/qa-demo' });
  const login = await json('POST', '/api/v1/auth/login', { companyToken: ws.data.companyToken, email: 'admin@qa-demo.test', password: 'DemoAdmin@123' });
  const t = login.data.accessToken;
  const sa = (await json('POST', '/api/v1/super-admin/login', { email: 'superadmin@qa.test', password: 'SuperQa@12345' })).data.accessToken;
  // fresh candidate token (fixture one may be logged out)
  const cand = await json('POST', '/api/v1/candidates/login', { companyToken: fx.A.companyToken, enrollmentNumber: fx.A.candidateEnrollment, password: fx.A.candidatePassword, centreCode: fx.A.centreCode });
  const ct = cand.data && cand.data.accessToken;
  const results = [];
  results.push(await run('health', { path: '/api/v1/health' }));
  results.push(await run('tests list page 1 (cached)', { path: '/api/v1/tests?page=1&limit=20', token: t }));
  results.push(await run('tests list limit 200 (cached)', { path: '/api/v1/tests?page=1&limit=200', token: t }));
  results.push(await run('tests search by name (no cache)', { path: '/api/v1/tests?name=Mock%20Test%2010&limit=20', token: t }));
  results.push(await run('candidates list limit 200 (cached)', { path: '/api/v1/candidates?limit=200', token: t }));
  results.push(await run('candidates search by name (no cache)', { path: '/api/v1/candidates?name=Candidate%201&limit=50', token: t }));
  results.push(await run('candidates last page', { path: '/api/v1/candidates?page=60&limit=20&isActive=true', token: t }));
  results.push(await run('companies list (super admin)', { path: '/api/v1/super-admin/companies?limit=50', token: sa }));
  results.push(await run('verify workspace (public)', { path: '/api/v1/companies/verify-workspace', method: 'POST', body: { workspaceUrl: 'http://localhost:5173/w/qa-demo' } }));
  if (ct) results.push(await run('candidate exam paper', { path: `/api/v1/candidates/tests/${fx.A.testId}/questions`, token: ct }));
  fs.writeFileSync(path.join(__dirname, '..', 'results', 'load.json'), JSON.stringify(results, null, 1));
  console.table(results.map((r) => ({ name: r.name, req: r.requests, avg: r.avgMs, p99: r.p99Ms, max: r.maxMs, err: r.errorRate })));
})();
