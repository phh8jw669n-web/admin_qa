/** Tests, test settings, questions (all question types). */
import { call } from '../helpers/http';
import { flush } from '../helpers/recorder';
import { suite, longText } from '../helpers/dsl';
import { loadFixtures, must, singleChoiceBody, testBody } from '../helpers/fixtures';

const f = loadFixtures();
const EV = 'qa_tests/specs/05-tests-questions.qa.spec.ts';
afterAll(() => flush('05-tests-questions'));
const t = f.A.adminToken;
const code = () => `Q${(Date.now() % 100000000).toString(36)}${Math.floor(Math.random() * 99)}`.slice(0, 10);
const body = (extra: Record<string, unknown> = {}) => testBody('x', f.A.categoryId, f.A.instructionId, f.templateId, { name: `QA test ${code()}`, testCode: code(), ...extra });

describe('Tests', () => {
  const T = suite('Tests', EV);
  let id = '';
  T('tests.create.ok', 'create test', {
    endpoint: 'POST /api/v1/tests', scenario: 'Valid test', expectStatus: 201, expected: '201 test with category, template, instruction',
    run: async () => { const r = await call('post', '/tests', { token: t, body: body() }); id = r.body?.data?.id; return r; },
    verify: (r) => Boolean(r.body.data.category && r.body.data.template),
  });
  T('tests.create.default-published', 'test created without flags is not published', {
    category: 'edge', endpoint: 'POST /api/v1/tests', scenario: 'Body without isDraft/isPublished', expectStatus: 201, expected: '201 isDraft=true and isPublished=false',
    run: () => { const b = body(); delete (b as Record<string, unknown>).isDraft; delete (b as Record<string, unknown>).isPublished; return call('post', '/tests', { token: t, body: b }); },
    verify: (r) => r.body.data.isPublished === false,
  });
  T('tests.create.draft-and-published', 'test cannot be draft and published at the same time', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'isDraft=true and isPublished=true', expectStatus: 400, expected: '400 a draft cannot be published',
    field: 'isDraft/isPublished', rule: 'Mutually exclusive',
    run: () => call('post', '/tests', { token: t, body: body({ isDraft: true, isPublished: true }) }),
  });
  T('tests.create.handicapped-zero', 'handicapped duration left empty (UI sends 0)', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'durationMinutes=60, handicappedDurationMinutes=0', expectStatus: 400, expected: '400 Handicapped duration must be >= duration (UI marks the field optional)',
    field: 'handicappedDurationMinutes', rule: '>= durationMinutes',
    run: () => call('post', '/tests', { token: t, body: body({ handicappedDurationMinutes: 0 }) }),
  });
  T('tests.create.handicapped-equal', 'handicapped equal to duration', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'both = 60', expectStatus: 201, expected: '201 (backend allows equal; UI rejects equal - mismatch)',
    field: 'handicappedDurationMinutes', rule: '>= durationMinutes',
    run: () => call('post', '/tests', { token: t, body: body({ handicappedDurationMinutes: 60 }) }),
  });
  T('tests.create.passing-gt-total', 'passing marks above total', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'passingMarks=50, totalMarks=40', expectStatus: 400, expected: '400 Passing marks cannot be greater than total marks',
    field: 'passingMarks', rule: '<= totalMarks', run: () => call('post', '/tests', { token: t, body: body({ passingMarks: 50 }) }),
  });
  T('tests.create.grace-gt-total', 'grace marks above total', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'graceMarks=500, totalMarks=40', expectStatus: 400, expected: '400 grace marks cannot exceed total marks',
    field: 'graceMarks', rule: '<= totalMarks', run: () => call('post', '/tests', { token: t, body: body({ graceMarks: 500 }) }),
  });
  T('tests.create.huge-marks', 'total marks 1,000,000,000', {
    category: 'error', endpoint: 'POST /api/v1/tests', scenario: 'totalMarks = 1e9 (DB is decimal 10,2)', expectStatus: 400, expected: '400 totalMarks too large',
    field: 'totalMarks', rule: 'Max 99,999,999.99', run: () => call('post', '/tests', { token: t, body: body({ totalMarks: 1_000_000_000, passingMarks: 1 }) }),
  });
  T('tests.create.decimal-duration', 'duration 1.5 minutes', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'durationMinutes = 1.5', expectStatus: 400, expected: '400 durationMinutes must be an integer',
    field: 'durationMinutes', rule: 'Integer', run: () => call('post', '/tests', { token: t, body: body({ durationMinutes: 1.5 }) }),
  });
  T('tests.create.negative', 'negative total questions', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'totalQuestions = -1', expectStatus: 400, expected: '400 totalQuestions must not be less than 1',
    field: 'totalQuestions', rule: 'Min 1', run: () => call('post', '/tests', { token: t, body: body({ totalQuestions: -1 }) }),
  });
  T('tests.create.huge-questions', 'total questions above int4', {
    category: 'error', endpoint: 'POST /api/v1/tests', scenario: 'totalQuestions = 3,000,000,000', expectStatus: 400, expected: '400 too large (not 500)',
    field: 'totalQuestions', rule: 'Max int4', run: () => call('post', '/tests', { token: t, body: body({ totalQuestions: 3_000_000_000 }) }),
  });
  T('tests.create.code-long', 'test code longer than 10', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'testCode = 11 chars', expectStatus: 400, expected: '400 testCode must be <= 10 characters',
    field: 'testCode', rule: 'Max 10', run: () => call('post', '/tests', { token: t, body: body({ testCode: 'ABCDEFGHIJK' }) }),
  });
  T('tests.create.code-dup', 'duplicate test code', {
    category: 'edge', endpoint: 'POST /api/v1/tests', scenario: 'Same testCode twice', expectStatus: 409, expected: '409 This test code is already in use',
    run: async () => { const c = code(); await call('post', '/tests', { token: t, body: body({ testCode: c }) }); return call('post', '/tests', { token: t, body: body({ testCode: c }) }); },
  });
  T('tests.create.end-before-start', 'end date before start date', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'startDate 2030-01-05, endDate 2030-01-01', expectStatus: 400, expected: '400 End date must be on or after start date',
    field: 'endDate', rule: '>= startDate', run: () => call('post', '/tests', { token: t, body: body({ startDate: '2030-01-05', endDate: '2030-01-01' }) }),
  });
  T('tests.create.multiday-time', 'multi-day test with end time earlier than start time', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'Jan 1 18:00 to Jan 3 09:00', expectStatus: 201, expected: '201 (end is 2 days later; UI accepts it)',
    field: 'endTime', rule: 'Compare date+time, not time only',
    run: () => call('post', '/tests', { token: t, body: body({ startDate: '2030-01-01', endDate: '2030-01-03', startTime: '18:00', endTime: '09:00' }) }),
  });
  T('tests.create.leap-day', 'start on 29 Feb (leap year)', {
    category: 'edge', endpoint: 'POST /api/v1/tests', scenario: 'startDate 2028-02-29', expectStatus: 201, expected: '201 saved as 2028-02-29',
    run: () => call('post', '/tests', { token: t, body: body({ startDate: '2028-02-29', endDate: '2028-03-01' }) }), verify: (r) => r.body.data.startDate === '2028-02-29',
  });
  T('tests.create.invalid-date', '30 Feb', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'startDate 2030-02-30', expectStatus: 400, expected: '400 startDate must be a valid date',
    field: 'startDate', rule: 'Real calendar date', run: () => call('post', '/tests', { token: t, body: body({ startDate: '2030-02-30', endDate: '2030-03-02' }) }),
  });
  T('tests.create.past-dates', 'test window fully in the past', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'startDate 2001-01-01, endDate 2001-01-02', expectStatus: 400, expected: '400 dates must not be in the past',
    field: 'startDate', rule: 'Not in past', run: () => call('post', '/tests', { token: t, body: body({ startDate: '2001-01-01', endDate: '2001-01-02' }) }),
  });
  T('tests.create.timezone-date', 'startDate sent as ISO timestamp with offset', {
    category: 'edge', endpoint: 'POST /api/v1/tests', scenario: 'startDate "2030-01-01T23:30:00-05:00"', expectStatus: [201, 400], expected: 'Either 400 (date only) or stored as the local date the admin picked',
    run: () => call('post', '/tests', { token: t, body: body({ startDate: '2030-01-01T23:30:00-05:00', endDate: '2030-01-05' }) }),
    verify: (r) => r.status === 400 || r.body.data.startDate === '2030-01-01',
  });
  T('tests.create.buffer-format', 'start buffer time free text', {
    category: 'validation', endpoint: 'POST /api/v1/tests', scenario: 'startBufferTime = "15 min"', expectStatus: 400, expected: '400 startBufferTime must match HH:MM',
    field: 'startBufferTime', rule: 'HH:MM(:SS)', run: () => call('post', '/tests', { token: t, body: body({ startBufferTime: '15 min' }) }),
  });
  T('tests.create.other-tenant-category', 'category of company B', {
    category: 'security', endpoint: 'POST /api/v1/tests', scenario: 'categoryId of company B', expectStatus: 404, expected: '404 Category not found',
    run: () => call('post', '/tests', { token: t, body: body({ categoryId: f.B.categoryId }) }),
  });
  T('tests.list.ok', 'list tests', {
    endpoint: 'GET /api/v1/tests', scenario: 'Default', expectStatus: 200, expected: '200 items with relations',
    run: () => call('get', '/tests', { token: t }),
  });
  T('tests.list.code-filter', 'filter by test code prefix', {
    category: 'edge', endpoint: 'GET /api/v1/tests', scenario: 'testCode = first 3 chars of a real code', expectStatus: 200, expected: '200 matching tests (like name search)',
    run: async () => { const c = code(); await must('t', call('post', '/tests', { token: t, body: body({ testCode: c }) })); return call('get', '/tests', { token: t, query: { testCode: c.slice(0, 3) } }); },
    verify: (r) => r.body.data.items.length > 0,
  });
  T('tests.get.ok', 'get test', {
    endpoint: 'GET /api/v1/tests/:id', scenario: 'Existing', expectStatus: 200, expected: '200',
    run: () => call('get', `/tests/${id}`, { token: t }),
  });
  T('tests.stats.ok', 'question stats', {
    endpoint: 'GET /api/v1/tests/:id/stats', scenario: 'Fixture test with 1 question', expectStatus: 200, expected: '200 actualQuestions=1, actualMarks=4',
    run: () => call('get', `/tests/${f.A.testId}/stats`, { token: t }), verify: (r) => r.body.data.actualQuestions >= 1,
  });
  T('tests.update.ok', 'update test name', {
    endpoint: 'PATCH /api/v1/tests/:id', scenario: 'Rename', expectStatus: 200, expected: '200',
    run: () => call('patch', `/tests/${id}`, { token: t, body: { name: 'Renamed test' } }), verify: (r) => r.body.data.name === 'Renamed test',
  });
  T('tests.update.clear-dates', 'clear dates with null', {
    category: 'edge', endpoint: 'PATCH /api/v1/tests/:id', scenario: 'startDate=null, endDate=null', expectStatus: 200, expected: '200 dates cleared',
    run: () => call('patch', `/tests/${id}`, { token: t, body: { startDate: null, endDate: null } }),
  });
  T('tests.update.total-below-actual', 'reduce total questions below questions already added', {
    category: 'db', endpoint: 'PATCH /api/v1/tests/:id', scenario: 'Test has 2 questions; set totalQuestions=1', expectStatus: 400, expected: '400 total questions cannot be less than questions already added',
    run: async () => {
      const tt = await must('t', call('post', '/tests', { token: t, body: body({ totalQuestions: 5 }) }));
      await must('q1', call('post', '/questions', { token: t, body: singleChoiceBody(tt.id, f.A.subjectId, f.A.topicId, f.A.languageId, f.A.difficultyId) }));
      await must('q2', call('post', '/questions', { token: t, body: singleChoiceBody(tt.id, f.A.subjectId, f.A.topicId, f.A.languageId, f.A.difficultyId) }));
      return call('patch', `/tests/${tt.id}`, { token: t, body: { totalQuestions: 1 } });
    },
  });
  T('tests.publish.no-questions', 'publish a test that has no questions', {
    category: 'edge', endpoint: 'PATCH /api/v1/tests/:id', scenario: 'isPublished=true with 0 questions and no schedule', expectStatus: 400, expected: '400 add questions and schedule before publishing',
    run: async () => { const tt = await must('t', call('post', '/tests', { token: t, body: body({ startDate: null, endDate: null, startTime: null, endTime: null }) })); return call('patch', `/tests/${tt.id}`, { token: t, body: { isDraft: false, isPublished: true } }); },
  });
  T('tests.concurrent-edit', 'two admins edit the same test at once', {
    category: 'edge', endpoint: 'PATCH /api/v1/tests/:id', scenario: 'Two PATCH requests in parallel with different names', expectStatus: [200, 409], expected: 'Last write wins silently (no version check) - recorded for review',
    run: async () => {
      const [a, b] = await Promise.all([
        call('patch', `/tests/${id}`, { token: t, body: { name: 'Edit by admin 1' } }),
        call('patch', `/tests/${id}`, { token: t, body: { name: 'Edit by admin 2' } }),
      ]);
      return { status: a.status === 200 && b.status === 200 ? 200 : 409, body: { message: `${a.status}/${b.status} both saved, no conflict warning` } };
    },
  });
  T('tests.delete.ok', 'delete test', {
    endpoint: 'DELETE /api/v1/tests/:id', scenario: 'Delete', expectStatus: 200, expected: '200',
    run: () => call('delete', `/tests/${id}`, { token: t }),
  });
  T('tests.delete.with-mappings', 'delete a test that candidates are mapped to', {
    category: 'db', endpoint: 'DELETE /api/v1/tests/:id', scenario: 'Test with candidate mapping and questions', expectStatus: 409, expected: '409 test has candidates (or cascade soft delete of mappings)',
    run: async () => {
      const tt = await must('t', call('post', '/tests', { token: t, body: body() }));
      await must('map', call('post', '/test-candidate-mappings', { token: t, body: { groupId: f.A.groupId, candidateId: f.A.candidateId, testId: tt.id } }));
      return call('delete', `/tests/${tt.id}`, { token: t });
    },
  });
});

describe('Test settings', () => {
  const T = suite('Test Settings', EV);
  T('settings.get-by-test', 'get settings by test', {
    endpoint: 'GET /api/v1/test-settings/test/:testId', scenario: 'Fixture test', expectStatus: 200, expected: '200 settings with defaults',
    run: () => call('get', `/test-settings/test/${f.A.testId}`, { token: t }), verify: (r) => r.body.data.allowQuestionNavigation === true,
  });
  T('settings.duplicate', 'second settings row for a test', {
    category: 'edge', endpoint: 'POST /api/v1/test-settings', scenario: 'Test already has settings', expectStatus: 409, expected: '409 Test settings already exist',
    run: () => call('post', '/test-settings', { token: t, body: { testId: f.A.testId } }),
  });
  T('settings.update', 'update flags', {
    endpoint: 'PATCH /api/v1/test-settings/:id', scenario: 'enableBackspace=true, clockFormat=hh_mm', expectStatus: 200, expected: '200',
    run: () => call('patch', `/test-settings/${f.A.testSettingId}`, { token: t, body: { enableBackspace: true, clockFormat: 'hh_mm' } }),
  });
  T('settings.move-test', 'settings cannot be moved to another test', {
    category: 'security', endpoint: 'PATCH /api/v1/test-settings/:id', scenario: 'testId in update body', expectStatus: 400, expected: '400 property testId should not exist',
    run: () => call('patch', `/test-settings/${f.A.testSettingId}`, { token: t, body: { testId: f.B.testId } }),
  });
  T('settings.other-tenant-test', 'create settings for company B test', {
    category: 'security', endpoint: 'POST /api/v1/test-settings', scenario: 'testId of company B', expectStatus: 404, expected: '404 Test not found',
    run: () => call('post', '/test-settings', { token: t, body: { testId: f.B.testId } }),
  });
  T('settings.long-message', 'very long submission message', {
    category: 'validation', endpoint: 'PATCH /api/v1/test-settings/:id', scenario: 'submissionMessage = 100,000 chars', expectStatus: 400, expected: '400 message too long (no max length today)',
    field: 'submissionMessage', rule: 'Max length', run: () => call('patch', `/test-settings/${f.A.testSettingId}`, { token: t, body: { submissionMessage: longText(90_000) } }),
  });
  T('settings.delete-recreate', 'delete then create again restores row', {
    category: 'edge', endpoint: 'POST /api/v1/test-settings', scenario: 'Delete settings then POST for same test', expectStatus: 201, expected: '201 restored',
    run: async () => {
      const tt = await must('t', call('post', '/tests', { token: t, body: body() }));
      const s = await must('s', call('post', '/test-settings', { token: t, body: { testId: tt.id } }));
      await must('del', call('delete', `/test-settings/${s.id}`, { token: t }));
      return call('post', '/test-settings', { token: t, body: { testId: tt.id, enableBackspace: true } });
    },
  });
});

describe('Questions', () => {
  const T = suite('Questions', EV);
  let testId = '';
  let bigTestId = '';
  let qid = '';
  beforeAll(async () => {
    const tt = await must('t', call('post', '/tests', { token: t, body: body({ totalQuestions: 6 }) }));
    testId = tt.id;
    const big = await must('t2', call('post', '/tests', { token: t, body: body({ totalQuestions: 500 }) }));
    bigTestId = big.id;
  });
  const base = () => singleChoiceBody(testId, f.A.subjectId, f.A.topicId, f.A.languageId, f.A.difficultyId);
  const vbase = () => singleChoiceBody(bigTestId, f.A.subjectId, f.A.topicId, f.A.languageId, f.A.difficultyId);
  const item = (over: Record<string, unknown>) => ({ ...base().questionData[0], ...over });

  T('questions.single.ok', 'single choice question', {
    endpoint: 'POST /api/v1/questions', scenario: 'Valid single choice', expectStatus: 201, expected: '201 question with content',
    run: async () => { const r = await call('post', '/questions', { token: t, body: base() }); qid = r.body?.data?.question?.id; return r; },
  });
  T('questions.multiple.ok', 'multiple choice question', {
    endpoint: 'POST /api/v1/questions', scenario: '3 options, 2 correct', expectStatus: 201, expected: '201',
    run: () => call('post', '/questions', { token: t, body: { ...base(), questionType: 'multiple_choice', questionData: [item({ questionType: 'multiple_choice', options: { options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }], correctOptions: ['a', 'c'] } })] } }),
  });
  T('questions.fill.ok', 'fill in the blank (numbers)', {
    endpoint: 'POST /api/v1/questions', scenario: 'answerType numbers, answer 42', expectStatus: 201, expected: '201',
    run: () => call('post', '/questions', { token: t, body: { ...base(), questionType: 'fill_in_the_blanks', questionData: [item({ questionType: 'fill_in_the_blanks', options: { answerType: 'numbers', answer: '42' } })] } }),
  });
  T('questions.comprehension.ok', 'comprehension with 2 children', {
    endpoint: 'POST /api/v1/questions', scenario: 'Passage + 2 single choice children', expectStatus: 201, expected: '201 with 2 childQuestions',
    run: () => call('post', '/questions', { token: t, body: { ...base(), questionType: 'comprehension', questionData: [item({ questionType: 'comprehension', options: null, questionText: 'Passage' })], childQuestions: [{ questionType: 'single_choice', questionData: [item({})] }, { questionType: 'single_choice', questionData: [item({})] }] } }),
    verify: (r) => r.body.data.childQuestions.length === 2,
  });
  T('questions.limit', 'question count above test total', {
    category: 'edge', endpoint: 'POST /api/v1/questions', scenario: 'Test total 6; 5 used; add comprehension with 2 children', expectStatus: 400, expected: '400 This test already has the maximum number of questions',
    run: () => call('post', '/questions', { token: t, body: { ...base(), questionType: 'comprehension', questionData: [item({ questionType: 'comprehension', options: null })], childQuestions: [{ questionType: 'single_choice', questionData: [item({})] }, { questionType: 'single_choice', questionData: [item({})] }] } }),
  });
  T('questions.single.two-correct', 'single choice with 2 correct answers', {
    category: 'validation', endpoint: 'POST /api/v1/questions', scenario: 'correctOptions [a,b]', expectStatus: 400, expected: '400 SCQ exactly 1 correct',
    field: 'questionData.options', rule: 'Exactly 1 correct', run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionData: [item({ options: { options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptions: ['a', 'b'] } })] } }),
  });
  T('questions.single.dup-option-id', 'two options with the same id', {
    category: 'validation', endpoint: 'POST /api/v1/questions', scenario: 'options a,a', expectStatus: 400, expected: '400', field: 'questionData.options', rule: 'Unique option ids',
    run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionData: [item({ options: { options: [{ id: 'a', text: 'A' }, { id: 'a', text: 'B' }], correctOptions: ['a'] } })] } }),
  });
  T('questions.single.blank-option', 'option text only spaces', {
    category: 'validation', endpoint: 'POST /api/v1/questions', scenario: 'option text "   "', expectStatus: 400, expected: '400', field: 'questionData.options', rule: 'Non-empty text',
    run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionData: [item({ options: { options: [{ id: 'a', text: '   ' }, { id: 'b', text: 'B' }], correctOptions: ['a'] } })] } }),
  });
  T('questions.single.one-option', 'single choice with one option', {
    category: 'validation', endpoint: 'POST /api/v1/questions', scenario: 'Only 1 option', expectStatus: 400, expected: '400 at least 2 choices', field: 'questionData.options', rule: 'Min 2 options',
    run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionData: [item({ options: { options: [{ id: 'a', text: 'A' }], correctOptions: ['a'] } })] } }),
  });
  T('questions.fill.nan', 'fill numbers with text answer', {
    category: 'validation', endpoint: 'POST /api/v1/questions', scenario: 'answerType numbers, answer "abc"', expectStatus: 400, expected: '400', field: 'questionData.options.answer', rule: 'Numeric when answerType=numbers',
    run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionType: 'fill_in_the_blanks', questionData: [item({ questionType: 'fill_in_the_blanks', options: { answerType: 'numbers', answer: 'abc' } })] } }),
  });
  T('questions.type-mismatch', 'content type differs from question type', {
    category: 'validation', endpoint: 'POST /api/v1/questions', scenario: 'questionType single, item multiple', expectStatus: 400, expected: '400 questionData.questionType must match',
    field: 'questionData.questionType', rule: 'Match parent', run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionData: [item({ questionType: 'multiple_choice' })] } }),
  });
  T('questions.dup-language', 'same language twice', {
    category: 'validation', endpoint: 'POST /api/v1/questions', scenario: 'Two items with same languageId', expectStatus: 400, expected: '400 duplicate languageId',
    field: 'questionData.languageId', rule: 'Unique per question', run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionData: [item({}), item({})] } }),
  });
  T('questions.negative-marks-sign', 'negative marks bigger than right marks', {
    category: 'validation', endpoint: 'POST /api/v1/questions', scenario: 'rightMarks=1, negativeMarks=50', expectStatus: 400, expected: '400 negative marks cannot exceed right marks',
    field: 'negativeMarks', rule: '<= rightMarks', run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionData: [item({ rightMarks: 1, negativeMarks: 50 })] } }),
  });
  T('questions.negative-right-marks', 'right marks negative', {
    category: 'validation', endpoint: 'POST /api/v1/questions', scenario: 'rightMarks=-4', expectStatus: 400, expected: '400 rightMarks must be >= 0', field: 'rightMarks', rule: 'Min 0',
    run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionData: [item({ rightMarks: -4 })] } }),
  });
  T('questions.marks-overflow', 'right marks above decimal(10,2)', {
    category: 'error', endpoint: 'POST /api/v1/questions', scenario: 'rightMarks = 1e10', expectStatus: 400, expected: '400 too large (not 500)', field: 'rightMarks', rule: 'Max 99,999,999.99',
    run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionData: [item({ rightMarks: 1e10 })] } }),
  });
  T('questions.topic-not-mapped', 'topic not mapped to subject/category of the test', {
    category: 'validation', endpoint: 'POST /api/v1/questions', scenario: 'New topic with no CST mapping', expectStatus: 400, expected: '400 topic is not part of this subject/category',
    field: 'topicId', rule: 'Must be mapped (CST)',
    run: async () => { const tp = await must('topic', call('post', '/topics', { token: t, body: { name: `Unmapped ${Date.now()}`, ranking: 1 } })); return call('post', '/questions', { token: t, body: { ...vbase(), topicId: tp.id } }); },
  });
  T('questions.other-tenant-language', 'language of company B', {
    category: 'security', endpoint: 'POST /api/v1/questions', scenario: 'languageId of company B', expectStatus: 404, expected: '404 Language not found',
    run: () => call('post', '/questions', { token: t, body: { ...vbase(), questionData: [item({ languageId: f.B.languageId })] } }),
  });
  T('questions.other-tenant-test', 'test of company B', {
    category: 'security', endpoint: 'POST /api/v1/questions', scenario: 'testId of company B', expectStatus: 404, expected: '404 Test not found',
    run: () => call('post', '/questions', { token: t, body: { ...vbase(), testId: f.B.testId } }),
  });
  T('questions.list', 'list questions of a test', {
    endpoint: 'GET /api/v1/questions', scenario: 'testId filter', expectStatus: 200, expected: '200 list without children',
    run: () => call('get', '/questions', { token: t, query: { testId } }),
  });
  T('questions.get', 'get question', {
    endpoint: 'GET /api/v1/questions/:id', scenario: 'Single choice', expectStatus: 200, expected: '200 with questionData',
    run: () => call('get', `/questions/${qid}`, { token: t }), verify: (r) => r.body.data.questionData.length === 1,
  });
  T('questions.update.content', 'update question text', {
    endpoint: 'PATCH /api/v1/questions/:id', scenario: 'questionData with existing id', expectStatus: 200, expected: '200 new text',
    run: async () => {
      const q = await must('get', call('get', `/questions/${qid}`, { token: t }));
      const cid = q.questionData[0].id;
      return call('patch', `/questions/${qid}`, { token: t, body: { questionData: [item({ id: cid, questionText: 'Updated text' })] } });
    },
    verify: (r) => r.body.data.questionData[0].questionText === 'Updated text',
  });
  T('questions.update.foreign-content-id', 'content id of another question', {
    category: 'security', endpoint: 'PATCH /api/v1/questions/:id', scenario: 'questionData.id from fixture question', expectStatus: 400, expected: '400 questionData.id does not belong to this question',
    run: async () => {
      const q = await must('get', call('get', `/questions/${f.A.questionId}`, { token: t }));
      return call('patch', `/questions/${qid}`, { token: t, body: { questionData: [item({ id: q.questionData[0].id })] } });
    },
  });
  T('questions.update.child-to-comprehension', 'make a single choice a comprehension with children', {
    category: 'edge', endpoint: 'PATCH /api/v1/questions/:id', scenario: 'Change type to comprehension without questionData', expectStatus: 400, expected: '400 content type mismatch',
    run: () => call('patch', `/questions/${qid}`, { token: t, body: { questionType: 'comprehension' } }),
  });
  T('questions.paper-cache-cleared', 'candidate paper updates after question edit', {
    module: 'Candidate Exam', category: 'edge', endpoint: 'GET /api/v1/candidates/tests/:testId/questions', scenario: 'Edit fixture question text then read paper', expectStatus: 200, expected: '200 paper shows new text',
    run: async () => {
      await call('get', `/candidates/tests/${f.A.testId}/questions`, { token: f.A.candidateToken });
      const q = await must('get', call('get', `/questions/${f.A.questionId}`, { token: t }));
      await must('patch', call('patch', `/questions/${f.A.questionId}`, { token: t, body: { questionData: [{ ...item({}), id: q.questionData[0].id, questionText: 'Paper refresh check' }] } }));
      return call('get', `/candidates/tests/${f.A.testId}/questions`, { token: f.A.candidateToken });
    },
    verify: (r) => JSON.stringify(r.body).includes('Paper refresh check'),
  });
  T('questions.delete', 'delete question', {
    endpoint: 'DELETE /api/v1/questions/:id', scenario: 'Delete single choice', expectStatus: 200, expected: '200',
    run: () => call('delete', `/questions/${qid}`, { token: t }),
  });
  T('questions.slot-freed', 'deleted question frees a slot', {
    category: 'edge', endpoint: 'POST /api/v1/questions', scenario: 'Add a question after delete', expectStatus: 201, expected: '201',
    run: () => call('post', '/questions', { token: t, body: vbase() }),
  });
  T('questions.parallel-limit', 'parallel creates cannot exceed the test limit', {
    category: 'edge', endpoint: 'POST /api/v1/questions', scenario: 'Test total 3, send 6 creates at once', expectStatus: 200, expected: 'Exactly 3 succeed (row lock)',
    run: async () => {
      const tt = await must('t', call('post', '/tests', { token: t, body: body({ totalQuestions: 3 }) }));
      const b = singleChoiceBody(tt.id, f.A.subjectId, f.A.topicId, f.A.languageId, f.A.difficultyId);
      const res = await Promise.all(Array.from({ length: 6 }, () => call('post', '/questions', { token: t, body: b })));
      const ok = res.filter((r) => r.status === 201).length;
      return { status: ok === 3 ? 200 : 500, body: { message: `${ok} of 6 created` } };
    },
  });
});
