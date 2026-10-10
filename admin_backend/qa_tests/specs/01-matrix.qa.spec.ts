/**
 * Every endpoint x every role: no login, wrong role, cross-tenant id (IDOR),
 * missing id (404), malformed id (400) and invalid body (400).
 */
import { randomUUID } from 'crypto';
import { call } from '../helpers/http';
import { check, flush } from '../helpers/recorder';
import { endpoints, type Endpoint } from '../helpers/endpoints';
import { loadFixtures } from '../helpers/fixtures';

const f = loadFixtures();
const EV = 'qa_tests/specs/01-matrix.qa.spec.ts';
afterAll(() => flush('01-matrix'));

const tokens = {
  'No login': null as string | null,
  'Company admin (A)': f.A.adminToken,
  'Super admin': f.superAdminToken,
  'Candidate (A)': f.A.candidateToken,
  'Centre user (A)': f.A.centreUserToken,
};

type RoleName = keyof typeof tokens;

function allowedRoles(e: Endpoint): RoleName[] {
  switch (e.access) {
    case 'admin':
      return ['Company admin (A)'];
    case 'super':
      return ['Super admin'];
    case 'both':
    case 'any-admin-jwt':
      return ['Company admin (A)', 'Super admin'];
    case 'candidate':
      return ['Candidate (A)'];
    case 'centre':
      return ['Centre user (A)'];
    default:
      return Object.keys(tokens) as RoleName[];
  }
}

const list = endpoints();

describe('Auth matrix', () => {
  for (const e of list) {
    if (e.access === 'public') continue;
    const allowed = allowedRoles(e);
    for (const role of Object.keys(tokens) as RoleName[]) {
      const isAllowed = allowed.includes(role);
      if (isAllowed && !e.safeRead) continue; // mutations by allowed role are covered in module specs
      it(`${e.method.toUpperCase()} ${e.path} as ${role}`, async () => {
        const expectStatus = isAllowed ? [200] : role === 'No login' ? [401] : [401, 403];
        const { pass } = await check({
          key: `matrix.${e.apiId}.${role}`,
          category: 'auth',
          module: e.module,
          endpoint: `${e.method.toUpperCase()} /api/v1${e.path}`,
          scenario: isAllowed ? `Allowed role reads data` : `Call with ${role}`,
          request: e.body ? e.body(f) : 'N/A',
          expectStatus,
          expected: isAllowed ? '200 data returned' : role === 'No login' ? '401 Please sign in' : '401 or 403 rejected',
          run: () => call(e.method, e.real(f), { token: tokens[role], body: e.body?.(f) }),
          evidence: EV,
          role,
        });
        expect(pass).toBe(true);
      });
    }
  }
});

describe('Cross-tenant access (IDOR)', () => {
  for (const e of list) {
    if (!e.idPath || !['admin'].includes(e.access)) continue;
    it(`${e.method.toUpperCase()} ${e.path} with company B admin on company A id`, async () => {
      const { pass } = await check({
        key: `idor.${e.apiId}`,
        category: 'auth',
        module: e.module,
        endpoint: `${e.method.toUpperCase()} /api/v1${e.path}`,
        scenario: 'Admin of company B uses an id that belongs to company A',
        request: e.body ? e.body(f) : 'N/A',
        expectStatus: [403, 404],
        expected: '404 not found (no data from company A)',
        run: () => call(e.method, e.real(f), { token: f.B.adminToken, body: e.body?.(f) }),
        evidence: EV,
        role: 'Company admin (B)',
      });
      expect(pass).toBe(true);
    });
  }

  it('Candidate of company B reads company A test paper', async () => {
    const { pass } = await check({
      key: 'idor.exam.paper.candidateB', category: 'auth', module: 'Candidate Exam',
      endpoint: 'GET /api/v1/candidates/tests/:testId/questions', scenario: 'Candidate from company B asks for company A test',
      expectStatus: [403, 404], expected: '404 Test not found',
      run: () => call('get', `/candidates/tests/${f.A.testId}/questions`, { token: f.B.candidateToken }),
      evidence: EV, role: 'Candidate (B)',
    });
    expect(pass).toBe(true);
  });
});

function tokenFor(e: Endpoint) {
  const role = allowedRoles(e)[0];
  return tokens[role];
}

describe('Missing id returns 404', () => {
  for (const e of list) {
    if (!e.idPath || e.access === 'public') continue;
    it(`${e.method.toUpperCase()} ${e.path} with unknown id`, async () => {
      const { pass } = await check({
        key: `notfound.${e.apiId}`,
        module: e.module,
        endpoint: `${e.method.toUpperCase()} /api/v1${e.path}`,
        scenario: 'Unknown but valid UUID',
        request: e.body ? e.body(f) : 'N/A',
        expectStatus: 404,
        expected: '404 with a clear not-found message',
        run: () => call(e.method, e.idPath!(randomUUID(), f), { token: tokenFor(e), body: e.method === 'patch' || e.method === 'put' ? e.body?.(f) ?? {} : e.body?.(f) }),
        evidence: EV,
      });
      expect(pass).toBe(true);
    });
  }
});

describe('Malformed id returns 400', () => {
  for (const e of list) {
    if (!e.idPath || e.access === 'public') continue;
    it(`${e.method.toUpperCase()} ${e.path} with id "abc"`, async () => {
      const { pass } = await check({
        key: `badid.${e.apiId}`,
        category: 'validation',
        module: e.module,
        endpoint: `${e.method.toUpperCase()} /api/v1${e.path}`,
        scenario: 'Id is not a UUID',
        request: 'id=abc',
        expectStatus: 400,
        expected: '400 Please provide a valid ID',
        run: () => call(e.method, e.idPath!('abc', f), { token: tokenFor(e), body: e.body?.(f) }),
        evidence: EV,
        field: 'id (path)',
        rule: 'Must be a UUID',
      });
      expect(pass).toBe(true);
    });
  }
});

describe('Invalid body returns 400', () => {
  for (const e of list) {
    if (e.invalidBody === undefined) continue;
    it(`${e.method.toUpperCase()} ${e.path} with invalid body`, async () => {
      const { pass } = await check({
        key: `invalid.${e.apiId}`,
        category: 'validation',
        module: e.module,
        endpoint: `${e.method.toUpperCase()} /api/v1${e.path}`,
        scenario: 'Invalid or incomplete body',
        request: e.invalidBody,
        expectStatus: 400,
        expected: '400 with field error list',
        run: () => call(e.method, e.real(f), { token: e.access === 'public' ? null : tokenFor(e), body: e.invalidBody }),
        evidence: EV,
        field: Object.keys(e.invalidBody as object).join(', ') || '(empty body)',
        rule: 'DTO validation',
      });
      expect(pass).toBe(true);
    });
  }
});
