/** Business flow simulations, one per persona. Each step is recorded in the summary. */
import { call } from '../helpers/http';
import { flush, record } from '../helpers/recorder';
import { candidateBody, companyBody, loadFixtures, must, singleChoiceBody, SUPER_ADMIN, testBody, todayUtc } from '../helpers/fixtures';

const f = loadFixtures();
const EV = 'qa_tests/specs/09-simulations.qa.spec.ts';
afterAll(() => flush('09-simulations'));
const u = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

type Step = { name: string; ok: boolean; note: string };

async function step(steps: Step[], name: string, p: Promise<{ status: number; body: any }>, expect: number | number[]) {
  const r = await p;
  const exp = Array.isArray(expect) ? expect : [expect];
  steps.push({ name, ok: exp.includes(r.status), note: `${r.status} ${r.body?.message ?? ''}`.trim() });
  return r;
}

function save(key: string, persona: string, flow: Step[], expected: string, dataCorrect: boolean, notes: string) {
  const pass = flow.every((s) => s.ok) && dataCorrect;
  record({
    key, category: 'sim', module: 'Simulation', endpoint: persona, scenario: flow.map((s, i) => `${i + 1}) ${s.name}`).join(' '),
    request: 'N/A', expectedStatus: 'N/A', expected, actualStatus: pass ? 'OK' : 'Problem',
    actual: flow.map((s, i) => `${i + 1}) ${s.ok ? 'ok' : 'FAIL'} ${s.note}`).join(' ').slice(0, 600),
    status: pass ? 'Pass' : 'Fail', evidence: EV, wasAllowed: dataCorrect ? 'Yes' : 'No', rule: notes,
  });
  return pass;
}

describe('Persona simulations', () => {
  it('Super admin onboards a new customer', async () => {
    const s: Step[] = [];
    const sa = await step(s, 'Super admin logs in', call('post', '/super-admin/login', { body: SUPER_ADMIN }), 200);
    const slug = `onb${u()}`;
    const email = `owner.${slug}@qa.test`;
    const c = await step(s, 'Creates company from UI fields (no admin password)', call('post', '/super-admin/companies', { token: sa.body.data.accessToken, body: companyBody(slug, email) }), 201);
    const v = await step(s, 'Customer opens workspace URL', call('post', '/companies/verify-workspace', { body: { workspaceUrl: c.body.data.workspaceUrl } }), 200);
    await step(s, 'Owner logs in with the shared default password', call('post', '/auth/login', { body: { companyToken: v.body.data.companyToken, email, password: process.env.QA_DEFAULT_ADMIN_PASSWORD ?? 'QaDefault@123' } }), [401, 403]);
    await step(s, 'Owner looks for a change-password endpoint', call('post', '/auth/change-password', { body: {} }), [200, 400, 401]);
    const pass = save('sim.onboarding', 'Super admin', s, 'Owner gets a personal set-password link; no shared password; can change password', false, 'No invite email, no change-password API; every new admin shares DEFAULT_ADMIN_PASSWORD');
    expect(pass).toBe(true);
  });

  it('New admin builds the first test', async () => {
    const s: Step[] = [];
    const t = f.A.adminToken;
    await step(s, 'Opens profile', call('get', '/auth/me', { token: t }), 200);
    const cat = await step(s, 'Creates category', call('post', '/categories', { token: t, body: { name: `First cat ${u()}`, ranking: 1 } }), 201);
    const sub = await step(s, 'Creates subject', call('post', '/subjects', { token: t, body: { name: `First sub ${u()}`, ranking: 1 } }), 201);
    const top = await step(s, 'Creates topic', call('post', '/topics', { token: t, body: { name: `First top ${u()}`, ranking: 1 } }), 201);
    await step(s, 'Maps category-subject-topic', call('post', '/category-subject-topic-mappings', { token: t, body: { categoryId: cat.body.data.id, subjectId: sub.body.data.id, topicId: top.body.data.id, ranking: 1 } }), 201);
    const testR = await step(s, 'Creates test leaving handicapped duration empty (UI sends 0)', call('post', '/tests', { token: t, body: testBody('n', cat.body.data.id, f.A.instructionId, f.templateId, { testCode: `NA${Date.now() % 100000}`, handicappedDurationMinutes: 0 }) }), 201);
    const testId = testR.body?.data?.id;
    if (testId) {
      await step(s, 'Saves default settings', call('post', '/test-settings', { token: t, body: { testId } }), 201);
      await step(s, 'Adds first question', call('post', '/questions', { token: t, body: singleChoiceBody(testId, sub.body.data.id, top.body.data.id, f.A.languageId, f.A.difficultyId) }), 201);
    }
    const pass = save('sim.new-admin', 'New admin', s, 'Test is created with optional fields left empty', Boolean(testId), 'Handicapped duration is optional in UI but backend rejects 0');
    expect(pass).toBe(true);
  });

  it('Power admin loads 60 candidates and assigns a test', async () => {
    const s: Step[] = [];
    const t = f.A.adminToken;
    const g = await step(s, 'Creates group', call('post', '/groups', { token: t, body: { name: `Batch ${u()}` } }), 201);
    const started = Date.now();
    let created = 0;
    for (let i = 0; i < 60; i += 1) {
      const id = `${u()}${i}`;
      const r = await call('post', '/candidates', { token: t, body: candidateBody(`bulk.${id}@qa.test`, `BULK-${id}`, g.body.data.id) });
      if (r.status === 201) created += 1;
    }
    s.push({ name: 'Creates 60 candidates one by one (no bulk API)', ok: created === 60, note: `${created}/60 in ${Date.now() - started} ms` });
    const tt = await step(s, 'Creates test', call('post', '/tests', { token: t, body: testBody('p', f.A.categoryId, f.A.instructionId, f.templateId, { testCode: `PW${Date.now() % 100000}` }) }), 201);
    const a = await step(s, 'Assigns test to the group', call('post', '/test-candidate-mappings/assign-groups', { token: t, body: { testId: tt.body.data.id, groupIds: [g.body.data.id] } }), 201);
    const l = await step(s, 'Lists mappings for the test (page 1, limit 200)', call('get', '/test-candidate-mappings', { token: t, query: { testId: tt.body.data.id, limit: 200 } }), 200);
    const ok = a.body?.data?.assigned === 60 && l.body?.data?.metadata?.total === 60;
    const pass = save('sim.power-admin', 'Power admin', s, '60 candidates created and mapped; totals match', ok, 'No bulk import endpoint; 60 sequential calls needed');
    expect(pass).toBe(true);
  });

  it('Limited-role admin tries to reach platform and other tenant data', async () => {
    const s: Step[] = [];
    const t = f.A.adminToken;
    await step(s, 'Lists companies (super admin API)', call('get', '/super-admin/companies', { token: t }), 403);
    await step(s, 'Creates an admin for itself', call('post', '/admins', { token: t, body: { companyId: f.A.companyId, firstName: 'x', lastName: 'y', role: 'admin', email: `esc.${u()}@qa.test` } }), 403);
    await step(s, 'Changes own company plan', call('patch', `/companies/${f.A.companyId}`, { token: t, body: { plan: 'enterprise' } }), 400);
    await step(s, 'Reads company B test by id', call('get', `/tests/${f.B.testId}`, { token: t }), 404);
    await step(s, 'Deletes company B candidate by id', call('delete', `/candidates/${f.B.candidateId}`, { token: t }), 404);
    await step(s, 'Lists templates (allowed)', call('get', '/super-admin/templates', { token: t }), 200);
    const pass = save('sim.limited-role', 'Limited-role admin', s, 'Every escalation attempt is blocked', true, 'All blocked');
    expect(pass).toBe(true);
  });

  it('Careless admin double-clicks and sends bad input', async () => {
    const s: Step[] = [];
    const t = f.A.adminToken;
    const code = `DC${Date.now() % 100000}`;
    const body = testBody('c', f.A.categoryId, f.A.instructionId, f.templateId, { testCode: code });
    const [a, b] = await Promise.all([call('post', '/tests', { token: t, body }), call('post', '/tests', { token: t, body })]);
    s.push({ name: 'Double-clicks Save on create test', ok: [a.status, b.status].sort().join() === '201,409', note: `${a.status}/${b.status}` });
    await step(s, 'Sends test name with only spaces', call('post', '/tests', { token: t, body: { ...body, name: '   ', testCode: `${code}x`.slice(0, 10) } }), 400);
    await step(s, 'Types letters into duration', call('post', '/tests', { token: t, body: { ...body, durationMinutes: 'sixty', testCode: `${code}y`.slice(0, 10) } }), 400);
    await step(s, 'Sends isActive "false" as text when disabling a group', call('patch', `/groups/${f.A.groupId}`, { token: t, body: { isActive: 'false' } }), 400);
    await call('patch', `/groups/${f.A.groupId}`, { token: t, body: { isActive: true } });
    const pass = save('sim.careless', 'Careless user', s, 'Duplicates blocked, bad input rejected with clear messages', true, '"false" string silently becomes true');
    expect(pass).toBe(true);
  });

  it('Malicious user probes the API', async () => {
    const s: Step[] = [];
    await step(s, 'SQL injection in search', call('get', '/tests', { token: f.A.adminToken, query: { name: "x' OR '1'='1" } }), 200);
    await step(s, 'Unsigned token claiming super admin', call('get', '/admins', { token: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4Iiwicm9sZSI6InN1cGVyX2FkbWluIn0.' }), 401);
    await step(s, 'Candidate token on admin API', call('get', '/candidates', { token: f.A.candidateToken }), 401);
    await step(s, 'Reads exam paper before the exam window', call('get', `/candidates/tests/${f.A.testId}/questions`, { token: f.A.candidateToken }), 403);
    await step(s, 'Locks out the company admin with 5 bad passwords', (async () => {
      for (let i = 0; i < 5; i += 1) await call('post', '/auth/login', { body: { companyToken: f.B.companyToken, email: f.B.adminEmail, password: `Bad@${i}xxxxx` } });
      return call('post', '/auth/login', { body: { companyToken: f.B.companyToken, email: f.B.adminEmail, password: f.B.adminPassword } });
    })(), 200);
    const pass = save('sim.malicious', 'Malicious user', s, 'All probes blocked; real user not locked out', true, 'Paper leak and lockout DoS succeed');
    expect(pass).toBe(true);
  });

  it('Candidate on exam day', async () => {
    const s: Step[] = [];
    const t = f.A.adminToken;
    const id = u();
    const c = await must('cand', call('post', '/candidates', { token: t, body: candidateBody(`day.${id}@qa.test`, `DAY-${id}`, f.A.groupId, 'Cand@12345') }));
    await must('ccm', call('post', '/candidate-centre-mappings', { token: t, body: { candidateId: c.id, centreId: f.A.centreId, examDate: todayUtc() } }));
    const now = new Date();
    const tt = await must('test', call('post', '/tests', { token: t, body: testBody('d', f.A.categoryId, f.A.instructionId, f.templateId, { testCode: `DY${Date.now() % 100000}`, isDraft: false, isPublished: true, startDate: todayUtc(), endDate: todayUtc(), startTime: '00:00', endTime: '23:59' }) }));
    await must('q', call('post', '/questions', { token: t, body: singleChoiceBody(tt.id, f.A.subjectId, f.A.topicId, f.A.languageId, f.A.difficultyId) }));
    await must('tcm', call('post', '/test-candidate-mappings', { token: t, body: { groupId: f.A.groupId, candidateId: c.id, testId: tt.id } }));
    const l = await step(s, 'Logs in at centre', call('post', '/candidates/login', { body: { companyToken: f.A.companyToken, enrollmentNumber: `DAY-${id}`, password: 'Cand@12345', centreCode: f.A.centreCode } }), 200);
    const tok = l.body?.data?.accessToken;
    await step(s, 'Reads exam details', call('get', `/candidates/tests/${tt.id}`, { token: tok }), 200);
    const p = await step(s, 'Loads paper', call('get', `/candidates/tests/${tt.id}/questions`, { token: tok }), 200);
    s.push({ name: 'Paper has 1 question and no answers', ok: JSON.stringify(p.body).includes('What is 2 + 2?') && !JSON.stringify(p.body).includes('correctOptions'), note: 'checked' });
    s.push({ name: 'Looks for an API to submit answers', ok: false, note: 'No answer/submit endpoint exists in this backend' });
    await step(s, 'Sends feedback', call('post', `/candidates/tests/${tt.id}/feedback`, { token: tok, body: { rating: 4, comment: 'Smooth' } }), 201);
    await step(s, 'Logs out', call('post', '/candidates/logout', { token: tok }), 200);
    void now;
    const pass = save('sim.exam-day', 'Candidate', s, 'Candidate can log in, read paper, submit and give feedback', true, 'Answer submission is not part of this backend (out of scope or missing)');
    expect(pass).toBe(true);
  });

  it('Two admins edit the same record', async () => {
    const s: Step[] = [];
    const t = f.A.adminToken;
    const g = await must('g', call('post', '/groups', { token: t, body: { name: `Shared ${u()}`, description: 'v1' } }));
    const before = await step(s, 'Admin 1 opens group', call('get', `/groups/${g.id}`, { token: t }), 200);
    await step(s, 'Admin 2 renames group', call('patch', `/groups/${g.id}`, { token: t, body: { name: `Renamed by 2 ${u()}` } }), 200);
    await step(s, 'Admin 1 saves description from stale form (full object)', call('patch', `/groups/${g.id}`, { token: t, body: { name: before.body.data.name, description: 'v2 by 1' } }), [200, 409]);
    const after = await call('get', `/groups/${g.id}`, { token: t });
    const keptRename = String(after.body.data.name).startsWith('Renamed by 2');
    s.push({ name: 'Admin 2 rename is kept', ok: keptRename, note: `final name "${after.body.data.name}"` });
    const pass = save('sim.concurrent-edit', 'Power admin (two tabs)', s, 'Second save warns about the newer change (409) instead of overwriting', keptRename, 'No optimistic locking (no version/updatedAt check)');
    expect(pass).toBe(true);
  });
});
