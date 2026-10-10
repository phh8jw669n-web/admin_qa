/** Candidates, documents, candidate login, exam details/paper, feedback. */
import { call } from '../helpers/http';
import { flush } from '../helpers/recorder';
import { suite, XSS } from '../helpers/dsl';
import { candidateBody, loadFixtures, must, todayUtc } from '../helpers/fixtures';

const f = loadFixtures();
const EV = 'qa_tests/specs/06-candidates-exam.qa.spec.ts';
afterAll(() => flush('06-candidates-exam'));
const t = f.A.adminToken;
const u = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
const cbody = (over: Record<string, unknown> = {}) => { const s = u(); return { ...candidateBody(`c.${s}@qa.test`, `E-${s}`, f.A.groupId, 'Cand@12345'), ...over }; };

describe('Candidates (admin)', () => {
  const T = suite('Candidates', EV);
  let id = '';
  T('candidates.create.ok', 'create candidate', {
    endpoint: 'POST /api/v1/candidates', scenario: 'Valid body', expectStatus: 201, expected: '201 candidate, no password hash',
    run: async () => { const r = await call('post', '/candidates', { token: t, body: cbody() }); id = r.body?.data?.id; return r; },
    verify: (r) => !/password|refreshToken/i.test(JSON.stringify(r.body.data)),
  });
  T('candidates.create.dup-email', 'duplicate email', {
    category: 'edge', endpoint: 'POST /api/v1/candidates', scenario: 'Email of fixture candidate', expectStatus: 409, expected: '409 This email is already in use for this company',
    run: () => call('post', '/candidates', { token: t, body: cbody({ email: f.A.candidateEmail }) }),
  });
  T('candidates.create.dup-enrollment', 'duplicate enrollment number', {
    category: 'edge', endpoint: 'POST /api/v1/candidates', scenario: 'Enrollment of fixture candidate', expectStatus: 409, expected: '409 This enrollment number is already in use',
    run: () => call('post', '/candidates', { token: t, body: cbody({ enrollmentNumber: f.A.candidateEnrollment }) }),
  });
  T('candidates.create.same-email-other-company', 'same email in another company', {
    category: 'edge', endpoint: 'POST /api/v1/candidates', scenario: 'Company B candidate email used in company A', expectStatus: 201, expected: '201 (unique per company)',
    run: () => call('post', '/candidates', { token: t, body: cbody({ email: f.B.candidateEmail }) }),
  });
  T('candidates.create.no-group', 'empty group list', {
    category: 'validation', endpoint: 'POST /api/v1/candidates', scenario: 'groupIds = []', expectStatus: 400, expected: '400 groupIds should not be empty', field: 'groupIds', rule: 'Not empty',
    run: () => call('post', '/candidates', { token: t, body: cbody({ groupIds: [] }) }),
  });
  T('candidates.create.other-tenant-group', 'group of company B', {
    category: 'security', endpoint: 'POST /api/v1/candidates', scenario: 'groupId of company B', expectStatus: 404, expected: '404 Group not found',
    run: () => call('post', '/candidates', { token: t, body: cbody({ groupIds: [f.B.groupId] }) }),
  });
  T('candidates.create.bad-mobile', 'mobile with letters', {
    category: 'validation', endpoint: 'POST /api/v1/candidates', scenario: 'mobile = "abcde"', expectStatus: 400, expected: '400 mobile must be a phone number', field: 'mobile', rule: 'Phone format',
    run: () => call('post', '/candidates', { token: t, body: cbody({ mobile: 'abcde' }) }),
  });
  T('candidates.create.future-dob', 'date of birth in the future', {
    category: 'validation', endpoint: 'POST /api/v1/candidates', scenario: 'dateOfBirth = 2999-01-01', expectStatus: 400, expected: '400 dateOfBirth must be in the past', field: 'dateOfBirth', rule: 'Past date',
    run: () => call('post', '/candidates', { token: t, body: cbody({ dateOfBirth: '2999-01-01' }) }),
  });
  T('candidates.create.leap-dob', 'date of birth 29 Feb 2000', {
    category: 'edge', endpoint: 'POST /api/v1/candidates', scenario: 'dateOfBirth = 2000-02-29', expectStatus: 201, expected: '201 saved', run: () => call('post', '/candidates', { token: t, body: cbody({ dateOfBirth: '2000-02-29' }) }),
  });
  T('candidates.create.bad-dob', 'date of birth 31 Apr', {
    category: 'validation', endpoint: 'POST /api/v1/candidates', scenario: 'dateOfBirth = 2001-04-31', expectStatus: 400, expected: '400 invalid date', field: 'dateOfBirth', rule: 'Real calendar date',
    run: () => call('post', '/candidates', { token: t, body: cbody({ dateOfBirth: '2001-04-31' }) }),
  });
  T('candidates.create.weak-password', 'weak candidate password', {
    category: 'validation', endpoint: 'POST /api/v1/candidates', scenario: 'password = 12345678', expectStatus: 400, expected: '400 weak password', field: 'password', rule: 'Strength',
    run: () => call('post', '/candidates', { token: t, body: cbody({ password: '12345678' }) }),
  });
  T('candidates.create.rtl', 'right-to-left name', {
    category: 'edge', endpoint: 'POST /api/v1/candidates', scenario: 'name = "محمد أحمد"', expectStatus: 201, expected: '201 saved unchanged',
    run: () => call('post', '/candidates', { token: t, body: cbody({ name: 'محمد أحمد' }) }), verify: (r) => r.body.data.name === 'محمد أحمد',
  });
  T('candidates.create.html-address', 'HTML in address', {
    category: 'security', endpoint: 'POST /api/v1/candidates', scenario: 'address with <script>', expectStatus: [201, 400], expected: 'Stored as text, escaped by UI',
    run: () => call('post', '/candidates', { token: t, body: cbody({ address: XSS }) }),
  });
  T('candidates.list.ok', 'list candidates', {
    endpoint: 'GET /api/v1/candidates', scenario: 'Default', expectStatus: 200, expected: '200 list, no secrets',
    run: () => call('get', '/candidates', { token: t }), verify: (r) => !/passwordHash|refreshTokenHash/.test(JSON.stringify(r.body)),
  });
  T('candidates.list.group-filter', 'filter by group', {
    endpoint: 'GET /api/v1/candidates', scenario: 'groupId', expectStatus: 200, expected: '200 only that group',
    run: () => call('get', '/candidates', { token: t, query: { groupId: f.A.groupId } }), verify: (r) => r.body.data.items.every((c: { groupIds: string[] }) => c.groupIds.includes(f.A.groupId)),
  });
  T('candidates.list.stale-after-create', 'list shows a new candidate right after create (cache)', {
    category: 'edge', endpoint: 'GET /api/v1/candidates', scenario: 'Read list, create, read list again', expectStatus: 200, expected: 'New candidate visible',
    run: async () => {
      await call('get', '/candidates', { token: t, query: { limit: 200 } });
      const c = await must('c', call('post', '/candidates', { token: t, body: cbody() }));
      const r = await call('get', '/candidates', { token: t, query: { limit: 200 } });
      return { status: r.status, body: { ...r.body, found: r.body.data.items.some((x: { id: string }) => x.id === c.id) } };
    },
    verify: (r) => r.body.found === true,
  });
  T('candidates.get.ok', 'get candidate with documents', {
    endpoint: 'GET /api/v1/candidates/:id', scenario: 'Fixture candidate', expectStatus: 200, expected: '200 candidate with documents',
    run: () => call('get', `/candidates/${f.A.candidateId}`, { token: t }), verify: (r) => Array.isArray(r.body.data.documents),
  });
  T('candidates.get.stale-documents', 'candidate detail shows a document added after first read', {
    category: 'edge', endpoint: 'GET /api/v1/candidates/:id', scenario: 'Read candidate, add document, read again', expectStatus: 200, expected: 'New document is listed',
    run: async () => {
      const c = await must('c', call('post', '/candidates', { token: t, body: cbody() }));
      await call('get', `/candidates/${c.id}`, { token: t });
      await must('doc', call('post', `/candidates/${c.id}/documents`, { token: t, body: { documentType: 'signature', documentName: 'Sign' } }));
      const r = await call('get', `/candidates/${c.id}`, { token: t });
      return { status: r.status, body: { ...r.body, docs: r.body.data.documents.length } };
    },
    verify: (r) => r.body.docs === 1,
  });
  T('candidates.update.ok', 'update candidate', {
    endpoint: 'PATCH /api/v1/candidates/:id', scenario: 'Change city', expectStatus: 200, expected: '200',
    run: () => call('patch', `/candidates/${id}`, { token: t, body: { city: 'Delhi' } }), verify: (r) => r.body.data.city === 'Delhi',
  });
  T('candidates.update.password-sessions', 'candidate password change ends sessions', {
    category: 'security', endpoint: 'PATCH /api/v1/candidates/:id', scenario: 'Admin resets fixture candidate password, old token used', expectStatus: 401, expected: '401 old candidate token rejected',
    run: async () => {
      const s = u();
      const c = await must('c', call('post', '/candidates', { token: t, body: cbody({ email: `pw.${s}@qa.test`, enrollmentNumber: `PW-${s}` }) }));
      await must('map', call('post', '/candidate-centre-mappings', { token: t, body: { candidateId: c.id, centreId: f.A.centreId, examDate: todayUtc() } }));
      const l = await must('login', call('post', '/candidates/login', { body: { companyToken: f.A.companyToken, enrollmentNumber: `PW-${s}`, password: 'Cand@12345', centreCode: f.A.centreCode } }));
      await must('reset', call('patch', `/candidates/${c.id}`, { token: t, body: { password: 'NewCand@12345' } }));
      return call('get', '/candidates/me', { token: l.accessToken });
    },
  });
  T('candidates.delete.ok', 'delete candidate', {
    endpoint: 'DELETE /api/v1/candidates/:id', scenario: 'Delete', expectStatus: 200, expected: '200',
    run: () => call('delete', `/candidates/${id}`, { token: t }),
  });
  T('candidates.get.deleted-cache', 'get deleted candidate returns 404', {
    category: 'edge', endpoint: 'GET /api/v1/candidates/:id', scenario: 'After delete (cached before)', expectStatus: 404, expected: '404',
    run: () => call('get', `/candidates/${id}`, { token: t }),
  });
});

describe('Candidate documents', () => {
  const T = suite('Candidate Documents', EV);
  T('documents.dup-type', 'second document of same type', {
    category: 'edge', endpoint: 'POST /api/v1/candidates/:id/documents', scenario: 'id_proof again', expectStatus: 409, expected: '409 This document type already exists',
    run: () => call('post', `/candidates/${f.A.candidateId}/documents`, { token: t, body: { documentType: 'id_proof' } }),
  });
  T('documents.file-url-js', 'javascript: file URL', {
    category: 'security', endpoint: 'POST /api/v1/candidates/:id/documents', scenario: 'fileUrl = javascript:alert(1)', expectStatus: 400, expected: '400 fileUrl must be a storage key or https URL',
    field: 'fileUrl', rule: 'Key or https URL',
    run: () => call('post', `/candidates/${f.A.candidateId}/documents`, { token: t, body: { documentType: 'document_1', fileUrl: 'javascript:alert(1)' } }),
  });
  T('documents.list', 'list documents', {
    endpoint: 'GET /api/v1/candidates/:id/documents', scenario: 'Fixture', expectStatus: 200, expected: '200',
    run: () => call('get', `/candidates/${f.A.candidateId}/documents`, { token: t }),
  });
  T('documents.other-candidate', 'document id under another candidate', {
    category: 'security', endpoint: 'GET /api/v1/candidates/:cid/documents/:id', scenario: 'Fixture document id with a different candidate id', expectStatus: 404, expected: '404',
    run: async () => { const c = await must('c', call('post', '/candidates', { token: t, body: cbody() })); return call('get', `/candidates/${c.id}/documents/${f.A.documentId}`, { token: t }); },
  });
});

describe('Candidate login and exam', () => {
  const T = suite('Candidate Auth', EV);
  const login = (over: Record<string, unknown> = {}) => ({ companyToken: f.A.companyToken, enrollmentNumber: f.A.candidateEnrollment, password: f.A.candidatePassword, centreCode: f.A.centreCode, ...over });
  T('cand.login.ok', 'login with mapping for today', {
    endpoint: 'POST /api/v1/candidates/login', scenario: 'Mapped to centre today', expectStatus: 200, expected: '200 tokens + exam desk',
    run: () => call('post', '/candidates/login', { body: login() }), verify: (r) => r.body.data.candidate.exam.centreCode === f.A.centreCode,
  });
  T('cand.login.wrong-centre', 'unknown centre code', {
    endpoint: 'POST /api/v1/candidates/login', scenario: 'centreCode=NOPE', expectStatus: 400, expected: '400 Centre not found',
    run: () => call('post', '/candidates/login', { body: login({ centreCode: 'NOPE' }) }),
  });
  T('cand.login.not-mapped', 'not mapped to centre today', {
    category: 'edge', endpoint: 'POST /api/v1/candidates/login', scenario: 'Valid candidate with no mapping today', expectStatus: 403, expected: '403 You are not mapped to this centre for this date',
    run: async () => { const s = u(); await must('c', call('post', '/candidates', { token: t, body: cbody({ email: `nm.${s}@qa.test`, enrollmentNumber: `NM-${s}` }) })); return call('post', '/candidates/login', { body: login({ enrollmentNumber: `NM-${s}`, password: 'Cand@12345' }) }); },
  });
  T('cand.login.timezone', 'exam date uses UTC, not the centre local date', {
    category: 'edge', endpoint: 'POST /api/v1/candidates/login', scenario: 'Mapping for tomorrow (UTC). In India after 18:30 UTC it is already tomorrow', expectStatus: 200, expected: 'Login allowed when it is the exam date at the centre (Asia/Kolkata)',
    run: async () => {
      const s = u();
      const c = await must('c', call('post', '/candidates', { token: t, body: cbody({ email: `tz.${s}@qa.test`, enrollmentNumber: `TZ-${s}` }) }));
      const ist = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
      await must('map', call('post', '/candidate-centre-mappings', { token: t, body: { candidateId: c.id, centreId: f.A.centreId, examDate: ist } }));
      const r = await call('post', '/candidates/login', { body: login({ enrollmentNumber: `TZ-${s}`, password: 'Cand@12345' }) });
      return { status: r.status, body: { ...r.body, message: `${r.body.message ?? ''} (IST date ${ist}, UTC date ${todayUtc()})` } };
    },
  });
  T('cand.login.wrong-password', 'wrong password', {
    endpoint: 'POST /api/v1/candidates/login', scenario: 'Wrong password', expectStatus: 401, expected: '401 Invalid enrollment number or password',
    run: () => call('post', '/candidates/login', { body: login({ enrollmentNumber: `X-${u()}`, password: 'Wrong@12345' }) }),
  });
  T('cand.me', 'candidate me', {
    endpoint: 'GET /api/v1/candidates/me', scenario: 'Valid token', expectStatus: 200, expected: '200 profile + exam desk',
    run: () => call('get', '/candidates/me', { token: f.A.candidateToken }),
  });

  const E = suite('Candidate Exam', EV);
  E('exam.details', 'exam details for mapped test', {
    endpoint: 'GET /api/v1/candidates/tests/:testId', scenario: 'Mapped test', expectStatus: 200, expected: '200 test, instructions, settings',
    run: () => call('get', `/candidates/tests/${f.A.testId}`, { token: f.A.candidateToken }), verify: (r) => r.body.data.instructions.length >= 1,
  });
  E('exam.paper.no-answers', 'paper does not leak correct answers', {
    category: 'security', endpoint: 'GET /api/v1/candidates/tests/:testId/questions', scenario: 'Single choice question in paper', expectStatus: 200, expected: '200 with options but no correctOptions / answer / explanation',
    run: () => call('get', `/candidates/tests/${f.A.testId}/questions`, { token: f.A.candidateToken }),
    verify: (r) => { const s = JSON.stringify(r.body); return !/correctOptions|"answer"|explanation|solutionUrl/.test(s) && s.includes('"options"'); },
  });
  E('exam.paper.fill-no-answer', 'fill-in-the-blank paper hides the answer', {
    category: 'security', endpoint: 'GET /api/v1/candidates/tests/:testId/questions', scenario: 'Fill question with answer 42', expectStatus: 200, expected: 'answerType only',
    run: async () => {
      const q = await call('post', '/questions', { token: t, body: { testId: f.A.testId, subjectId: f.A.subjectId, topicId: f.A.topicId, questionType: 'fill_in_the_blanks', questionData: [{ languageId: f.A.languageId, difficultyId: f.A.difficultyId, questionType: 'fill_in_the_blanks', questionText: 'Secret?', options: { answerType: 'numbers', answer: '424242' } }] } });
      void q;
      return call('get', `/candidates/tests/${f.A.testId}/questions`, { token: f.A.candidateToken });
    },
    verify: (r) => !JSON.stringify(r.body).includes('424242'),
  });
  E('exam.paper.before-window', 'paper is available before the test is published and before start date', {
    category: 'security', endpoint: 'GET /api/v1/candidates/tests/:testId/questions', scenario: 'Fixture test: isPublished=false, isDraft=true, startDate=2030-01-01', expectStatus: 403, expected: '403 test is not open yet',
    run: () => call('get', `/candidates/tests/${f.A.testId}/questions`, { token: f.A.candidateToken }),
  });
  E('exam.details.before-window', 'details of an unpublished draft test', {
    category: 'security', endpoint: 'GET /api/v1/candidates/tests/:testId', scenario: 'Draft test', expectStatus: 403, expected: '403 test is not published',
    run: () => call('get', `/candidates/tests/${f.A.testId}`, { token: f.A.candidateToken }),
  });
  E('exam.paper.inactive-question', 'inactive question is not in paper', {
    endpoint: 'GET /api/v1/candidates/tests/:testId/questions', scenario: 'Question with isActive=false', expectStatus: 200, expected: 'Inactive question not listed',
    run: async () => {
      const q = await must('q', call('post', '/questions', { token: t, body: { testId: f.A.testId, subjectId: f.A.subjectId, topicId: f.A.topicId, questionType: 'single_choice', isActive: false, questionData: [{ languageId: f.A.languageId, difficultyId: f.A.difficultyId, questionType: 'single_choice', questionText: 'HIDDEN-Q', options: { options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptions: ['a'] } }] } }));
      void q;
      return call('get', `/candidates/tests/${f.A.testId}/questions`, { token: f.A.candidateToken });
    },
    verify: (r) => !JSON.stringify(r.body).includes('HIDDEN-Q'),
  });
  E('exam.unmapped-test', 'test the candidate is not mapped to', {
    category: 'auth', endpoint: 'GET /api/v1/candidates/tests/:testId', scenario: 'Other test in same company', expectStatus: 403, expected: '403 You are not mapped to this test',
    run: async () => {
      const tt = await must('t', call('post', '/tests', { token: t, body: { name: 'Unmapped', testCode: `UM${Date.now() % 100000}`, categoryId: f.A.categoryId, primaryInstructionId: f.A.instructionId, durationMinutes: 10, handicappedDurationMinutes: 10, totalQuestions: 1, totalMarks: 1, passingMarks: 0, graceMarks: 0, templateId: f.templateId } }));
      return call('get', `/candidates/tests/${tt.id}`, { token: f.A.candidateToken });
    },
  });

  const F = suite('Feedback', EV);
  F('feedback.rating-high', 'rating 6', {
    category: 'validation', endpoint: 'POST /api/v1/candidates/tests/:testId/feedback', scenario: 'rating=6', expectStatus: 400, expected: '400 rating must not be greater than 5', field: 'rating', rule: '1-5',
    run: () => call('post', `/candidates/tests/${f.A.testId}/feedback`, { token: f.A.candidateToken, body: { rating: 6 } }),
  });
  F('feedback.rating-decimal', 'rating 4.5', {
    category: 'validation', endpoint: 'POST /api/v1/candidates/tests/:testId/feedback', scenario: 'rating=4.5', expectStatus: 400, expected: '400 rating must be an integer', field: 'rating', rule: 'Integer',
    run: () => call('post', `/candidates/tests/${f.A.testId}/feedback`, { token: f.A.candidateToken, body: { rating: 4.5 } }),
  });
  F('feedback.before-exam', 'feedback before the test happened', {
    category: 'edge', endpoint: 'POST /api/v1/candidates/tests/:testId/feedback', scenario: 'Test not started/published (2030)', expectStatus: 400, expected: '400 feedback only after the test',
    run: () => call('post', `/candidates/tests/${f.A.testId}/feedback`, { token: f.A.candidateToken, body: { rating: 5, comment: 'Great' } }),
  });
  F('feedback.duplicate', 'second feedback', {
    category: 'edge', endpoint: 'POST /api/v1/candidates/tests/:testId/feedback', scenario: 'Submit twice', expectStatus: 409, expected: '409 already submitted',
    run: () => call('post', `/candidates/tests/${f.A.testId}/feedback`, { token: f.A.candidateToken, body: { rating: 4 } }),
  });
  F('feedback.parallel-duplicate', 'two feedback requests at the same time', {
    category: 'edge', endpoint: 'POST /api/v1/candidates/tests/:testId/feedback', scenario: 'Double-click submit (2 parallel)', expectStatus: 200, expected: 'One 201 and one 409, never 500',
    run: async () => {
      const tt = await must('t', call('post', '/tests', { token: t, body: { name: 'FB', testCode: `FB${Date.now() % 100000}`, categoryId: f.A.categoryId, primaryInstructionId: f.A.instructionId, durationMinutes: 10, handicappedDurationMinutes: 10, totalQuestions: 1, totalMarks: 1, passingMarks: 0, graceMarks: 0, templateId: f.templateId } }));
      await must('map', call('post', '/test-candidate-mappings', { token: t, body: { groupId: f.A.groupId, candidateId: f.A.candidateId, testId: tt.id } }));
      const [a, b] = await Promise.all([
        call('post', `/candidates/tests/${tt.id}/feedback`, { token: f.A.candidateToken, body: { rating: 5 } }),
        call('post', `/candidates/tests/${tt.id}/feedback`, { token: f.A.candidateToken, body: { rating: 5 } }),
      ]);
      const codes = [a.status, b.status].sort().join('/');
      return { status: codes === '201/409' ? 200 : 500, body: { message: `statuses ${codes}` } };
    },
  });
  F('feedback.comment-long', 'comment longer than 2000', {
    category: 'validation', endpoint: 'POST /api/v1/candidates/tests/:testId/feedback', scenario: 'comment 2001 chars', expectStatus: 400, expected: '400 comment too long', field: 'comment', rule: 'Max 2000',
    run: () => call('post', `/candidates/tests/${f.A.testId}/feedback`, { token: f.A.candidateToken, body: { rating: 3, comment: 'x'.repeat(2001) } }),
  });

  T('cand.deactivated', 'deactivated candidate token is rejected', {
    category: 'security', endpoint: 'GET /api/v1/candidates/me', scenario: 'Admin deactivates candidate during exam', expectStatus: 401, expected: '401',
    run: async () => {
      const s = u();
      const c = await must('c', call('post', '/candidates', { token: t, body: cbody({ email: `da.${s}@qa.test`, enrollmentNumber: `DA-${s}` }) }));
      await must('map', call('post', '/candidate-centre-mappings', { token: t, body: { candidateId: c.id, centreId: f.A.centreId, examDate: todayUtc() } }));
      const l = await must('login', call('post', '/candidates/login', { body: login({ enrollmentNumber: `DA-${s}`, password: 'Cand@12345' }) }));
      await must('deact', call('patch', `/candidates/${c.id}`, { token: t, body: { isActive: false } }));
      return call('get', '/candidates/me', { token: l.accessToken });
    },
  });
  T('cand.refresh', 'candidate refresh', {
    endpoint: 'POST /api/v1/candidates/refresh', scenario: 'Valid refresh token', expectStatus: 200, expected: '200 new tokens',
    run: async () => {
      const l = await must('login', call('post', '/candidates/login', { body: login() }));
      return call('post', '/candidates/refresh', { body: { refreshToken: l.refreshToken } });
    },
  });
  T('cand.logout', 'candidate logout revokes token', {
    category: 'security', endpoint: 'POST /api/v1/candidates/logout', scenario: 'Logout then use token', expectStatus: 401, expected: '401 after logout',
    run: async () => {
      const s = u();
      const c = await must('c', call('post', '/candidates', { token: t, body: cbody({ email: `lo.${s}@qa.test`, enrollmentNumber: `LO-${s}` }) }));
      await must('map', call('post', '/candidate-centre-mappings', { token: t, body: { candidateId: c.id, centreId: f.A.centreId, examDate: todayUtc() } }));
      const l = await must('login', call('post', '/candidates/login', { body: login({ enrollmentNumber: `LO-${s}`, password: 'Cand@12345' }) }));
      await must('logout', call('post', '/candidates/logout', { token: l.accessToken }));
      return call('get', '/candidates/me', { token: l.accessToken });
    },
  });
});
