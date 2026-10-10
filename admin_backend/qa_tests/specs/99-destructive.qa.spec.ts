/** Destructive checks. Runs last. The runner re-seeds the super admin afterwards. */
import { call } from '../helpers/http';
import { flush } from '../helpers/recorder';
import { suite } from '../helpers/dsl';
import { Client } from 'pg';
import { loadFixtures, must, SUPER_ADMIN } from '../helpers/fixtures';

/** Puts the super admin back (direct SQL) so the platform is usable after the checks. */
async function restoreSuperAdmin() {
  const c = new Client({ host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 5432), user: process.env.DB_USER ?? 'postgres', password: process.env.DB_PASS ?? 'postgres', database: process.env.DB_NAME ?? 'admin_qa' });
  await c.connect();
  await c.query("UPDATE admins SET is_active = true, deleted_at = NULL WHERE role = 'super_admin' AND email = $1", [SUPER_ADMIN.email]);
  await c.end();
}

const f = loadFixtures();
const EV = 'qa_tests/specs/99-destructive.qa.spec.ts';
afterAll(async () => {
  flush('99-destructive');
  await restoreSuperAdmin();
});

describe('Destructive', () => {
  const T = suite('Admins', EV);
  T('admins.super-self-deactivate', 'super admin deactivates own account through /admins', {
    category: 'security', endpoint: 'PUT /api/v1/admins/:id', scenario: 'id = own super admin id, isActive=false', expectStatus: [400, 403], expected: '400/403 cannot change or lock out the platform owner',
    run: async () => {
      const s = await must('login', call('post', '/super-admin/login', { body: SUPER_ADMIN }));
      return call('put', `/admins/${f.superAdminId}`, { token: s.accessToken, body: { isActive: false } });
    },
  });
  T('admins.super-self-delete', 'super admin deletes own account through /admins', {
    category: 'security', endpoint: 'DELETE /api/v1/admins/:id', scenario: 'id = own super admin id', expectStatus: [400, 403, 401], expected: '400/403 cannot delete the last super admin',
    run: async () => {
      await restoreSuperAdmin();
      const s = await call('post', '/super-admin/login', { body: SUPER_ADMIN });
      return call('delete', `/admins/${f.superAdminId}`, { token: s.body?.data?.accessToken });
    },
  });
});
