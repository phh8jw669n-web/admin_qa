/** Languages, difficulties, categories, subjects, topics, CST mappings, instructions, groups. */
import { call } from '../helpers/http';
import { flush } from '../helpers/recorder';
import { suite, longText, UNICODE, XSS } from '../helpers/dsl';
import { loadFixtures, must } from '../helpers/fixtures';

const f = loadFixtures();
const EV = 'qa_tests/specs/04-master-data.qa.spec.ts';
afterAll(() => flush('04-master-data'));
const t = f.A.adminToken;
const u = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

type Res = { base: string; module: string; body: () => Record<string, unknown>; nameField?: string; nameMax?: number };
const resources: Res[] = [
  { base: '/languages', module: 'Languages', body: () => ({ name: `Lang ${u()}` }) },
  { base: '/difficulties', module: 'Difficulties', body: () => ({ name: `Diff ${u()}`, languageId: f.A.languageId }), nameMax: 100 },
  { base: '/categories', module: 'Categories', body: () => ({ name: `Cat ${u()}`, ranking: 5 }) },
  { base: '/subjects', module: 'Subjects', body: () => ({ name: `Sub ${u()}`, ranking: 5 }) },
  { base: '/topics', module: 'Topics', body: () => ({ name: `Top ${u()}`, ranking: 5 }) },
  { base: '/instructions', module: 'Instructions', body: () => ({ name: `Ins ${u()}`, ranking: 5 }) },
  { base: '/groups', module: 'Groups', body: () => ({ name: `Grp ${u()}` }) },
];

for (const r of resources) {
  describe(`${r.module} CRUD`, () => {
    const T = suite(r.module, EV);
    let id = '';
    let name = '';
    const k = r.base.slice(1);
    T(`${k}.crud.create`, 'create', {
      endpoint: `POST /api/v1${r.base}`, scenario: 'Valid body', expectStatus: 201, expected: '201 created',
      run: async () => { const b = r.body(); name = String(b.name); const res = await call('post', r.base, { token: t, body: b }); id = res.body?.data?.id; return res; },
    });
    T(`${k}.crud.list`, 'list contains the new item', {
      endpoint: `GET /api/v1${r.base}`, scenario: 'limit=200', expectStatus: 200, expected: '200 list contains new id',
      run: () => call('get', r.base, { token: t, query: { limit: 200 } }), verify: (res) => res.body.data.items.some((x: { id: string }) => x.id === id),
    });
    T(`${k}.crud.search`, 'search by name prefix', {
      endpoint: `GET /api/v1${r.base}`, scenario: 'name=<first 6 chars>', expectStatus: 200, expected: '200 item found',
      run: () => call('get', r.base, { token: t, query: { name: name.slice(0, 6) } }),
      verify: (res) => res.body.data.items.some((x: { id: string }) => x.id === id),
    });
    T(`${k}.crud.get`, 'get by id', {
      endpoint: `GET /api/v1${r.base}/:id`, scenario: 'New id', expectStatus: 200, expected: '200 item',
      run: () => call('get', `${r.base}/${id}`, { token: t }),
    });
    T(`${k}.crud.update`, 'rename', {
      endpoint: `PATCH /api/v1${r.base}/:id`, scenario: 'New name', expectStatus: 200, expected: '200 renamed',
      run: () => call('patch', `${r.base}/${id}`, { token: t, body: { name: `${name} v2` } }), verify: (res) => res.body.data.name === `${name} v2`,
    });
    T(`${k}.crud.get-after-update`, 'get after update shows new name (cache cleared)', {
      category: 'edge', endpoint: `GET /api/v1${r.base}/:id`, scenario: 'Read right after rename', expectStatus: 200, expected: '200 with new name',
      run: () => call('get', `${r.base}/${id}`, { token: t }), verify: (res) => res.body.data.name === `${name} v2`,
    });
    T(`${k}.crud.duplicate`, 'duplicate name', {
      category: 'edge', endpoint: `POST /api/v1${r.base}`, scenario: 'Same name twice', expectStatus: 409, expected: '409 already exists',
      run: async () => { const b = { ...r.body(), name: `${name} v2` }; return call('post', r.base, { token: t, body: b }); },
    });
    T(`${k}.crud.duplicate-case`, 'duplicate name in other letter case', {
      category: 'edge', endpoint: `POST /api/v1${r.base}`, scenario: 'Same name in UPPER case', expectStatus: 409, expected: '409 already exists (names should be case-insensitive)',
      run: async () => { const b = { ...r.body(), name: `${name} v2`.toUpperCase() }; return call('post', r.base, { token: t, body: b }); },
    });
    T(`${k}.crud.long-name`, 'name with 10,000 characters', {
      category: 'validation', endpoint: `POST /api/v1${r.base}`, scenario: 'name = 10,000 chars', expectStatus: 400, expected: '400 error that names the field and the limit',
      field: 'name', rule: 'Max length',
      run: () => call('post', r.base, { token: t, body: { ...r.body(), name: longText(10000) } }), verify: (res) => /name/i.test(JSON.stringify(res.body)),
    });
    T(`${k}.crud.unicode`, 'unicode and emoji name', {
      category: 'edge', endpoint: `POST /api/v1${r.base}`, scenario: `name = "${UNICODE}"`, expectStatus: 201, expected: '201 stored unchanged',
      run: () => call('post', r.base, { token: t, body: { ...r.body(), name: `${UNICODE} ${u()}` } }), verify: (res) => String(res.body.data.name).startsWith(UNICODE),
    });
    T(`${k}.crud.html`, 'HTML tags in name', {
      category: 'security', endpoint: `POST /api/v1${r.base}`, scenario: 'name contains <script>', expectStatus: [201, 400], expected: 'Stored as text (UI escapes) or rejected',
      run: () => call('post', r.base, { token: t, body: { ...r.body(), name: `${XSS.slice(0, 80)} ${u()}` } }),
    });
    T(`${k}.crud.null-byte`, 'null byte in name', {
      category: 'security', endpoint: `POST /api/v1${r.base}`, scenario: 'name contains \\u0000', expectStatus: 400, expected: '400 Null characters are not allowed',
      run: () => call('post', r.base, { token: t, body: { ...r.body(), name: 'bad\u0000name' } }),
    });
    T(`${k}.crud.delete`, 'delete', {
      endpoint: `DELETE /api/v1${r.base}/:id`, scenario: 'Delete new item', expectStatus: 200, expected: '200 deleted',
      run: () => call('delete', `${r.base}/${id}`, { token: t }),
    });
    T(`${k}.crud.get-deleted`, 'get after delete', {
      endpoint: `GET /api/v1${r.base}/:id`, scenario: 'Deleted id', expectStatus: 404, expected: '404 not found (no stale cache)',
      run: () => call('get', `${r.base}/${id}`, { token: t }),
    });
    T(`${k}.crud.reuse-name`, 'name can be reused after delete', {
      category: 'db', endpoint: `POST /api/v1${r.base}`, scenario: 'Create again with deleted name', expectStatus: 201, expected: '201 (unique index ignores deleted rows)',
      run: () => call('post', r.base, { token: t, body: { ...r.body(), name: `${name} v2` } }),
    });
  });
}

describe('Pagination (Categories as sample)', () => {
  const T = suite('Categories', EV);
  T('page.zero', 'page=0', { category: 'validation', endpoint: 'GET /api/v1/categories', scenario: 'page=0', expectStatus: 400, expected: '400 page must not be less than 1', field: 'page', rule: 'Min 1', run: () => call('get', '/categories', { token: t, query: { page: 0 } }) });
  T('page.negative-limit', 'limit=-5', { category: 'validation', endpoint: 'GET /api/v1/categories', scenario: 'limit=-5', expectStatus: 400, expected: '400 limit must not be less than 1', field: 'limit', rule: 'Min 1', run: () => call('get', '/categories', { token: t, query: { limit: -5 } }) });
  T('page.text-limit', 'limit=abc', { category: 'validation', endpoint: 'GET /api/v1/categories', scenario: 'limit=abc', expectStatus: 400, expected: '400 limit must be an integer', field: 'limit', rule: 'Integer', run: () => call('get', '/categories', { token: t, query: { limit: 'abc' } }) });
  T('page.decimal', 'page=1.5', { category: 'validation', endpoint: 'GET /api/v1/categories', scenario: 'page=1.5', expectStatus: 400, expected: '400 page must be an integer', field: 'page', rule: 'Integer', run: () => call('get', '/categories', { token: t, query: { page: 1.5 } }) });
  T('page.far', 'page far beyond data', { category: 'edge', endpoint: 'GET /api/v1/categories', scenario: 'page=100000', expectStatus: 200, expected: '200 empty items, correct total', run: () => call('get', '/categories', { token: t, query: { page: 100000 } }), verify: (r) => r.body.data.items.length === 0 });
  T('page.huge-page', 'page = 2^53', { category: 'edge', endpoint: 'GET /api/v1/categories', scenario: 'page=9007199254740993', expectStatus: [200, 400], expected: '400 or empty page, never 500', run: () => call('get', '/categories', { token: t, query: { page: '9007199254740993' } }) });
  T('page.unknown-param', 'unknown query parameter', { category: 'validation', endpoint: 'GET /api/v1/categories', scenario: 'sort=name', expectStatus: 400, expected: '400 property sort should not exist (no sorting support)', field: 'sort', rule: 'Whitelist', run: () => call('get', '/categories', { token: t, query: { sort: 'name' } }) });
  T('page.ranking-negative', 'ranking -1', { category: 'validation', endpoint: 'POST /api/v1/categories', scenario: 'ranking=-1', expectStatus: 400, expected: '400 ranking must not be less than 0', field: 'ranking', rule: 'Min 0', run: () => call('post', '/categories', { token: t, body: { name: `R ${u()}`, ranking: -1 } }) });
  T('page.ranking-decimal', 'ranking 1.5', { category: 'validation', endpoint: 'POST /api/v1/categories', scenario: 'ranking=1.5', expectStatus: 400, expected: '400 ranking must be an integer', field: 'ranking', rule: 'Integer', run: () => call('post', '/categories', { token: t, body: { name: `R ${u()}`, ranking: 1.5 } }) });
  T('page.ranking-huge', 'ranking above int4', { category: 'validation', endpoint: 'POST /api/v1/categories', scenario: 'ranking=2147483648', expectStatus: 400, expected: '400 ranking must not be greater than 2147483647', field: 'ranking', rule: 'Max int4', run: () => call('post', '/categories', { token: t, body: { name: `R ${u()}`, ranking: 2147483648 } }) });
  T('page.ranking-string', 'ranking "5"', { category: 'validation', endpoint: 'POST /api/v1/categories', scenario: 'ranking="5" (string)', expectStatus: [201, 400], expected: 'Either converted or 400 - consistent', field: 'ranking', rule: 'Integer', run: () => call('post', '/categories', { token: t, body: { name: `R ${u()}`, ranking: '5' } }) });
  T('page.ranking-dup', 'two categories with same ranking', { category: 'edge', endpoint: 'POST /api/v1/categories', scenario: 'ranking=1 already used', expectStatus: [201, 409], expected: 'Allowed (ranking only sorts); note order is then by updatedAt', run: () => call('post', '/categories', { token: t, body: { name: `R ${u()}`, ranking: 1 } }) });
});

describe('Relations and deletes of in-use data', () => {
  const T = suite('Master Data', EV);
  T('difficulty.lang-other-company', 'difficulty with language of company B', {
    module: 'Difficulties', category: 'security', endpoint: 'POST /api/v1/difficulties', scenario: 'languageId belongs to company B', expectStatus: 404, expected: '404 Language not found',
    run: () => call('post', '/difficulties', { token: t, body: { name: `X ${u()}`, languageId: f.B.languageId } }),
  });
  T('difficulty.status', 'toggle difficulty status', {
    module: 'Difficulties', endpoint: 'PATCH /api/v1/difficulties/:id/status', scenario: 'isActive=false', expectStatus: 200, expected: '200 isActive false',
    run: () => call('patch', `/difficulties/${f.A.difficultyId}/status`, { token: t, body: { isActive: false } }), verify: (r) => r.body.data.isActive === false,
  });
  T('difficulty.status-restore', 'restore difficulty status', {
    module: 'Difficulties', endpoint: 'PATCH /api/v1/difficulties/:id/status', scenario: 'isActive=true', expectStatus: 200, expected: '200 isActive true',
    run: () => call('patch', `/difficulties/${f.A.difficultyId}/status`, { token: t, body: { isActive: true } }),
  });
  T('boolean.string-false', 'isActive sent as string "false"', {
    module: 'Groups', category: 'validation', endpoint: 'PATCH /api/v1/groups/:id', scenario: 'isActive = "false" (string)', expectStatus: 400, expected: '400 isActive must be a boolean value',
    field: 'isActive', rule: 'Boolean type (implicit conversion makes "false" true)',
    run: async () => {
      const g = await must('group', call('post', '/groups', { token: t, body: { name: `Bool ${u()}` } }));
      return call('patch', `/groups/${g.id}`, { token: t, body: { isActive: 'false' } });
    },
  });
  T('language.delete-in-use', 'delete language that questions and difficulties use', {
    module: 'Languages', category: 'db', endpoint: 'DELETE /api/v1/languages/:id', scenario: 'Language used by difficulty and question content', expectStatus: 409, expected: '409 language is in use',
    run: async () => {
      const lang = await must('lang', call('post', '/languages', { token: t, body: { name: `InUse ${u()}` } }));
      await must('diff', call('post', '/difficulties', { token: t, body: { name: `InUse ${u()}`, languageId: lang.id } }));
      return call('delete', `/languages/${lang.id}`, { token: t });
    },
  });
  T('category.delete-in-use', 'delete category used by a test', {
    module: 'Categories', category: 'db', endpoint: 'DELETE /api/v1/categories/:id', scenario: 'Category referenced by tests', expectStatus: 409, expected: '409 category is in use',
    run: async () => {
      const c = await must('cat', call('post', '/categories', { token: t, body: { name: `InUse ${u()}`, ranking: 1 } }));
      await must('test', call('post', '/tests', { token: t, body: { name: 'cat in use', testCode: `CI${Date.now() % 1000000}`, categoryId: c.id, primaryInstructionId: f.A.instructionId, durationMinutes: 10, handicappedDurationMinutes: 10, totalQuestions: 1, totalMarks: 1, passingMarks: 0, graceMarks: 0, templateId: f.templateId } }));
      return call('delete', `/categories/${c.id}`, { token: t });
    },
  });
  T('instruction.delete-in-use', 'delete instruction used as test primary instruction', {
    module: 'Instructions', category: 'db', endpoint: 'DELETE /api/v1/instructions/:id', scenario: 'Instruction used by a test', expectStatus: 409, expected: '409 instruction is in use',
    run: async () => {
      const i = await must('ins', call('post', '/instructions', { token: t, body: { name: `InUse ${u()}`, ranking: 1 } }));
      await must('test', call('post', '/tests', { token: t, body: { name: 'ins in use', testCode: `II${Date.now() % 1000000}`, categoryId: f.A.categoryId, primaryInstructionId: i.id, durationMinutes: 10, handicappedDurationMinutes: 10, totalQuestions: 1, totalMarks: 1, passingMarks: 0, graceMarks: 0, templateId: f.templateId } }));
      return call('delete', `/instructions/${i.id}`, { token: t });
    },
  });
  T('group.delete-in-use', 'delete group that has candidates', {
    module: 'Groups', category: 'db', endpoint: 'DELETE /api/v1/groups/:id', scenario: 'Group with a candidate', expectStatus: 409, expected: '409 group has candidates',
    run: async () => {
      const g = await must('grp', call('post', '/groups', { token: t, body: { name: `InUse ${u()}` } }));
      const s = u();
      await must('cand', call('post', '/candidates', { token: t, body: { name: 'G', enrollmentNumber: `G-${s}`, email: `g.${s}@qa.test`, mobile: '1', dateOfRegistration: '2026-01-01', country: 'I', state: 'S', city: 'C', address: 'A', pincode: '1', groupIds: [g.id] } }));
      return call('delete', `/groups/${g.id}`, { token: t });
    },
  });
});

describe('Subjects / topics by category and CST mappings', () => {
  const T = suite('CST Mappings', EV);
  T('subjects.by-category', 'subjects filtered by category', {
    module: 'Subjects', endpoint: 'GET /api/v1/subjects?categoryId', scenario: 'Category with one mapped subject', expectStatus: 200, expected: '200 only mapped subjects',
    run: () => call('get', '/subjects', { token: t, query: { categoryId: f.A.categoryId } }), verify: (r) => r.body.data.items.length >= 1 && r.body.data.items.every((s: { id: string }) => s.id === f.A.subjectId),
  });
  T('topics.by-subject', 'topics filtered by category and subject', {
    module: 'Topics', endpoint: 'GET /api/v1/topics?categoryId&subjectId', scenario: 'Mapped topic', expectStatus: 200, expected: '200 mapped topic only',
    run: () => call('get', '/topics', { token: t, query: { categoryId: f.A.categoryId, subjectId: f.A.subjectId } }), verify: (r) => r.body.data.items.some((x: { id: string }) => x.id === f.A.topicId),
  });
  T('cst.duplicate', 'duplicate mapping', {
    category: 'edge', endpoint: 'POST /api/v1/category-subject-topic-mappings', scenario: 'Same category/subject/topic', expectStatus: 409, expected: '409 mapping already exists',
    run: () => call('post', '/category-subject-topic-mappings', { token: t, body: { categoryId: f.A.categoryId, subjectId: f.A.subjectId, topicId: f.A.topicId, ranking: 3 } }),
  });
  T('cst.other-tenant', 'mapping with company B topic', {
    category: 'security', endpoint: 'POST /api/v1/category-subject-topic-mappings', scenario: 'topicId of company B', expectStatus: 404, expected: '404 Topic not found',
    run: () => call('post', '/category-subject-topic-mappings', { token: t, body: { categoryId: f.A.categoryId, subjectId: f.A.subjectId, topicId: f.B.topicId, ranking: 3 } }),
  });
  T('cst.list', 'list mappings', {
    endpoint: 'GET /api/v1/category-subject-topic-mappings', scenario: 'Default', expectStatus: 200, expected: '200 list',
    run: () => call('get', '/category-subject-topic-mappings', { token: t }),
  });
});

describe('Instruction languages', () => {
  const T = suite('Instruction Languages', EV);
  T('il.duplicate-language', 'second text for same language', {
    category: 'edge', endpoint: 'POST /api/v1/instructions/:id/languages', scenario: 'Language already has text', expectStatus: 409, expected: '409 This language already has content',
    run: () => call('post', `/instructions/${f.A.instructionId}/languages`, { token: t, body: { languageId: f.A.languageId, content: 'dup' } }),
  });
  T('il.list', 'list instruction languages', {
    endpoint: 'GET /api/v1/instructions/:id/languages', scenario: 'Default', expectStatus: 200, expected: '200 list with language relation',
    run: () => call('get', `/instructions/${f.A.instructionId}/languages`, { token: t }),
  });
  T('il.xss-content', 'script tag in instruction HTML', {
    category: 'security', endpoint: 'POST /api/v1/instructions/:id/languages', scenario: 'content with <script>', expectStatus: [201, 400], expected: 'HTML is sanitised server side or rejected',
    run: async () => {
      const lang = await must('lang', call('post', '/languages', { token: t, body: { name: `Hindi ${u()}` } }));
      return call('post', `/instructions/${f.A.instructionId}/languages`, { token: t, body: { languageId: lang.id, content: `<p>Hi</p>${XSS}` } });
    },
    verify: (r) => r.status === 400 || !String(r.body.data.content).includes('<script>'),
  });
  T('il.huge-content', 'instruction text of 2 MB', {
    category: 'edge', endpoint: 'POST /api/v1/instructions/:id/languages', scenario: 'content = 2,000,000 chars', expectStatus: [400, 413], expected: '413 Request body is too large',
    run: async () => {
      const lang = await must('lang', call('post', '/languages', { token: t, body: { name: `Big ${u()}` } }));
      return call('post', `/instructions/${f.A.instructionId}/languages`, { token: t, body: { languageId: lang.id, content: longText(2_000_000) } });
    },
  });
});
