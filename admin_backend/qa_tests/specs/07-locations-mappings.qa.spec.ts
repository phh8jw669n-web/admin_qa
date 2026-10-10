/** Zones, regions, centres, labs, centre users, events, sessions, mappings. */
import { call } from '../helpers/http';
import { flush } from '../helpers/recorder';
import { suite } from '../helpers/dsl';
import { candidateBody, centreBody, loadFixtures, must, todayUtc } from '../helpers/fixtures';

const f = loadFixtures();
const EV = 'qa_tests/specs/07-locations-mappings.qa.spec.ts';
afterAll(() => flush('07-locations-mappings'));
const t = f.A.adminToken;
const u = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

describe('Locations', () => {
  const T = suite('Locations', EV);
  T('regions.lat-out-of-range', 'latitude 91', {
    module: 'Regions', category: 'validation', endpoint: 'POST /api/v1/regions', scenario: 'latitude=91', expectStatus: 400, expected: '400 latitude must be a latitude', field: 'latitude', rule: '-90..90',
    run: () => call('post', '/regions', { token: t, body: { zoneId: f.A.zoneId, name: `R ${u()}`, latitude: 91, longitude: 1, stateName: 'S' } }),
  });
  T('regions.other-tenant-zone', 'region in company B zone', {
    module: 'Regions', category: 'security', endpoint: 'POST /api/v1/regions', scenario: 'zoneId of company B', expectStatus: 404, expected: '404 Zone not found',
    run: () => call('post', '/regions', { token: t, body: { zoneId: f.B.zoneId, name: `R ${u()}`, latitude: 1, longitude: 1, stateName: 'S' } }),
  });
  T('centres.region-zone-mismatch', 'centre with region from another zone', {
    module: 'Centres', category: 'validation', endpoint: 'POST /api/v1/centres', scenario: 'regionId not in zoneId', expectStatus: 404, expected: '404 Region not found',
    run: async () => { const z = await must('z', call('post', '/zones', { token: t, body: { name: `Z ${u()}` } })); return call('post', '/centres', { token: t, body: centreBody(z.id, f.A.regionId, `CC-${u()}`, u()) }); },
  });
  T('centres.dup-code', 'duplicate centre code', {
    module: 'Centres', category: 'edge', endpoint: 'POST /api/v1/centres', scenario: 'Code of fixture centre', expectStatus: 409, expected: '409 This centre code is already in use',
    run: () => call('post', '/centres', { token: t, body: centreBody(f.A.zoneId, f.A.regionId, f.A.centreCode, u()) }),
  });
  T('centres.dup-code-case', 'duplicate centre code in lower case', {
    module: 'Centres', category: 'edge', endpoint: 'POST /api/v1/centres', scenario: 'Code in lower case', expectStatus: 409, expected: '409 (candidates type codes in any case)',
    run: () => call('post', '/centres', { token: t, body: centreBody(f.A.zoneId, f.A.regionId, f.A.centreCode.toLowerCase(), u()) }),
  });
  T('centres.seats-vs-labs', 'lab seats larger than centre seats', {
    module: 'Labs', category: 'validation', endpoint: 'POST /api/v1/labs', scenario: 'Centre has 30 seats, lab 5000', expectStatus: 400, expected: '400 lab seats cannot exceed centre seats', field: 'seats', rule: '<= centre seats',
    run: () => call('post', '/labs', { token: t, body: { zoneId: f.A.zoneId, regionId: f.A.regionId, centreId: f.A.centreId, name: `L ${u()}`, sessionCount: 1, seats: 5000 } }),
  });
  T('labs.huge-seats', 'lab seats above int4', {
    module: 'Labs', category: 'error', endpoint: 'POST /api/v1/labs', scenario: 'seats = 3,000,000,000', expectStatus: 400, expected: '400 (no Max on seats today)', field: 'seats', rule: 'Max int4',
    run: () => call('post', '/labs', { token: t, body: { zoneId: f.A.zoneId, regionId: f.A.regionId, centreId: f.A.centreId, name: `L ${u()}`, sessionCount: 1, seats: 3_000_000_000 } }),
  });
  T('zones.delete-in-use', 'delete zone that has regions and centres', {
    module: 'Zones', category: 'db', endpoint: 'DELETE /api/v1/zones/:id', scenario: 'Zone with region + centre', expectStatus: 409, expected: '409 zone in use',
    run: async () => {
      const z = await must('z', call('post', '/zones', { token: t, body: { name: `Z ${u()}` } }));
      await must('r', call('post', '/regions', { token: t, body: { zoneId: z.id, name: `R ${u()}`, latitude: 1, longitude: 1, stateName: 'S' } }));
      return call('delete', `/zones/${z.id}`, { token: t });
    },
  });
  T('centres.delete-in-use', 'delete centre that has mapped candidates', {
    module: 'Centres', category: 'db', endpoint: 'DELETE /api/v1/centres/:id', scenario: 'Centre with candidate mapping + centre user', expectStatus: 409, expected: '409 centre in use',
    run: async () => {
      const c = await must('c', call('post', '/centres', { token: t, body: centreBody(f.A.zoneId, f.A.regionId, `DEL-${u()}`, u()) }));
      await must('cu', call('post', '/centre-users', { token: t, body: { centreId: c.id, name: 'X', email: `cux.${u()}@qa.test` } }));
      return call('delete', `/centres/${c.id}`, { token: t });
    },
  });
});

describe('Centre users', () => {
  const T = suite('Centre Users', EV);
  T('cu.create.default-password', 'centre user created without password uses the shared default', {
    category: 'security', endpoint: 'POST /api/v1/centre-users/login', scenario: 'Login with DEFAULT_ADMIN_PASSWORD', expectStatus: 401, expected: '401 (no shared default password)',
    run: async () => {
      const email = `cud.${u()}@qa.test`;
      await must('cu', call('post', '/centre-users', { token: t, body: { centreId: f.A.centreId, name: 'D', email } }));
      return call('post', '/centre-users/login', { body: { companyToken: f.A.companyToken, email, password: process.env.QA_DEFAULT_ADMIN_PASSWORD ?? 'QaDefault@123' } });
    },
  });
  T('cu.list', 'list centre users', {
    endpoint: 'GET /api/v1/centre-users', scenario: 'centreId filter', expectStatus: 200, expected: '200 without password',
    run: () => call('get', '/centre-users', { token: t, query: { centreId: f.A.centreId } }), verify: (r) => !/password/i.test(JSON.stringify(r.body)),
  });
  T('cu.other-tenant-centre', 'centre user for company B centre', {
    category: 'security', endpoint: 'POST /api/v1/centre-users', scenario: 'centreId of company B', expectStatus: 404, expected: '404 Centre not found',
    run: () => call('post', '/centre-users', { token: t, body: { centreId: f.B.centreId, email: `x.${u()}@qa.test` } }),
  });
  T('cu.login', 'centre user login', {
    endpoint: 'POST /api/v1/centre-users/login', scenario: 'Valid', expectStatus: 200, expected: '200 tokens',
    run: () => call('post', '/centre-users/login', { body: { companyToken: f.A.companyToken, email: f.A.centreUserEmail, password: f.A.centreUserPassword } }),
  });
  T('cu.me', 'centre user me', {
    endpoint: 'GET /api/v1/centre-users/me', scenario: 'Valid token', expectStatus: 200, expected: '200 profile',
    run: () => call('get', '/centre-users/me', { token: f.A.centreUserToken }),
  });
  T('cu.no-features', 'centre user has no centre features', {
    category: 'auth', endpoint: 'GET /api/v1/candidate-centre-mappings', scenario: 'Centre user lists candidates of own centre', expectStatus: 200, expected: 'Centre staff can see candidates for their centre (no endpoint exists today)',
    run: () => call('get', '/candidate-centre-mappings', { token: f.A.centreUserToken, query: { centreId: f.A.centreId } }), role: 'Centre user (A)',
  });
  T('cu.deactivated', 'deactivated centre user is blocked', {
    category: 'security', endpoint: 'GET /api/v1/centre-users/me', scenario: 'Admin sets isActive=false', expectStatus: 401, expected: '401',
    run: async () => {
      const email = `cua.${u()}@qa.test`;
      const cu = await must('cu', call('post', '/centre-users', { token: t, body: { centreId: f.A.centreId, name: 'A', email, password: 'Centre@12345' } }));
      const l = await must('login', call('post', '/centre-users/login', { body: { companyToken: f.A.companyToken, email, password: 'Centre@12345' } }));
      await must('deact', call('patch', `/centre-users/${cu.id}`, { token: t, body: { isActive: false } }));
      return call('get', '/centre-users/me', { token: l.accessToken });
    },
  });
});

describe('Events and sessions', () => {
  const T = suite('Events', EV);
  T('events.closing-before-opening', 'closing before opening', {
    category: 'validation', endpoint: 'POST /api/v1/events', scenario: 'closing < opening', expectStatus: 400, expected: '400 Event closing time must be after opening time', field: 'eventClosingAt', rule: '> eventOpeningAt',
    run: () => call('post', '/events', { token: t, body: { name: 'E', eventCode: `E-${u()}`, examType: 'pbt', eventType: 'mock', eventOpeningAt: '2030-01-02T00:00:00Z', eventClosingAt: '2030-01-01T00:00:00Z' } }),
  });
  T('events.dup-code', 'duplicate event code', {
    category: 'edge', endpoint: 'POST /api/v1/events', scenario: 'Same eventCode twice', expectStatus: 409, expected: '409 This event code is already in use',
    run: async () => { const c = `E-${u()}`; const b = { name: 'E', eventCode: c, examType: 'pbt', eventType: 'mock', eventOpeningAt: '2030-01-01T00:00:00Z', eventClosingAt: '2030-01-02T00:00:00Z' }; await call('post', '/events', { token: t, body: b }); return call('post', '/events', { token: t, body: b }); },
  });
  T('events.instruction-after-close', 'instruction time after event closes', {
    category: 'validation', endpoint: 'POST /api/v1/events', scenario: 'instructionAt 2031 for event in 2030', expectStatus: 400, expected: '400 instructionAt must be inside the event window', field: 'instructionAt', rule: 'Within window',
    run: () => call('post', '/events', { token: t, body: { name: 'E', eventCode: `E-${u()}`, examType: 'pbt', eventType: 'mock', eventOpeningAt: '2030-01-01T00:00:00Z', eventClosingAt: '2030-01-02T00:00:00Z', instructionAt: '2031-01-01T00:00:00Z' } }),
  });
  const S = suite('Sessions', EV);
  S('sessions.code', 'session code is generated', {
    endpoint: 'POST /api/v1/sessions', scenario: 'Valid session', expectStatus: 201, expected: '201 code SES-xx',
    run: () => call('post', '/sessions', { token: t, body: { name: `S ${u()}`, startDate: '2030-02-01', endDate: '2030-02-02', startTime: '09:00', endTime: '10:00' } }), verify: (r) => /^SES-\d+$/.test(r.body.data.code),
  });
  S('sessions.same-day', 'one-day session', {
    category: 'validation', endpoint: 'POST /api/v1/sessions', scenario: 'startDate = endDate', expectStatus: 201, expected: '201 (a session can be on one day, like tests)', field: 'endDate', rule: '>= startDate',
    run: () => call('post', '/sessions', { token: t, body: { name: `S ${u()}`, startDate: '2030-02-01', endDate: '2030-02-01', startTime: '09:00', endTime: '10:00' } }),
  });
  S('sessions.parallel-codes', 'parallel creates get unique codes', {
    category: 'db', endpoint: 'POST /api/v1/sessions', scenario: '5 sessions created at once', expectStatus: 200, expected: 'All 5 created with different codes',
    run: async () => {
      const res = await Promise.all(Array.from({ length: 5 }, (_, i) => call('post', '/sessions', { token: t, body: { name: `P${i} ${u()}`, startDate: '2030-02-01', endDate: '2030-02-02', startTime: '09:00', endTime: '10:00' } })));
      const ok = res.filter((r) => r.status === 201);
      const codes = new Set(ok.map((r) => r.body.data.code));
      return { status: ok.length === 5 && codes.size === 5 ? 200 : 500, body: { message: `${ok.length}/5 created; statuses ${res.map((r) => r.status).join(',')}` } };
    },
  });
  S('companies.parallel-codes', 'parallel company creates get unique company codes', {
    module: 'Companies', category: 'db', endpoint: 'POST /api/v1/super-admin/companies', scenario: '4 companies created at once', expectStatus: 200, expected: 'All 4 created with unique CO- codes',
    run: async () => {
      const { companyBody } = await import('../helpers/fixtures');
      const res = await Promise.all(Array.from({ length: 4 }, () => { const s = `pc${u()}`; return call('post', '/super-admin/companies', { token: f.superAdminToken, body: companyBody(s, `pc.${s}@qa.test`, 'Owner@12345') }); }));
      const ok = res.filter((r) => r.status === 201);
      return { status: ok.length === 4 ? 200 : 500, body: { message: `${ok.length}/4 created; statuses ${res.map((r) => r.status).join(',')}; ${res.find((r) => r.status !== 201)?.body?.message ?? ''}` } };
    },
  });
});

describe('Test-candidate and candidate-centre mappings', () => {
  const T = suite('Test-Candidate Mappings', EV);
  let newTest = '';
  beforeAll(async () => {
    const tt = await must('t', call('post', '/tests', { token: t, body: { name: 'Map test', testCode: `MP${Date.now() % 100000}`, categoryId: f.A.categoryId, primaryInstructionId: f.A.instructionId, durationMinutes: 10, handicappedDurationMinutes: 10, totalQuestions: 1, totalMarks: 1, passingMarks: 0, graceMarks: 0, templateId: f.templateId } }));
    newTest = tt.id;
  });
  T('tcm.assign-groups', 'assign test to group', {
    endpoint: 'POST /api/v1/test-candidate-mappings/assign-groups', scenario: 'Fixture group', expectStatus: 201, expected: '201 assigned >= 1',
    run: () => call('post', '/test-candidate-mappings/assign-groups', { token: t, body: { testId: newTest, groupIds: [f.A.groupId] } }), verify: (r) => r.body.data.assigned >= 1,
  });
  T('tcm.assign-groups-again', 'assign same group again', {
    category: 'edge', endpoint: 'POST /api/v1/test-candidate-mappings/assign-groups', scenario: 'Repeat', expectStatus: 201, expected: '201 assigned 0, alreadyAssigned >= 1',
    run: () => call('post', '/test-candidate-mappings/assign-groups', { token: t, body: { testId: newTest, groupIds: [f.A.groupId] } }), verify: (r) => r.body.data.assigned === 0,
  });
  T('tcm.assign-inactive', 'inactive candidates are not assigned', {
    category: 'edge', endpoint: 'POST /api/v1/test-candidate-mappings/assign-groups', scenario: 'Group with 1 inactive candidate', expectStatus: 201, expected: 'assigned 0 (inactive skipped)',
    run: async () => {
      const g = await must('g', call('post', '/groups', { token: t, body: { name: `IG ${u()}` } }));
      const s = u();
      await must('c', call('post', '/candidates', { token: t, body: { ...candidateBody(`ig.${s}@qa.test`, `IG-${s}`, g.id), isActive: false } }));
      return call('post', '/test-candidate-mappings/assign-groups', { token: t, body: { testId: newTest, groupIds: [g.id] } });
    },
    verify: (r) => r.body.data.assigned === 0,
  });
  T('tcm.assign-email', 'assign by comma email list with spaces and upper case', {
    category: 'edge', endpoint: 'POST /api/v1/test-candidate-mappings/assign-email', scenario: `email = " ${'X'} , ${'Y'} " style list`, expectStatus: 201, expected: '201 emails trimmed and lower-cased',
    run: async () => {
      const tt = await must('t', call('post', '/tests', { token: t, body: { name: 'Email map', testCode: `EM${Date.now() % 100000}`, categoryId: f.A.categoryId, primaryInstructionId: f.A.instructionId, durationMinutes: 10, handicappedDurationMinutes: 10, totalQuestions: 1, totalMarks: 1, passingMarks: 0, graceMarks: 0, templateId: f.templateId } }));
      return call('post', '/test-candidate-mappings/assign-email', { token: t, body: { testId: tt.id, email: ` ${f.A.candidateEmail.toUpperCase()} , ` } });
    },
  });
  T('tcm.assign-email-unknown', 'unknown email in list', {
    endpoint: 'POST /api/v1/test-candidate-mappings/assign-email', scenario: 'One unknown email', expectStatus: 404, expected: '404 Candidate not found: <email>',
    run: () => call('post', '/test-candidate-mappings/assign-email', { token: t, body: { testId: newTest, email: `${f.A.candidateEmail},ghost@qa.test` } }),
  });
  T('tcm.assign-email-other-tenant', 'email of a company B candidate', {
    category: 'security', endpoint: 'POST /api/v1/test-candidate-mappings/assign-email', scenario: 'Company B candidate email', expectStatus: 404, expected: '404 Candidate not found',
    run: async () => {
      const s = u();
      await must('B cand', call('post', '/candidates', { token: f.B.adminToken, body: candidateBody(`onlyb.${s}@qa.test`, `OB-${s}`, f.B.groupId) }));
      return call('post', '/test-candidate-mappings/assign-email', { token: t, body: { testId: newTest, email: `onlyb.${s}@qa.test` } });
    },
  });
  T('tcm.candidate-not-in-group', 'create mapping with group the candidate is not in', {
    category: 'validation', endpoint: 'POST /api/v1/test-candidate-mappings', scenario: 'groupId of another group', expectStatus: 400, expected: '400 candidate is not a member of the group', field: 'groupId', rule: 'Candidate in group',
    run: async () => { const g = await must('g', call('post', '/groups', { token: t, body: { name: `NG ${u()}` } })); return call('post', '/test-candidate-mappings', { token: t, body: { groupId: g.id, candidateId: f.A.candidateId, testId: newTest, attemptNo: 2 } }); },
  });
  T('tcm.result-overflow', 'result 1000 (DB decimal 5,2)', {
    category: 'error', endpoint: 'PATCH /api/v1/test-candidate-mappings/:id', scenario: 'result = 1000', expectStatus: 400, expected: '400 result too large (not 500)', field: 'result', rule: 'Max 999.99',
    run: () => call('patch', `/test-candidate-mappings/${f.A.testCandidateMappingId}`, { token: t, body: { result: 1000 } }),
  });
  T('tcm.percentage-over-100', 'percentage 150', {
    category: 'validation', endpoint: 'PATCH /api/v1/test-candidate-mappings/:id', scenario: 'percentage = 150', expectStatus: 400, expected: '400 percentage must be <= 100', field: 'percentage', rule: '0-100',
    run: () => call('patch', `/test-candidate-mappings/${f.A.testCandidateMappingId}`, { token: t, body: { percentage: 150 } }),
  });
  T('tcm.answers-gt-attempted', 'correct + wrong more than attempted', {
    category: 'validation', endpoint: 'PATCH /api/v1/test-candidate-mappings/:id', scenario: 'attempted 1, correct 5, wrong 5', expectStatus: 400, expected: '400 counts do not add up', field: 'correctAnswers', rule: 'correct+wrong <= attempted',
    run: () => call('patch', `/test-candidate-mappings/${f.A.testCandidateMappingId}`, { token: t, body: { attemptedQuestions: 1, correctAnswers: 5, wrongAnswers: 5 } }),
  });
  T('tcm.completed-before-started', 'completedAt before startedAt', {
    category: 'validation', endpoint: 'PATCH /api/v1/test-candidate-mappings/:id', scenario: 'started 10:00, completed 09:00', expectStatus: 400, expected: '400 completedAt must be after startedAt', field: 'completedAt', rule: '> startedAt',
    run: () => call('patch', `/test-candidate-mappings/${f.A.testCandidateMappingId}`, { token: t, body: { startedAt: '2030-01-01T10:00:00Z', completedAt: '2030-01-01T09:00:00Z' } }),
  });
  T('tcm.move-test', 'change mapping to another test', {
    category: 'db', endpoint: 'PATCH /api/v1/test-candidate-mappings/:id', scenario: 'testId changed to new test', expectStatus: 200, expected: '200 and the mapping now points to the new test',
    run: async () => {
      const m = await must('m', call('post', '/test-candidate-mappings', { token: t, body: { groupId: f.A.groupId, candidateId: f.A.candidateId, testId: f.A.testId, attemptNo: 7 } }));
      await call('patch', `/test-candidate-mappings/${m.id}`, { token: t, body: { testId: newTest } });
      return call('get', `/test-candidate-mappings/${m.id}`, { token: t });
    },
    verify: (r) => r.body.data.testId === newTest,
  });
  T('tcm.list', 'list mappings with relations', {
    endpoint: 'GET /api/v1/test-candidate-mappings', scenario: 'testId filter', expectStatus: 200, expected: '200, candidate relation without secrets',
    run: () => call('get', '/test-candidate-mappings', { token: t, query: { testId: f.A.testId } }), verify: (r) => !/passwordHash|refreshTokenHash/.test(JSON.stringify(r.body)),
  });

  const C = suite('Candidate-Centre Mappings', EV);
  C('ccm.dup', 'same candidate, centre and date twice', {
    category: 'edge', endpoint: 'POST /api/v1/candidate-centre-mappings', scenario: 'Duplicate of fixture mapping', expectStatus: 409, expected: '409 already mapped on this date',
    run: () => call('post', '/candidate-centre-mappings', { token: t, body: { candidateId: f.A.candidateId, centreId: f.A.centreId, examDate: todayUtc() } }),
  });
  C('ccm.two-centres-same-day', 'candidate mapped to two centres on the same day', {
    category: 'validation', endpoint: 'POST /api/v1/candidate-centre-mappings', scenario: 'Second centre, same date', expectStatus: 409, expected: '409 a candidate can only sit at one centre per day', field: 'examDate', rule: 'One centre per day',
    run: async () => {
      const c = await must('c', call('post', '/centres', { token: t, body: centreBody(f.A.zoneId, f.A.regionId, `TW-${u()}`, u()) }));
      return call('post', '/candidate-centre-mappings', { token: t, body: { candidateId: f.A.candidateId, centreId: c.id, examDate: todayUtc() } });
    },
  });
  C('ccm.past-date', 'exam date in the past', {
    category: 'validation', endpoint: 'POST /api/v1/candidate-centre-mappings', scenario: 'examDate 2001-01-01', expectStatus: 400, expected: '400 exam date in the past', field: 'examDate', rule: 'Today or later',
    run: () => call('post', '/candidate-centre-mappings', { token: t, body: { candidateId: f.A.candidateId, centreId: f.A.centreId, examDate: '2001-01-01' } }),
  });
  C('ccm.bad-date', 'exam date 2030-02-30', {
    category: 'error', endpoint: 'POST /api/v1/candidate-centre-mappings', scenario: 'Impossible date', expectStatus: 400, expected: '400 invalid date (not 500)', field: 'examDate', rule: 'Real date',
    run: () => call('post', '/candidate-centre-mappings', { token: t, body: { candidateId: f.A.candidateId, centreId: f.A.centreId, examDate: '2030-02-30' } }),
  });
});
