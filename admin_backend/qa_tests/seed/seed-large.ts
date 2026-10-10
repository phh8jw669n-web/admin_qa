/**
 * Seeds a demo workspace with realistic volume for UI and load tests.
 *   Workspace: http://localhost:5173/w/qa-demo
 *   Admin:     admin@qa-demo.test / DemoAdmin@123
 *   Super:     superadmin@qa.test / SuperQa@12345
 * Adds 35 extra companies, 1,200 candidates and 1,100 tests (bulk SQL).
 * Safe to run again: skips what already exists.
 * Run: npx ts-node -P qa_tests/tsconfig.json qa_tests/seed/seed-large.ts
 */
import { Client } from 'pg';
import { call } from '../helpers/http';
import { companyBody, must, SUPER_ADMIN } from '../helpers/fixtures';

const DEMO_SLUG = 'qa-demo';
const DEMO_EMAIL = 'admin@qa-demo.test';
const DEMO_PASSWORD = 'DemoAdmin@123';

async function main() {
  const sa = (await must<{ accessToken: string }>('sa login', call('post', '/super-admin/login', { body: SUPER_ADMIN }))).accessToken;
  const db = new Client({ host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 5432), user: process.env.DB_USER ?? 'postgres', password: process.env.DB_PASS ?? 'postgres', database: process.env.DB_NAME ?? 'admin_qa' });
  await db.connect();

  const workspaceUrl = `http://localhost:5173/w/${DEMO_SLUG}`;
  let company = (await db.query('SELECT id FROM companies WHERE workspace_url = $1 AND deleted_at IS NULL', [workspaceUrl])).rows[0];
  if (!company) {
    const body = { ...companyBody(DEMO_SLUG, DEMO_EMAIL, DEMO_PASSWORD), name: 'QA Demo Institute' };
    company = await must('demo company', call('post', '/super-admin/companies', { token: sa, body }));
    console.log('created demo company', company.id);
  }
  const companyId: string = company.id;

  const verify = await must('verify', call('post', '/companies/verify-workspace', { body: { workspaceUrl } }));
  const admin = await must<{ accessToken: string }>('admin login', call('post', '/auth/login', { body: { companyToken: verify.companyToken, email: DEMO_EMAIL, password: DEMO_PASSWORD } }));
  const t = admin.accessToken;

  async function ensure(path: string, name: string, body: Record<string, unknown>) {
    const list = await must<{ items: { id: string; name: string }[] }>(`list ${path}`, call('get', path, { token: t, query: { limit: 200 } }));
    const found = list.items.find((x) => x.name === name);
    if (found) return found.id;
    const created = await must<{ id: string }>(`create ${path}`, call('post', path, { token: t, body: { name, ...body } }));
    return created.id;
  }

  const english = await ensure('/languages', 'English', {});
  const hindi = await ensure('/languages', 'Hindi', {});
  await ensure('/difficulties', 'Easy', { languageId: english });
  await ensure('/difficulties', 'Hard', { languageId: english });
  const categories = [] as string[];
  for (const [i, n] of ['Engineering', 'Medical', 'Banking', 'Civil Services'].entries()) categories.push(await ensure('/categories', n, { ranking: i + 1 }));
  const subjects = [] as string[];
  for (const [i, n] of ['Physics', 'Chemistry', 'Mathematics'].entries()) subjects.push(await ensure('/subjects', n, { ranking: i + 1 }));
  const topics = [] as string[];
  for (const [i, n] of ['Mechanics', 'Optics', 'Algebra'].entries()) topics.push(await ensure('/topics', n, { ranking: i + 1 }));
  for (let i = 0; i < 3; i += 1) {
    await call('post', '/category-subject-topic-mappings', { token: t, body: { categoryId: categories[0], subjectId: subjects[i], topicId: topics[i], ranking: i + 1 } });
  }
  const instruction = await ensure('/instructions', 'General Instructions', { ranking: 1 });
  await call('post', `/instructions/${instruction}/languages`, { token: t, body: { languageId: english, content: '<p>Read every question carefully.</p>' } });
  await call('post', `/instructions/${instruction}/languages`, { token: t, body: { languageId: hindi, content: '<p>सभी प्रश्न ध्यान से पढ़ें।</p>' } });
  const group = await ensure('/groups', 'Batch 2026', {});

  let template = (await db.query("SELECT id FROM templates WHERE deleted_at IS NULL ORDER BY ranking LIMIT 1")).rows[0]?.id;
  if (!template) {
    template = (await must<{ id: string }>('tpl', call('post', '/super-admin/templates', { token: sa, body: { name: 'Classic', ranking: 1, imageKey: 'templates/classic.png', htmlKey: 'templates/classic.html' } }))).id;
  }

  // Bulk candidates
  const candCount = Number((await db.query('SELECT count(*) FROM candidates WHERE company_id = $1', [companyId])).rows[0].count);
  if (candCount < 1200) {
    await db.query(
      `INSERT INTO candidates (company_id, name, password_hash, enrollment_number, email, mobile, gender, date_of_registration, country, state, city, address, pincode, group_ids, payment_status)
       SELECT $1, 'Candidate ' || g, '$2b$10$abcdefghijklmnopqrstuuJ0r2tB6lM2T6m6nqk8dX0eFhW1Y1W2a', 'BULK-' || g, 'bulk' || g || '@qa-demo.test', '90000' || lpad(g::text, 5, '0'),
              (ARRAY['male','female','other'])[1 + g % 3]::candidates_gender_enum, now() - (g || ' days')::interval, 'India', 'MH', 'Mumbai', g || ' Main Road', '400001', ARRAY[$2]::uuid[],
              (ARRAY['pending','paid','failed'])[1 + g % 3]::candidates_payment_status_enum
       FROM generate_series($3::int, 1200) g`,
      [companyId, group, candCount + 1],
    );
    await db.query(
      `INSERT INTO candidate_groups (candidate_id, group_id) SELECT id, $2 FROM candidates c WHERE company_id = $1 AND NOT EXISTS (SELECT 1 FROM candidate_groups x WHERE x.candidate_id = c.id)`,
      [companyId, group],
    );
  }

  // Bulk tests
  const testCount = Number((await db.query('SELECT count(*) FROM tests WHERE company_id = $1', [companyId])).rows[0].count);
  if (testCount < 1100) {
    await db.query(
      `INSERT INTO tests (company_id, name, test_code, description, category_id, primary_instruction_id, duration_minutes, handicapped_duration_minutes, total_questions, total_marks, passing_marks, grace_marks, is_draft, template_id, is_published, start_date, end_date, start_time, end_time)
       SELECT $1, 'Mock Test ' || g, 'MT' || g, 'Seeded test', ($2::uuid[])[1 + g % 4], $3, 60, 80, 50, 200, 80, 0, g % 3 = 0, $4, g % 3 <> 0,
              current_date + (g % 60), current_date + (g % 60) + 1, '09:00', '12:00'
       FROM generate_series($5::int, 1100) g`,
      [companyId, categories, instruction, template, testCount + 1],
    );
  }

  // Extra companies so the super admin list has more than 20 rows
  const companies = Number((await db.query('SELECT count(*) FROM companies WHERE deleted_at IS NULL')).rows[0].count);
  for (let i = companies; i < 35; i += 1) {
    const s = `bulkco${i}`;
    await call('post', '/super-admin/companies', { token: sa, body: { ...companyBody(s, `owner.${s}@qa.test`, 'Owner@12345'), name: `Bulk Company ${String(i).padStart(2, '0')}` } });
  }

  // One realistic test with questions for the wizard
  const qtest = (await db.query("SELECT id FROM tests WHERE company_id = $1 AND test_code = 'DEMO1'", [companyId])).rows[0];
  if (!qtest) {
    const created = await must<{ id: string }>('demo test', call('post', '/tests', { token: t, body: { name: 'JEE Physics Demo', testCode: 'DEMO1', description: 'Demo test with questions', categoryId: categories[0], primaryInstructionId: instruction, durationMinutes: 90, handicappedDurationMinutes: 120, totalQuestions: 20, totalMarks: 80, passingMarks: 32, graceMarks: 0, templateId: template, isDraft: true, isPublished: false, startDate: '2030-06-01', endDate: '2030-06-01', startTime: '09:00', endTime: '12:00' } }));
    await call('post', '/test-settings', { token: t, body: { testId: created.id } });
  }

  const totals = await db.query(`SELECT (SELECT count(*) FROM candidates WHERE company_id = $1) c, (SELECT count(*) FROM tests WHERE company_id = $1) t, (SELECT count(*) FROM companies WHERE deleted_at IS NULL) co`, [companyId]);
  console.log('demo totals', totals.rows[0]);
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
