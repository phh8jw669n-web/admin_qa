import { writeFileSync } from 'fs';
import { call } from './http';
import { FIXTURE_FILE, SUPER_ADMIN, buildTenant, must } from './fixtures';

/** Builds two isolated tenants (A and B) through the public API before the specs run. */
export default async function globalSetup() {
  const suffix = Date.now().toString(36);
  const sa = await must<{ accessToken: string; admin: { id: string } }>(
    'super admin login',
    call('post', '/super-admin/login', { body: SUPER_ADMIN }),
  );
  const template = await must('template', call('post', '/super-admin/templates', {
    token: sa.accessToken,
    body: { name: `Template ${suffix}`, ranking: Math.floor(Math.random() * 1_000_000) + 1000, imageKey: 'tpl/img.png', htmlKey: 'tpl/index.html' },
  }));
  const A = await buildTenant(sa.accessToken, `a${suffix}`, template.id);
  const B = await buildTenant(sa.accessToken, `b${suffix}`, template.id);
  writeFileSync(
    FIXTURE_FILE,
    JSON.stringify({ suffix, superAdminToken: sa.accessToken, superAdminId: sa.admin.id, templateId: template.id, A, B }, null, 1),
  );
}
