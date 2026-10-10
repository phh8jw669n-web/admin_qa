import { call } from '../helpers/http';
import { flush, check } from '../helpers/recorder';
import { loadFixtures } from '../helpers/fixtures';

const f = loadFixtures();
afterAll(() => flush('00-smoke'));

describe('Smoke', () => {
  it('health', async () => {
    const { pass } = await check({
      key: 'health.ok', module: 'Health', endpoint: 'GET /api/v1/health', scenario: 'Health check with DB and Redis up',
      expectStatus: 200, expected: '200 with database and redis status up',
      run: () => call('get', '/health'), verify: (r) => r.body?.data?.status === 'ok', evidence: 'qa_tests/specs/00-smoke.qa.spec.ts',
    });
    expect(pass).toBe(true);
  });
  it('root', async () => {
    const { pass } = await check({
      key: 'root.ok', module: 'Health', endpoint: 'GET /api/v1', scenario: 'Root welcome message',
      expectStatus: 200, expected: '200 with welcome message',
      run: () => call('get', ''), evidence: 'qa_tests/specs/00-smoke.qa.spec.ts',
    });
    expect(pass).toBe(true);
    expect(f.A.adminToken).toBeTruthy();
  });
});
