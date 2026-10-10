/** Login, tokens, logout, lockout, session revocation and token tampering. */
import * as jwt from 'jsonwebtoken';
import { call } from '../helpers/http';
import { check, flush } from '../helpers/recorder';
import { candidateBody, companyBody, loadFixtures, must, SUPER_ADMIN } from '../helpers/fixtures';

const f = loadFixtures();
const EV = 'qa_tests/specs/02-auth.qa.spec.ts';
const JWT_SECRET = process.env.QA_JWT_SECRET ?? 'qa-dummy-access-secret-0001';
const DEFAULT_ADMIN_PASSWORD = process.env.QA_DEFAULT_ADMIN_PASSWORD ?? 'QaDefault@123';
afterAll(() => flush('02-auth'));

const loginBody = (over: Record<string, unknown> = {}) => ({
  companyToken: f.A.companyToken,
  email: f.A.adminEmail,
  password: f.A.adminPassword,
  ...over,
});

async function freshAdmin(slug: string, password = 'Fresh@12345') {
  const email = `fresh.${slug}.${Date.now()}@qa.test`;
  const admin = await must('create admin', call('post', '/admins', {
    token: f.superAdminToken,
    body: { companyId: f.A.companyId, firstName: 'Fresh', lastName: slug, role: 'admin', email, password },
  }));
  return { id: admin.id as string, email, password };
}

describe('Company admin login', () => {
  it('valid credentials', async () => {
    const { pass } = await check({
      key: 'auth.login.ok', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Valid company token, email and password',
      request: { email: f.A.adminEmail, password: '***', companyToken: '<A>' }, expectStatus: 200, expected: '200 with access and refresh token',
      run: () => call('post', '/auth/login', { body: loginBody() }),
      verify: (r) => Boolean(r.body.data.accessToken && r.body.data.refreshToken && !JSON.stringify(r.body).includes('passwordHash')),
      evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('email is case-insensitive and trimmed', async () => {
    const { pass } = await check({
      key: 'auth.login.case', category: 'edge', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Email in upper case with spaces',
      request: { email: `  ${f.A.adminEmail.toUpperCase()}  ` }, expectStatus: 200, expected: '200 login works',
      run: () => call('post', '/auth/login', { body: loginBody({ email: `  ${f.A.adminEmail.toUpperCase()}  ` }) }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('wrong password', async () => {
    const u = await freshAdmin('wrongpw');
    const { pass } = await check({
      key: 'auth.login.wrong-password', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Correct email, wrong password',
      request: { email: u.email, password: 'Wrong@12345' }, expectStatus: 401, expected: '401 Invalid email or password',
      run: () => call('post', '/auth/login', { body: loginBody({ email: u.email, password: 'Wrong@12345' }) }),
      verify: (r) => r.body.message === 'Invalid email or password', evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('unknown email gets the same message as wrong password', async () => {
    const { pass } = await check({
      key: 'auth.login.unknown-email', category: 'security', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Email that does not exist',
      request: { email: 'nobody@qa.test' }, expectStatus: 401, expected: '401 same generic message (no user enumeration)',
      run: () => call('post', '/auth/login', { body: loginBody({ email: `nobody.${Date.now()}@qa.test`, password: 'Whatever@123' }) }),
      verify: (r) => r.body.message === 'Invalid email or password', evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('admin of company A cannot log in through company B workspace', async () => {
    const { pass } = await check({
      key: 'auth.login.wrong-tenant', category: 'security', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Company A admin uses company B token',
      expectStatus: 401, expected: '401 Invalid email or password',
      run: () => call('post', '/auth/login', { body: loginBody({ companyToken: f.B.companyToken }) }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('super admin cannot log in through a company workspace', async () => {
    const { pass } = await check({
      key: 'auth.login.super-via-company', category: 'security', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Super admin credentials on company login',
      expectStatus: 401, expected: '401 rejected',
      run: () => call('post', '/auth/login', { body: loginBody({ email: SUPER_ADMIN.email, password: SUPER_ADMIN.password }) }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('tampered company token', async () => {
    const forged = jwt.sign({ sub: f.A.companyId, type: 'company' }, 'not-the-secret');
    const { pass } = await check({
      key: 'auth.login.forged-company-token', category: 'security', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Company token signed with a wrong secret',
      expectStatus: 401, expected: '401 Invalid or expired company token',
      run: () => call('post', '/auth/login', { body: loginBody({ companyToken: forged }) }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('password shorter than 8 is rejected before lookup', async () => {
    const { pass } = await check({
      key: 'auth.login.short-password', category: 'validation', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Password with 3 characters',
      expectStatus: 400, expected: '400 password must be longer than or equal to 8 characters',
      run: () => call('post', '/auth/login', { body: loginBody({ password: 'abc' }) }), evidence: EV, field: 'password', rule: 'MinLength 8',
    });
    expect(pass).toBe(true);
  });

  it('inactive account reveals that the password was right', async () => {
    const u = await freshAdmin('inactive');
    await must('deactivate', call('put', `/admins/${u.id}`, { token: f.superAdminToken, body: { isActive: false } }));
    const wrong = await call('post', '/auth/login', { body: loginBody({ email: u.email, password: 'Wrong@99999' }) });
    const { pass } = await check({
      key: 'auth.login.inactive-enumeration', category: 'security', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Inactive account with the correct password',
      expectStatus: 401, expected: '401 with the same generic message as a wrong password',
      run: () => call('post', '/auth/login', { body: loginBody({ email: u.email, password: u.password }) }),
      verify: (r) => r.body.message === wrong.body.message, evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('company admin created without password gets the shared default password', async () => {
    const slug = `def${Date.now().toString(36)}`;
    const email = `admin.${slug}@qa.test`;
    const company = await must('company', call('post', '/super-admin/companies', { token: f.superAdminToken, body: companyBody(slug, email) }));
    const verify = await must('verify', call('post', '/companies/verify-workspace', { body: { workspaceUrl: company.workspaceUrl } }));
    const { pass } = await check({
      key: 'auth.default-password', category: 'security', module: 'Companies', endpoint: 'POST /api/v1/auth/login', scenario: 'Log in a new company admin with DEFAULT_ADMIN_PASSWORD from .env',
      request: 'Company created from the UI form (no adminPassword field)', expectStatus: [401, 403], expected: 'Shared default password must not work; admin should set a password via invite link',
      run: () => call('post', '/auth/login', { body: { companyToken: verify.companyToken, email, password: DEFAULT_ADMIN_PASSWORD } }), evidence: EV,
    });
    expect(pass).toBe(true);
  });
});

describe('Tokens and sessions', () => {
  it('me returns profile without secrets', async () => {
    const { pass } = await check({
      key: 'auth.me.ok', module: 'Auth', endpoint: 'GET /api/v1/auth/me', scenario: 'Valid access token',
      expectStatus: 200, expected: '200 profile, no password or token hash',
      run: () => call('get', '/auth/me', { token: f.A.adminToken }),
      verify: (r) => r.body.data.id === f.A.adminId && !/password|refreshToken/i.test(JSON.stringify(r.body.data)), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('refresh rotates tokens and old refresh token stops working', async () => {
    const u = await freshAdmin('refresh');
    const s = await must('login', call('post', '/auth/login', { body: loginBody({ email: u.email, password: u.password }) }));
    const first = await check({
      key: 'auth.refresh.ok', module: 'Auth', endpoint: 'POST /api/v1/auth/refresh', scenario: 'Valid refresh token',
      expectStatus: [200, 201], expected: '200 new token pair',
      run: () => call('post', '/auth/refresh', { body: { refreshToken: s.refreshToken } }), evidence: EV,
    });
    const { pass } = await check({
      key: 'auth.refresh.reuse', category: 'security', module: 'Auth', endpoint: 'POST /api/v1/auth/refresh', scenario: 'Reuse the old refresh token after rotation',
      expectStatus: 401, expected: '401 Invalid refresh token',
      run: () => call('post', '/auth/refresh', { body: { refreshToken: s.refreshToken } }), evidence: EV,
    });
    expect(first.pass && pass).toBe(true);
  });

  it('refresh returns 201 while login returns 200', async () => {
    const u = await freshAdmin('refreshcode');
    const s = await must('login', call('post', '/auth/login', { body: loginBody({ email: u.email, password: u.password }) }));
    const { pass } = await check({
      key: 'auth.refresh.status-code', category: 'error', module: 'Auth', endpoint: 'POST /api/v1/auth/refresh', scenario: 'Status code consistency with candidate/centre refresh (200)',
      expectStatus: 200, expected: '200 like the other refresh endpoints',
      run: () => call('post', '/auth/refresh', { body: { refreshToken: s.refreshToken } }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('second login on another device logs the first device out of refresh', async () => {
    const u = await freshAdmin('twodevices');
    const d1 = await must('login 1', call('post', '/auth/login', { body: loginBody({ email: u.email, password: u.password }) }));
    await must('login 2', call('post', '/auth/login', { body: loginBody({ email: u.email, password: u.password }) }));
    const { pass } = await check({
      key: 'auth.refresh.single-session', category: 'edge', module: 'Auth', endpoint: 'POST /api/v1/auth/refresh', scenario: 'Admin logs in on laptop then on phone, laptop refreshes',
      expectStatus: [200, 201], expected: 'Each device keeps its own refresh token',
      run: () => call('post', '/auth/refresh', { body: { refreshToken: d1.refreshToken } }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('logout revokes access and refresh tokens', async () => {
    const u = await freshAdmin('logout');
    const s = await must('login', call('post', '/auth/login', { body: loginBody({ email: u.email, password: u.password }) }));
    await check({
      key: 'auth.logout.ok', module: 'Auth', endpoint: 'POST /api/v1/auth/logout', scenario: 'Logout with valid token',
      expectStatus: 200, expected: '200 Logged out successfully',
      run: () => call('post', '/auth/logout', { token: s.accessToken }), evidence: EV,
    });
    const a = await check({
      key: 'auth.logout.access-revoked', category: 'security', module: 'Auth', endpoint: 'GET /api/v1/auth/me', scenario: 'Use access token after logout',
      expectStatus: 401, expected: '401 Please sign in to continue',
      run: () => call('get', '/auth/me', { token: s.accessToken }), evidence: EV,
    });
    const b = await check({
      key: 'auth.logout.refresh-revoked', category: 'security', module: 'Auth', endpoint: 'POST /api/v1/auth/refresh', scenario: 'Use refresh token after logout',
      expectStatus: 401, expected: '401 Invalid refresh token',
      run: () => call('post', '/auth/refresh', { body: { refreshToken: s.refreshToken } }), evidence: EV,
    });
    expect(a.pass && b.pass).toBe(true);
  });

  it('password change by super admin does not end existing sessions', async () => {
    const u = await freshAdmin('pwchange');
    const s = await must('login', call('post', '/auth/login', { body: loginBody({ email: u.email, password: u.password }) }));
    await must('change pw', call('put', `/admins/${u.id}`, { token: f.superAdminToken, body: { password: 'Changed@12345' } }));
    const { pass } = await check({
      key: 'auth.password-change.sessions', category: 'security', module: 'Admins', endpoint: 'GET /api/v1/auth/me', scenario: 'Old access token after the password was reset',
      expectStatus: 401, expected: '401 old sessions end after a password reset',
      run: () => call('get', '/auth/me', { token: s.accessToken }), evidence: EV,
    });
    const r = await check({
      key: 'auth.password-change.refresh', category: 'security', module: 'Admins', endpoint: 'POST /api/v1/auth/refresh', scenario: 'Old refresh token after the password was reset',
      expectStatus: 401, expected: '401 refresh token revoked',
      run: () => call('post', '/auth/refresh', { body: { refreshToken: s.refreshToken } }), evidence: EV,
    });
    expect(pass && r.pass).toBe(true);
  });

  it('deactivated admin is blocked immediately', async () => {
    const u = await freshAdmin('deact');
    const s = await must('login', call('post', '/auth/login', { body: loginBody({ email: u.email, password: u.password }) }));
    await must('deactivate', call('put', `/admins/${u.id}`, { token: f.superAdminToken, body: { isActive: false } }));
    const { pass } = await check({
      key: 'auth.deactivated.blocked', category: 'security', module: 'Admins', endpoint: 'GET /api/v1/tests', scenario: 'Access token of an admin that was just deactivated',
      expectStatus: 401, expected: '401 Invalid access token',
      run: () => call('get', '/tests', { token: s.accessToken }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('expired access token', async () => {
    const token = jwt.sign({ sub: f.A.adminId, email: f.A.adminEmail, role: 'admin', companyId: f.A.companyId, isSuperAdmin: false, tv: 0, exp: Math.floor(Date.now() / 1000) - 60 }, JWT_SECRET);
    const { pass } = await check({
      key: 'auth.token.expired', category: 'security', module: 'Auth', endpoint: 'GET /api/v1/auth/me', scenario: 'Token expired one minute ago',
      expectStatus: 401, expected: '401 Invalid or expired access token',
      run: () => call('get', '/auth/me', { token }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('alg none token', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: f.superAdminId, role: 'super_admin', companyId: null, isSuperAdmin: true, tv: 0 })).toString('base64url');
    const { pass } = await check({
      key: 'auth.token.alg-none', category: 'security', module: 'Auth', endpoint: 'GET /api/v1/admins', scenario: 'Unsigned JWT (alg none) claiming super admin',
      expectStatus: 401, expected: '401 rejected',
      run: () => call('get', '/admins', { token: `${header}.${payload}.` }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('role claim in token cannot escalate privileges', async () => {
    const decoded = jwt.decode(f.A.adminToken) as Record<string, unknown>;
    const { iat: _iat, exp: _exp, ...claims } = decoded;
    const forged = jwt.sign({ ...claims, role: 'super_admin', isSuperAdmin: true }, 'guess-secret');
    const { pass } = await check({
      key: 'auth.token.escalation', category: 'security', module: 'Auth', endpoint: 'GET /api/v1/admins', scenario: 'Company admin edits the role claim in the token',
      expectStatus: 401, expected: '401 signature check fails',
      run: () => call('get', '/admins', { token: forged }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('candidate access token is not accepted on admin APIs even if secrets are equal', async () => {
    const { pass } = await check({
      key: 'auth.token.cross-type', category: 'security', module: 'Auth', endpoint: 'GET /api/v1/auth/me', scenario: 'Candidate token sent to admin endpoint',
      expectStatus: 401, expected: '401',
      run: () => call('get', '/auth/me', { token: f.A.candidateToken }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('Bearer scheme is case-sensitive', async () => {
    const { pass } = await check({
      key: 'auth.token.scheme-case', category: 'edge', module: 'Auth', endpoint: 'GET /api/v1/auth/me', scenario: 'Header "bearer <token>" in lower case',
      expectStatus: 200, expected: '200 (RFC 7235: auth scheme is case-insensitive)',
      run: () => call('get', '/auth/me', { headers: { Authorization: `bearer ${f.A.adminToken}` } }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('super admin on tenant endpoint gets a confusing 401', async () => {
    const { pass } = await check({
      key: 'auth.super-on-tenant', category: 'error', module: 'Auth', endpoint: 'GET /api/v1/tests', scenario: 'Super admin calls a company-only endpoint',
      expectStatus: 403, expected: '403 You do not have access (not "Please sign in again")',
      run: () => call('get', '/tests', { token: f.superAdminToken }), evidence: EV, role: 'Super admin',
    });
    expect(pass).toBe(true);
  });
});

describe('Lockout', () => {
  it('5 failed logins lock the account, and an attacker can lock out a real user', async () => {
    const u = await freshAdmin('lockout');
    for (let i = 0; i < 5; i += 1) {
      await call('post', '/auth/login', { body: loginBody({ email: u.email, password: `Wrong@${i}xxxx` }) });
    }
    const locked = await check({
      key: 'auth.lockout.triggers', category: 'security', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: '6th attempt after 5 wrong passwords',
      expectStatus: 429, expected: '429 Too many failed login attempts',
      run: () => call('post', '/auth/login', { body: loginBody({ email: u.email, password: 'Wrong@xxxx9' }) }), evidence: EV,
    });
    const { pass } = await check({
      key: 'auth.lockout.dos', category: 'security', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Real user with the right password after an attacker used 5 wrong passwords',
      expectStatus: 200, expected: 'Real user can still log in (lock by IP + account, or CAPTCHA), not a 15 minute lockout',
      run: () => call('post', '/auth/login', { body: loginBody({ email: u.email, password: u.password }) }), evidence: EV,
    });
    expect(locked.pass && pass).toBe(true);
  });

  it('lockout key ignores the company, so the same email is locked in every workspace', async () => {
    // same email exists as admin in company A and as centre user? use super-admin scope separation check instead
    const email = `shared.${Date.now()}@qa.test`;
    await must('A admin', call('post', '/admins', { token: f.superAdminToken, body: { companyId: f.A.companyId, firstName: 'S', lastName: 'A', role: 'admin', email, password: 'Shared@12345' } }));
    await must('B admin', call('post', '/admins', { token: f.superAdminToken, body: { companyId: f.B.companyId, firstName: 'S', lastName: 'B', role: 'admin', email, password: 'Shared@12345' } }));
    for (let i = 0; i < 5; i += 1) {
      await call('post', '/auth/login', { body: { companyToken: f.A.companyToken, email, password: `Wrong@${i}yyyy` } });
    }
    const { pass } = await check({
      key: 'auth.lockout.cross-tenant', category: 'security', module: 'Auth', endpoint: 'POST /api/v1/auth/login', scenario: 'Same email is admin in company A and B. A is locked. Log in to B.',
      expectStatus: 200, expected: '200 company B login is not affected by failures in company A',
      run: () => call('post', '/auth/login', { body: { companyToken: f.B.companyToken, email, password: 'Shared@12345' } }), evidence: EV,
    });
    expect(pass).toBe(true);
  });

  it('candidate lockout uses enrollment number without company', async () => {
    const enr = `SHARED-${Date.now()}`;
    await must('cand A', call('post', '/candidates', { token: f.A.adminToken, body: candidateBody(`sa.${enr}@qa.test`, enr, f.A.groupId, 'Cand@12345') }));
    const cb = await must('cand B', call('post', '/candidates', { token: f.B.adminToken, body: candidateBody(`sb.${enr}@qa.test`, enr, f.B.groupId, 'Cand@12345') }));
    await must('map B', call('post', '/candidate-centre-mappings', { token: f.B.adminToken, body: { candidateId: cb.id, centreId: f.B.centreId, examDate: new Date().toISOString().slice(0, 10) } }));
    for (let i = 0; i < 5; i += 1) {
      await call('post', '/candidates/login', { body: { companyToken: f.A.companyToken, enrollmentNumber: enr, password: `Wrong@${i}zzzz`, centreCode: f.A.centreCode } });
    }
    const { pass } = await check({
      key: 'auth.candidate-lockout.cross-tenant', category: 'security', module: 'Candidate Auth', endpoint: 'POST /api/v1/candidates/login', scenario: 'Enrollment number reused in company B after failures in company A',
      expectStatus: 200, expected: '200 company B candidate can log in',
      run: () => call('post', '/candidates/login', { body: { companyToken: f.B.companyToken, enrollmentNumber: enr, password: 'Cand@12345', centreCode: f.B.centreCode } }), evidence: EV,
    });
    expect(pass).toBe(true);
  });
});

describe('Super admin login', () => {
  it('valid', async () => {
    const { pass } = await check({
      key: 'sa.login.ok', module: 'Super-Admin', endpoint: 'POST /api/v1/super-admin/login', scenario: 'Valid super admin credentials',
      expectStatus: 200, expected: '200 tokens with role super_admin',
      run: () => call('post', '/super-admin/login', { body: SUPER_ADMIN }), verify: (r) => r.body.data.admin.role === 'super_admin', evidence: EV,
    });
    expect(pass).toBe(true);
  });
  it('company admin cannot use super admin login', async () => {
    const { pass } = await check({
      key: 'sa.login.company-admin', category: 'security', module: 'Super-Admin', endpoint: 'POST /api/v1/super-admin/login', scenario: 'Company admin credentials on super admin login',
      expectStatus: 401, expected: '401 Invalid email or password',
      run: () => call('post', '/super-admin/login', { body: { email: f.A.adminEmail, password: f.A.adminPassword } }), evidence: EV,
    });
    expect(pass).toBe(true);
  });
  it('wrong password', async () => {
    const { pass } = await check({
      key: 'sa.login.wrong', module: 'Super-Admin', endpoint: 'POST /api/v1/super-admin/login', scenario: 'Wrong password',
      expectStatus: 401, expected: '401 Invalid email or password',
      run: () => call('post', '/super-admin/login', { body: { email: `x.${Date.now()}@qa.test`, password: 'Wrong@12345' } }), evidence: EV,
    });
    expect(pass).toBe(true);
  });
});
