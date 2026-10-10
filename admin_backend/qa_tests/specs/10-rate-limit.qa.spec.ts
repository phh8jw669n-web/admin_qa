/**
 * Login throttle. Needs a server started with the default LOGIN_THROTTLE_LIMIT=10
 * at QA_THROTTLE_URL (see qa_tests/README.md). Skipped when the variable is not set.
 */
import request from 'supertest';
import { flush } from '../helpers/recorder';
import { suite } from '../helpers/dsl';

const URL = process.env.QA_THROTTLE_URL;
const EV = 'qa_tests/specs/10-rate-limit.qa.spec.ts';
afterAll(() => flush('10-rate-limit'));
const d = URL ? describe : describe.skip;

d('Login throttle (separate server, limit 10/min)', () => {
  const T = suite('Auth', EV);
  T('throttle.login', '11th login in a minute is throttled', {
    category: 'security', endpoint: 'POST /api/v1/super-admin/login', scenario: '12 wrong logins with different emails from one IP', expectStatus: 429, expected: '429 Too many login attempts',
    run: async () => {
      let last: any;
      for (let i = 0; i < 12; i += 1) {
        last = await request(URL!).post('/api/v1/super-admin/login').send({ email: `t${i}.${Date.now()}@qa.test`, password: 'Wrong@12345' });
      }
      return last;
    },
  });
  T('throttle.refresh', 'refresh endpoint has no throttle', {
    category: 'security', endpoint: 'POST /api/v1/auth/refresh', scenario: '30 refresh calls with random tokens', expectStatus: 429, expected: '429 after a limit',
    run: async () => {
      let last: any;
      for (let i = 0; i < 30; i += 1) {
        last = await request(URL!).post('/api/v1/auth/refresh').send({ refreshToken: `x${i}` });
      }
      return last;
    },
  });
  T('throttle.proxy', 'all users behind one proxy share one limit', {
    category: 'security', endpoint: 'POST /api/v1/auth/login', scenario: 'X-Forwarded-For differs per request but app reads socket IP', expectStatus: 200, expected: 'Throttle uses real client IP when behind a trusted proxy (trust proxy setting)',
    run: async () => {
      const r = await request(URL!).post('/api/v1/super-admin/login').set('X-Forwarded-For', '203.0.113.77').send({ email: 'proxy@qa.test', password: 'Wrong@12345' });
      return { status: r.status === 429 ? 500 : 200, body: { message: `status ${r.status} for a new client IP after limit used by another IP` } };
    },
  });
});
