/** Super admin: companies, admins, templates. Company admin: own company profile. */
import { call } from '../helpers/http';
import { flush } from '../helpers/recorder';
import { suite, longText, XSS } from '../helpers/dsl';
import { companyBody, gst, loadFixtures, must } from '../helpers/fixtures';

const f = loadFixtures();
const EV = 'qa_tests/specs/03-companies-admins-templates.qa.spec.ts';
afterAll(() => flush('03-companies-admins-templates'));
const sa = f.superAdminToken;
const uniq = () => `c${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

describe('Companies (super admin)', () => {
  const T = suite('Companies', EV);
  let createdId = '';

  T('companies.create.ok', 'create company with all required fields', {
    endpoint: 'POST /api/v1/super-admin/companies', scenario: 'Valid company body', expectStatus: 201, expected: '201 company with code CO-xx',
    run: async () => {
      const s = uniq();
      const r = await call('post', '/super-admin/companies', { token: sa, body: companyBody(s, `own.${s}@qa.test`, 'Owner@12345') });
      createdId = r.body?.data?.id;
      return r;
    },
    verify: (r) => /^CO-\d+$/.test(r.body.data.companyCode) && !('deletedAt' in r.body.data),
  });

  T('companies.create.dup-workspace', 'duplicate workspace URL', {
    category: 'edge', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'Workspace URL already used by company A', expectStatus: 409, expected: '409 This workspace URL is already in use',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `d.${s}@qa.test`), workspaceUrl: f.A.workspaceUrl } }); },
  });

  T('companies.create.dup-workspace-case', 'duplicate workspace URL in different case', {
    category: 'edge', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'Same URL in upper case', expectStatus: 409, expected: '409 (URL is lower-cased before save)',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `d2.${s}@qa.test`), workspaceUrl: f.A.workspaceUrl.toUpperCase() } }); },
  });

  T('companies.create.dup-email', 'duplicate company email', {
    category: 'edge', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'Email used by company A', expectStatus: 409, expected: '409 This email is already in use',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: companyBody(s, f.A.adminEmail) }); },
  });

  T('companies.create.bad-gst', 'invalid GST', {
    category: 'validation', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'GST "ABC"', expectStatus: 400, expected: '400 gstNo must be a valid 15-character GST number',
    field: 'gstNo', rule: 'GST pattern',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `g.${s}@qa.test`), gstNo: 'ABC' } }); },
  });

  T('companies.create.long-name', 'name with 10,000 characters', {
    category: 'validation', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'name = 10,000 x "a"', expectStatus: 400, expected: '400 with message naming the field (name max 200)',
    field: 'name', rule: 'Max length 200 (DB)',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `l.${s}@qa.test`), name: longText(10000) } }); },
    verify: (r) => /name/i.test(JSON.stringify(r.body)),
  });

  T('companies.create.spaces-name', 'name with only spaces', {
    category: 'validation', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'name = "   "', expectStatus: 400, expected: '400 name should not be empty',
    field: 'name', rule: 'Required, trimmed',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `sp.${s}@qa.test`), name: '   ' } }); },
  });

  T('companies.create.bad-color', 'primary color is not a color', {
    category: 'validation', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'primaryColor = "not-a-color"', expectStatus: 400, expected: '400 primaryColor must be a hex color',
    field: 'primaryColor', rule: 'Hex color',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `col.${s}@qa.test`), primaryColor: 'not-a-color' } }); },
  });

  T('companies.create.bad-workspace-url', 'workspace URL is not a URL', {
    category: 'validation', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'workspaceUrl = "javascript:alert(1)"', expectStatus: 400, expected: '400 workspaceUrl must be a valid URL or slug',
    field: 'workspaceUrl', rule: 'URL / slug format',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `ws.${s}@qa.test`), workspaceUrl: `javascript:alert(${s})` } }); },
  });

  T('companies.create.bad-phone', 'phone is not a number', {
    category: 'validation', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'phone = "call me"', expectStatus: 400, expected: '400 phone must be a valid phone number',
    field: 'phone', rule: 'Phone format',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `ph.${s}@qa.test`), phone: 'call me' } }); },
  });

  T('companies.create.future-year', 'year founded in the future', {
    category: 'validation', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'yearFounded = 2999', expectStatus: 400, expected: '400 yearFounded must not be greater than current year',
    field: 'yearFounded', rule: 'Max current year',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `y.${s}@qa.test`), yearFounded: 2999 } }); },
  });

  T('companies.create.past-plan', 'plan end date in the past', {
    category: 'validation', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'planEndsAt = 2000-01-01', expectStatus: 400, expected: '400 plan end must be in the future',
    field: 'planEndsAt', rule: 'Future date',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `p.${s}@qa.test`), planEndsAt: '2000-01-01T00:00:00Z' } }); },
  });

  T('companies.create.xss-name', 'HTML in company name is stored as plain text', {
    category: 'security', endpoint: 'POST /api/v1/super-admin/companies', scenario: 'name with <script> tag', expectStatus: 201, expected: '201 stored as text; UI must escape it',
    run: () => { const s = uniq(); return call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `x.${s}@qa.test`), name: `XSS ${XSS}`.slice(0, 200) } }); },
  });

  T('companies.list.ok', 'list companies', {
    endpoint: 'GET /api/v1/super-admin/companies', scenario: 'Default page', expectStatus: 200, expected: '200 items + metadata, limit 20',
    run: () => call('get', '/super-admin/companies', { token: sa }),
    verify: (r) => Array.isArray(r.body.data.items) && r.body.data.metadata.limit === 20,
  });

  T('companies.list.limit-max', 'limit above maximum', {
    category: 'validation', endpoint: 'GET /api/v1/super-admin/companies', scenario: 'limit=201', expectStatus: 400, expected: '400 limit must not be greater than 200',
    field: 'limit', rule: 'Max 200', run: () => call('get', '/super-admin/companies', { token: sa, query: { limit: 201 } }),
  });

  T('companies.list.search-wildcard', 'search with % wildcard is escaped', {
    category: 'security', endpoint: 'GET /api/v1/super-admin/companies', scenario: 'name=% (LIKE wildcard)', expectStatus: 200, expected: '200 with 0 items (wildcard escaped)',
    run: () => call('get', '/super-admin/companies', { token: sa, query: { name: '%' } }), verify: (r) => r.body.data.items.length === 0,
  });

  T('companies.list.sqli', 'SQL injection in search', {
    category: 'security', endpoint: 'GET /api/v1/super-admin/companies', scenario: "name=' OR 1=1 --", expectStatus: 200, expected: '200 with 0 items, no SQL error',
    run: () => call('get', '/super-admin/companies', { token: sa, query: { name: "' OR 1=1 --" } }), verify: (r) => r.body.data.items.length === 0,
  });

  T('companies.get.ok', 'get one company', {
    endpoint: 'GET /api/v1/super-admin/companies/:id', scenario: 'Existing company', expectStatus: 200, expected: '200 company',
    run: () => call('get', `/super-admin/companies/${f.A.companyId}`, { token: sa }),
  });

  T('companies.get.date-type-from-cache', 'planEndsAt format is the same on first and cached read', {
    category: 'edge', endpoint: 'GET /api/v1/super-admin/companies/:id', scenario: 'Read twice (Redis cache)', expectStatus: 200, expected: 'Both reads return same JSON',
    run: async () => {
      const a = await call('get', `/super-admin/companies/${f.B.companyId}`, { token: sa });
      const b = await call('get', `/super-admin/companies/${f.B.companyId}`, { token: sa });
      return { status: b.status, body: { same: JSON.stringify(a.body) === JSON.stringify(b.body), ...b.body } };
    },
    verify: (r) => r.body.same === true,
  });

  T('companies.update.ok', 'update company city', {
    endpoint: 'PUT /api/v1/super-admin/companies/:id', scenario: 'Change city', expectStatus: 200, expected: '200 city updated',
    run: () => call('put', `/super-admin/companies/${createdId}`, { token: sa, body: { city: 'Pune' } }), verify: (r) => r.body.data.city === 'Pune',
  });

  T('companies.update.status-sync', 'status inactive also sets isActive false', {
    endpoint: 'PUT /api/v1/super-admin/companies/:id', scenario: 'status=inactive', expectStatus: 200, expected: '200 isActive false',
    run: () => call('put', `/super-admin/companies/${createdId}`, { token: sa, body: { status: 'inactive' } }), verify: (r) => r.body.data.isActive === false,
  });

  T('companies.update.addressline2-wipe', 'status toggle from UI sends addressLine2 empty and wipes it', {
    category: 'edge', endpoint: 'PUT /api/v1/super-admin/companies/:id', scenario: 'Company has addressLine2, UI toggle sends addressLine2: ""', expectStatus: 200, expected: 'addressLine2 kept (backend should ignore empty optional) - see FE bug',
    run: async () => {
      await call('put', `/super-admin/companies/${createdId}`, { token: sa, body: { addressLine2: 'Floor 2' } });
      return call('put', `/super-admin/companies/${createdId}`, { token: sa, body: { addressLine2: '', status: 'active' } });
    },
    verify: (r) => r.body.data.addressLine2 === 'Floor 2',
  });

  T('companies.inactive.blocks-login', 'inactive company blocks admin token', {
    category: 'security', endpoint: 'POST /api/v1/companies/verify-workspace', scenario: 'Verify workspace of an inactive company', expectStatus: 400, expected: '400 Invalid workspace or company is not active',
    run: async () => {
      const c = await must('get', call('get', `/super-admin/companies/${createdId}`, { token: sa }));
      await call('put', `/super-admin/companies/${createdId}`, { token: sa, body: { status: 'suspended' } });
      return call('post', '/companies/verify-workspace', { body: { workspaceUrl: c.workspaceUrl } });
    },
  });

  T('companies.plan-expired', 'expired plan blocks workspace', {
    category: 'edge', endpoint: 'POST /api/v1/companies/verify-workspace', scenario: 'planEndsAt yesterday', expectStatus: 403, expected: '403 Company plan has expired',
    run: async () => {
      const s = uniq();
      const c = await must('create', call('post', '/super-admin/companies', { token: sa, body: companyBody(s, `exp.${s}@qa.test`, 'Owner@12345') }));
      await must('expire', call('put', `/super-admin/companies/${c.id}`, { token: sa, body: { planEndsAt: new Date(Date.now() - 86400000).toISOString() } }));
      return call('post', '/companies/verify-workspace', { body: { workspaceUrl: c.workspaceUrl } });
    },
  });

  T('companies.delete.ok', 'delete company', {
    endpoint: 'DELETE /api/v1/super-admin/companies/:id', scenario: 'Delete created company', expectStatus: 200, expected: '200 Company deleted successfully',
    run: () => call('delete', `/super-admin/companies/${createdId}`, { token: sa }),
  });

  T('companies.delete.twice', 'delete same company again', {
    category: 'edge', endpoint: 'DELETE /api/v1/super-admin/companies/:id', scenario: 'Second delete', expectStatus: 404, expected: '404 Company not found',
    run: () => call('delete', `/super-admin/companies/${createdId}`, { token: sa }),
  });

  T('companies.delete.admins-orphaned', 'admins of a deleted company are not disabled', {
    category: 'db', endpoint: 'GET /api/v1/admins', scenario: 'List admins after company delete', expectStatus: 200, expected: 'Admins of the deleted company are inactive or deleted',
    run: async () => {
      const s = uniq();
      const email = `orph.${s}@qa.test`;
      const c = await must('create', call('post', '/super-admin/companies', { token: sa, body: companyBody(s, email, 'Owner@12345') }));
      await must('delete', call('delete', `/super-admin/companies/${c.id}`, { token: sa }));
      return call('get', '/admins', { token: sa, query: { search: email } });
    },
    verify: (r) => r.body.data.items.every((a: { isActive: boolean }) => a.isActive === false),
  });

  T('companies.verify.ok', 'verify workspace returns company token and branding', {
    module: 'Companies', endpoint: 'POST /api/v1/companies/verify-workspace', scenario: 'Active workspace URL', expectStatus: 200, expected: '200 companyToken, name, colors',
    run: () => call('post', '/companies/verify-workspace', { body: { workspaceUrl: f.A.workspaceUrl } }), verify: (r) => Boolean(r.body.data.companyToken),
  });

  T('companies.verify.unknown', 'verify unknown workspace', {
    endpoint: 'POST /api/v1/companies/verify-workspace', scenario: 'URL not registered', expectStatus: 400, expected: '400 Invalid workspace or company is not active',
    run: () => call('post', '/companies/verify-workspace', { body: { workspaceUrl: 'http://localhost:5173/w/nope-nope' } }),
  });

  T('companies.verify.enumeration', 'workspace verify has no rate limit', {
    category: 'security', endpoint: 'POST /api/v1/companies/verify-workspace', scenario: '40 quick guesses of workspace URLs', expectStatus: 429, expected: '429 after a reasonable number of guesses',
    run: async () => {
      let last: any;
      for (let i = 0; i < 40; i += 1) {
        last = await call('post', '/companies/verify-workspace', { body: { workspaceUrl: `http://localhost:5173/w/guess-${i}` } });
        if (last.status === 429) break;
      }
      return last;
    },
  });
});

describe('Own company profile (company admin)', () => {
  const T = suite('Companies', EV);
  T('own.get', 'admin reads own company', {
    endpoint: 'GET /api/v1/companies/:id', scenario: 'Own company id', expectStatus: 200, expected: '200 company',
    run: () => call('get', `/companies/${f.A.companyId}`, { token: f.A.adminToken }),
  });
  T('own.update', 'admin updates own company website', {
    endpoint: 'PATCH /api/v1/companies/:id', scenario: 'website change', expectStatus: 200, expected: '200 website updated',
    run: () => call('patch', `/companies/${f.A.companyId}`, { token: f.A.adminToken, body: { website: 'https://a.example' } }),
  });
  T('own.update.status-forbidden', 'admin cannot change plan or status of own company', {
    category: 'security', endpoint: 'PATCH /api/v1/companies/:id', scenario: 'Body has plan=enterprise', expectStatus: 400, expected: '400 property plan should not exist',
    run: () => call('patch', `/companies/${f.A.companyId}`, { token: f.A.adminToken, body: { plan: 'enterprise', planEndsAt: '2099-01-01' } }),
  });
  T('own.update.gst-taken', 'admin sets GST that belongs to company B', {
    category: 'edge', endpoint: 'PATCH /api/v1/companies/:id', scenario: 'GST of another company', expectStatus: 409, expected: '409 This GST number is already in use',
    run: async () => {
      const b = await must('get B', call('get', `/super-admin/companies/${f.B.companyId}`, { token: sa }));
      return call('patch', `/companies/${f.A.companyId}`, { token: f.A.adminToken, body: { gstNo: b.gstNo } });
    },
  });
  T('own.update.pan-length', 'PAN longer than 10 characters', {
    category: 'validation', endpoint: 'PATCH /api/v1/companies/:id', scenario: 'panNo = ABCDE1234FX (11)', expectStatus: 400, expected: '400 panNo format', field: 'panNo', rule: 'PAN pattern',
    run: () => call('patch', `/companies/${f.A.companyId}`, { token: f.A.adminToken, body: { panNo: 'ABCDE1234FX' } }),
  });
});

describe('Admins (super admin)', () => {
  const T = suite('Admins', EV);
  let adminId = '';
  T('admins.create.ok', 'create admin', {
    endpoint: 'POST /api/v1/admins', scenario: 'Valid admin for company A', expectStatus: 201, expected: '201 admin without password hash',
    run: async () => {
      const r = await call('post', '/admins', { token: sa, body: { companyId: f.A.companyId, firstName: 'New', lastName: 'Admin', role: 'admin', email: `new.${uniq()}@qa.test`, password: 'NewAdmin@123' } });
      adminId = r.body?.data?.id;
      return r;
    },
    verify: (r) => !/password/i.test(JSON.stringify(r.body.data)),
  });
  T('admins.create.super-role', 'cannot create a super admin', {
    category: 'security', endpoint: 'POST /api/v1/admins', scenario: 'role=super_admin', expectStatus: 400, expected: '400 Super-Admin accounts cannot be created',
    run: () => call('post', '/admins', { token: sa, body: { companyId: f.A.companyId, firstName: 'S', lastName: 'A', role: 'super_admin', email: `s.${uniq()}@qa.test` } }),
  });
  T('admins.create.dup', 'duplicate email in the same company', {
    category: 'edge', endpoint: 'POST /api/v1/admins', scenario: 'Email of admin A', expectStatus: 409, expected: '409 This email is already in use for this company',
    run: () => call('post', '/admins', { token: sa, body: { companyId: f.A.companyId, firstName: 'D', lastName: 'A', role: 'admin', email: f.A.adminEmail } }),
  });
  T('admins.create.missing-company', 'company does not exist', {
    endpoint: 'POST /api/v1/admins', scenario: 'Random companyId', expectStatus: 404, expected: '404 Company not found',
    run: () => call('post', '/admins', { token: sa, body: { companyId: '00000000-0000-4000-8000-000000000000', firstName: 'D', lastName: 'A', role: 'admin', email: `m.${uniq()}@qa.test` } }),
  });
  T('admins.create.weak-password', 'weak password "aaaaaaaa"', {
    category: 'validation', endpoint: 'POST /api/v1/admins', scenario: 'password = aaaaaaaa', expectStatus: 400, expected: '400 password must contain upper, lower, number, symbol (same rule as UI)',
    field: 'password', rule: 'Strength rule (UI requires it)',
    run: () => call('post', '/admins', { token: sa, body: { companyId: f.A.companyId, firstName: 'W', lastName: 'P', role: 'admin', email: `w.${uniq()}@qa.test`, password: 'aaaaaaaa' } }),
  });
  T('admins.list.ok', 'list admins', {
    endpoint: 'GET /api/v1/admins', scenario: 'Default', expectStatus: 200, expected: '200 items + metadata',
    run: () => call('get', '/admins', { token: sa }),
  });
  T('admins.list.boolean-string', 'filter isActive=false', {
    category: 'edge', endpoint: 'GET /api/v1/admins', scenario: 'isActive=false', expectStatus: 200, expected: '200 only inactive admins',
    run: () => call('get', '/admins', { token: sa, query: { isActive: 'false', limit: 200 } }), verify: (r) => r.body.data.items.every((a: { isActive: boolean }) => a.isActive === false),
  });
  T('admins.update.ok', 'update admin name', {
    endpoint: 'PUT /api/v1/admins/:id', scenario: 'firstName change', expectStatus: 200, expected: '200 updated',
    run: () => call('put', `/admins/${adminId}`, { token: sa, body: { firstName: 'Renamed' } }), verify: (r) => r.body.data.firstName === 'Renamed',
  });
  T('admins.update.empty-name', 'update name to empty string', {
    category: 'validation', endpoint: 'PUT /api/v1/admins/:id', scenario: 'firstName = ""', expectStatus: 400, expected: '400 firstName should not be empty',
    field: 'firstName', rule: 'Not empty on update',
    run: () => call('put', `/admins/${adminId}`, { token: sa, body: { firstName: '' } }),
  });
  T('admins.update.boolean-string', 'isActive "false" as string', {
    category: 'validation', endpoint: 'PUT /api/v1/admins/:id', scenario: 'isActive = "false" (string)', expectStatus: 400, expected: '400 isActive must be a boolean value (or treated as false)',
    field: 'isActive', rule: 'Boolean type',
    run: () => call('put', `/admins/${adminId}`, { token: sa, body: { isActive: 'false' } }),
  });
  T('admins.delete.ok', 'delete admin', {
    endpoint: 'DELETE /api/v1/admins/:id', scenario: 'Delete created admin', expectStatus: 200, expected: '200 Admin deleted successfully',
    run: () => call('delete', `/admins/${adminId}`, { token: sa }),
  });
  T('admins.get.deleted', 'get deleted admin', {
    endpoint: 'GET /api/v1/admins/:id', scenario: 'After delete', expectStatus: 404, expected: '404 Admin not found',
    run: () => call('get', `/admins/${adminId}`, { token: sa }),
  });
});

describe('Templates', () => {
  const T = suite('Templates', EV);
  let tid = '';
  const rank = Math.floor(Math.random() * 1_000_000) + 2_000_000;
  T('templates.create.ok', 'create template', {
    endpoint: 'POST /api/v1/super-admin/templates', scenario: 'Valid', expectStatus: 201, expected: '201 template',
    run: async () => { const r = await call('post', '/super-admin/templates', { token: sa, body: { name: 'QA tpl', ranking: rank, imageKey: 'i', htmlKey: 'h' } }); tid = r.body?.data?.id; return r; },
  });
  T('templates.create.dup-ranking', 'duplicate ranking', {
    category: 'edge', endpoint: 'POST /api/v1/super-admin/templates', scenario: 'Same ranking again', expectStatus: 409, expected: '409 Ranking is already in use',
    run: () => call('post', '/super-admin/templates', { token: sa, body: { name: 'QA tpl 2', ranking: rank, imageKey: 'i', htmlKey: 'h' } }),
  });
  T('templates.create.admin-forbidden', 'company admin cannot create template', {
    category: 'auth', role: 'Company admin (A)', endpoint: 'POST /api/v1/super-admin/templates', scenario: 'Company admin token', expectStatus: 403, expected: '403 forbidden',
    run: () => call('post', '/super-admin/templates', { token: f.A.adminToken, body: { name: 'x', ranking: rank + 1, imageKey: 'i', htmlKey: 'h' } }),
  });
  T('templates.list.admin', 'company admin lists templates', {
    endpoint: 'GET /api/v1/super-admin/templates', scenario: 'Company admin token', expectStatus: 200, expected: '200 list', role: 'Company admin (A)',
    run: () => call('get', '/super-admin/templates', { token: f.A.adminToken }),
  });
  T('templates.update.ok', 'rename template', {
    endpoint: 'PATCH /api/v1/super-admin/templates/:id', scenario: 'Rename', expectStatus: 200, expected: '200',
    run: () => call('patch', `/super-admin/templates/${tid}`, { token: sa, body: { name: 'Renamed tpl' } }),
  });
  T('templates.delete.in-use', 'delete template used by a test', {
    category: 'db', endpoint: 'DELETE /api/v1/super-admin/templates/:id', scenario: 'Template referenced by an existing test', expectStatus: 409, expected: '409 Template is used by tests',
    run: async () => {
      const r = await must('tpl', call('post', '/super-admin/templates', { token: sa, body: { name: 'In use', ranking: rank + 7, imageKey: 'i', htmlKey: 'h' } }));
      await must('test', call('post', '/tests', { token: f.A.adminToken, body: { name: 'tpl-in-use', testCode: `TU${Date.now() % 100000}`, categoryId: f.A.categoryId, primaryInstructionId: f.A.instructionId, durationMinutes: 10, handicappedDurationMinutes: 10, totalQuestions: 1, totalMarks: 1, passingMarks: 0, graceMarks: 0, templateId: r.id } }));
      return call('delete', `/super-admin/templates/${r.id}`, { token: sa });
    },
  });
  T('templates.delete.ok', 'delete unused template', {
    endpoint: 'DELETE /api/v1/super-admin/templates/:id', scenario: 'Unused', expectStatus: 200, expected: '200',
    run: () => call('delete', `/super-admin/templates/${tid}`, { token: sa }),
  });
  void gst;
});
