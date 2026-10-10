import { randomUUID } from 'crypto';
import type { Fixtures } from './fixtures';
import type { HttpMethod } from './http';

/**
 * Who may call an endpoint.
 * admin    = company admin (tenant scoped)
 * super    = platform super admin
 * both     = admin or super admin
 * candidate / centre = candidate or centre-user token
 * public   = no login needed
 */
export type Access = 'admin' | 'super' | 'both' | 'candidate' | 'centre' | 'public' | 'any-admin-jwt';

export type Endpoint = {
  apiId: string;
  module: string;
  method: HttpMethod;
  /** Path template. ":id" is replaced with a real or random id. */
  path: string;
  purpose: string;
  access: Access;
  /** Real path for tenant A (or the platform) */
  real: (f: Fixtures) => string;
  /** Valid body, used for wrong-role checks (must never be applied). */
  body?: (f: Fixtures) => unknown;
  /** Has an id segment that can be swapped for a missing id. */
  idPath?: (id: string, f: Fixtures) => string;
  /** Safe to call with the allowed role in the matrix (read-only). */
  safeRead?: boolean;
  /** Invalid body for the validation sweep. */
  invalidBody?: unknown;
  usedByFrontend: 'Yes' | 'No';
  params: string;
  success: string;
};

const missing = () => randomUUID();

export function endpoints(): Endpoint[] {
  const list: Endpoint[] = [];
  const add = (e: Endpoint) => list.push(e);

  add({ apiId: 'root', module: 'Health', method: 'get', path: '/', purpose: 'Welcome message', access: 'public', real: () => '', safeRead: true, usedByFrontend: 'No', params: 'None', success: '200 {success, message}' });
  add({ apiId: 'health', module: 'Health', method: 'get', path: '/health', purpose: 'DB and Redis health', access: 'public', real: () => '/health', safeRead: true, usedByFrontend: 'No', params: 'None', success: '200 {data.status: ok}' });

  // Auth
  add({ apiId: 'auth.login', module: 'Auth', method: 'post', path: '/auth/login', purpose: 'Company admin login', access: 'public', real: () => '/auth/login', invalidBody: { email: 'x' }, usedByFrontend: 'Yes', params: 'companyToken (JWT), email, password (min 8)', success: '200 {accessToken, refreshToken, admin}' });
  add({ apiId: 'auth.refresh', module: 'Auth', method: 'post', path: '/auth/refresh', purpose: 'Rotate admin tokens', access: 'public', real: () => '/auth/refresh', invalidBody: {}, usedByFrontend: 'No', params: 'refreshToken', success: '201 {accessToken, refreshToken}' });
  add({ apiId: 'auth.logout', module: 'Auth', method: 'post', path: '/auth/logout', purpose: 'Admin logout (revokes tokens)', access: 'any-admin-jwt', real: () => '/auth/logout', body: () => ({}), usedByFrontend: 'Yes', params: 'None', success: '200 message' });
  add({ apiId: 'auth.me', module: 'Auth', method: 'get', path: '/auth/me', purpose: 'Current admin profile', access: 'any-admin-jwt', real: () => '/auth/me', safeRead: true, usedByFrontend: 'No', params: 'None', success: '200 admin profile' });

  // Super admin
  add({ apiId: 'sa.login', module: 'Super-Admin', method: 'post', path: '/super-admin/login', purpose: 'Super admin login', access: 'public', real: () => '/super-admin/login', invalidBody: { email: 'bad' }, usedByFrontend: 'Yes', params: 'email, password', success: '200 tokens' });
  add({ apiId: 'sa.logout', module: 'Super-Admin', method: 'post', path: '/super-admin/logout', purpose: 'Super admin logout', access: 'super', real: () => '/super-admin/logout', body: () => ({}), usedByFrontend: 'No', params: 'None', success: '200 message' });
  add({ apiId: 'sa.companies.create', module: 'Companies', method: 'post', path: '/super-admin/companies', purpose: 'Create company and its first admin', access: 'super', real: () => '/super-admin/companies', body: () => ({ name: 'x' }), invalidBody: { name: '' }, usedByFrontend: 'Yes', params: 'Company fields + firstName, lastName, adminPassword?', success: '201 company' });
  add({ apiId: 'sa.companies.list', module: 'Companies', method: 'get', path: '/super-admin/companies', purpose: 'List companies', access: 'super', real: () => '/super-admin/companies', safeRead: true, usedByFrontend: 'Yes', params: 'page, limit, name, city, plan, isActive', success: '200 {items, metadata}' });
  add({ apiId: 'sa.companies.get', module: 'Companies', method: 'get', path: '/super-admin/companies/:id', purpose: 'Get company', access: 'super', real: (f) => `/super-admin/companies/${f.A.companyId}`, idPath: (id) => `/super-admin/companies/${id}`, safeRead: true, usedByFrontend: 'Yes', params: 'id (uuid)', success: '200 company' });
  add({ apiId: 'sa.companies.update', module: 'Companies', method: 'put', path: '/super-admin/companies/:id', purpose: 'Update company', access: 'super', real: (f) => `/super-admin/companies/${f.A.companyId}`, idPath: (id) => `/super-admin/companies/${id}`, body: () => ({ city: 'Pune' }), invalidBody: { gstNo: 'BAD' }, usedByFrontend: 'Yes', params: 'Partial company fields', success: '200 company' });
  add({ apiId: 'sa.companies.delete', module: 'Companies', method: 'delete', path: '/super-admin/companies/:id', purpose: 'Soft delete company', access: 'super', real: (f) => `/super-admin/companies/${f.A.companyId}`, idPath: (id) => `/super-admin/companies/${id}`, usedByFrontend: 'Yes', params: 'id', success: '200 message' });
  add({ apiId: 'companies.verify', module: 'Companies', method: 'post', path: '/companies/verify-workspace', purpose: 'Resolve workspace URL to a company token', access: 'public', real: () => '/companies/verify-workspace', invalidBody: { workspaceUrl: '' }, usedByFrontend: 'Yes', params: 'workspaceUrl', success: '200 {companyToken, name, colors}' });
  add({ apiId: 'companies.get', module: 'Companies', method: 'get', path: '/companies/:id', purpose: 'Get own company', access: 'admin', real: (f) => `/companies/${f.A.companyId}`, idPath: (id) => `/companies/${id}`, safeRead: true, usedByFrontend: 'No', params: 'id', success: '200 company' });
  add({ apiId: 'companies.update', module: 'Companies', method: 'patch', path: '/companies/:id', purpose: 'Update own company profile', access: 'admin', real: (f) => `/companies/${f.A.companyId}`, idPath: (id) => `/companies/${id}`, body: () => ({ city: 'Pune' }), invalidBody: { yearFounded: 1500 }, usedByFrontend: 'No', params: 'Profile fields', success: '200 company' });

  // Admins
  add({ apiId: 'admins.create', module: 'Admins', method: 'post', path: '/admins', purpose: 'Create admin', access: 'super', real: () => '/admins', body: (f) => ({ companyId: f.A.companyId, firstName: 'X', lastName: 'Y', role: 'admin', email: `blocked.${Date.now()}@qa.test` }), invalidBody: { role: 'root' }, usedByFrontend: 'No', params: 'companyId, firstName, lastName, role, email, password?', success: '201 admin' });
  add({ apiId: 'admins.list', module: 'Admins', method: 'get', path: '/admins', purpose: 'List admins', access: 'super', real: () => '/admins', safeRead: true, usedByFrontend: 'No', params: 'page, limit, search, isActive', success: '200 {items, metadata}' });
  add({ apiId: 'admins.get', module: 'Admins', method: 'get', path: '/admins/:id', purpose: 'Get admin', access: 'super', real: (f) => `/admins/${f.A.adminId}`, idPath: (id) => `/admins/${id}`, safeRead: true, usedByFrontend: 'No', params: 'id', success: '200 admin' });
  add({ apiId: 'admins.update', module: 'Admins', method: 'put', path: '/admins/:id', purpose: 'Update admin', access: 'super', real: (f) => `/admins/${f.A.adminId}`, idPath: (id) => `/admins/${id}`, body: () => ({ firstName: 'Hacked' }), invalidBody: { email: 'nope' }, usedByFrontend: 'No', params: 'Partial admin fields', success: '200 admin' });
  add({ apiId: 'admins.delete', module: 'Admins', method: 'delete', path: '/admins/:id', purpose: 'Soft delete admin', access: 'super', real: (f) => `/admins/${f.A.adminId}`, idPath: (id) => `/admins/${id}`, usedByFrontend: 'No', params: 'id', success: '200 message' });

  // Templates
  add({ apiId: 'templates.create', module: 'Templates', method: 'post', path: '/super-admin/templates', purpose: 'Create global template', access: 'super', real: () => '/super-admin/templates', body: () => ({ name: 'T', ranking: 999999999, imageKey: 'a', htmlKey: 'b' }), invalidBody: { ranking: 0 }, usedByFrontend: 'No', params: 'name, ranking, imageKey, htmlKey', success: '201 template' });
  add({ apiId: 'templates.list', module: 'Templates', method: 'get', path: '/super-admin/templates', purpose: 'List templates', access: 'both', real: () => '/super-admin/templates', safeRead: true, usedByFrontend: 'Yes', params: 'page, limit, name, ranking, isActive', success: '200 {items, metadata}' });
  add({ apiId: 'templates.get', module: 'Templates', method: 'get', path: '/super-admin/templates/:id', purpose: 'Get template', access: 'both', real: (f) => `/super-admin/templates/${f.templateId}`, idPath: (id) => `/super-admin/templates/${id}`, safeRead: true, usedByFrontend: 'No', params: 'id', success: '200 template' });
  add({ apiId: 'templates.update', module: 'Templates', method: 'patch', path: '/super-admin/templates/:id', purpose: 'Update template', access: 'super', real: (f) => `/super-admin/templates/${f.templateId}`, idPath: (id) => `/super-admin/templates/${id}`, body: () => ({ name: 'Hacked' }), invalidBody: { ranking: -1 }, usedByFrontend: 'No', params: 'Partial', success: '200 template' });
  add({ apiId: 'templates.delete', module: 'Templates', method: 'delete', path: '/super-admin/templates/:id', purpose: 'Soft delete template', access: 'super', real: (f) => `/super-admin/templates/${f.templateId}`, idPath: (id) => `/super-admin/templates/${id}`, usedByFrontend: 'No', params: 'id', success: '200 message' });

  // Generic tenant CRUD resources
  type Crud = { base: string; module: string; key: keyof Fixtures['A']; body: (f: Fixtures) => unknown; invalid: unknown; fe: 'Yes' | 'No'; feList?: 'Yes' | 'No'; params: string; patchBody?: unknown };
  const cruds: Crud[] = [
    { base: '/languages', module: 'Languages', key: 'languageId', body: () => ({ name: 'Blocked lang' }), invalid: { name: '' }, fe: 'No', feList: 'Yes', params: 'name, isActive?' },
    { base: '/difficulties', module: 'Difficulties', key: 'difficultyId', body: (f) => ({ name: 'Blocked', languageId: f.A.languageId }), invalid: { name: 'x', languageId: 'nope' }, fe: 'No', feList: 'Yes', params: 'name, languageId' },
    { base: '/categories', module: 'Categories', key: 'categoryId', body: () => ({ name: 'Blocked', ranking: 1 }), invalid: { name: 'x', ranking: -1 }, fe: 'No', feList: 'Yes', params: 'name, ranking, languageId?, isActive?' },
    { base: '/subjects', module: 'Subjects', key: 'subjectId', body: () => ({ name: 'Blocked', ranking: 1 }), invalid: { ranking: 'x' }, fe: 'No', feList: 'Yes', params: 'name, ranking, languageId?' },
    { base: '/topics', module: 'Topics', key: 'topicId', body: () => ({ name: 'Blocked', ranking: 1 }), invalid: { name: 5 }, fe: 'No', feList: 'Yes', params: 'name, ranking, languageId?' },
    { base: '/category-subject-topic-mappings', module: 'CST Mappings', key: 'cstMappingId', body: (f) => ({ categoryId: f.A.categoryId, subjectId: f.A.subjectId, topicId: f.A.topicId, ranking: 2 }), invalid: { categoryId: 'x' }, patchBody: { ranking: 3 }, fe: 'No', params: 'categoryId, subjectId, topicId, ranking' },
    { base: '/instructions', module: 'Instructions', key: 'instructionId', body: () => ({ name: 'Blocked', ranking: 1 }), invalid: { name: '' }, fe: 'No', feList: 'Yes', params: 'name, ranking, isActive?' },
    { base: '/groups', module: 'Groups', key: 'groupId', body: () => ({ name: 'Blocked' }), invalid: { name: '' }, fe: 'No', params: 'name, description?, isActive?' },
    { base: '/zones', module: 'Zones', key: 'zoneId', body: () => ({ name: 'Blocked' }), invalid: { name: '' }, fe: 'No', params: 'name, isActive?' },
    { base: '/regions', module: 'Regions', key: 'regionId', body: (f) => ({ zoneId: f.A.zoneId, name: 'Blocked', latitude: 1, longitude: 1, stateName: 'S' }), invalid: { latitude: 200 }, fe: 'No', params: 'zoneId, name, latitude, longitude, stateName' },
    { base: '/centres', module: 'Centres', key: 'centreId', body: (f) => ({ zoneId: f.A.zoneId, regionId: f.A.regionId, name: 'Blocked', code: 'BLK', address: 'a', coordinatorName: 'c', coordinatorEmail: 'c@qa.test', primaryPhoneNo: '1', labCount: 1, sessionCount: 1, seats: 1, latitude: 1, longitude: 1 }), invalid: { seats: -1 }, fe: 'No', params: 'zoneId, regionId, name, code, address, coordinator*, phones, counts, lat/long' },
    { base: '/labs', module: 'Labs', key: 'labId', body: (f) => ({ zoneId: f.A.zoneId, regionId: f.A.regionId, centreId: f.A.centreId, name: 'Blocked', sessionCount: 1, seats: 1 }), invalid: { seats: 'x' }, fe: 'No', params: 'zoneId, regionId, centreId, name, sessionCount, seats' },
    { base: '/events', module: 'Events', key: 'eventId', body: () => ({ name: 'Blocked', eventCode: 'BLK', examType: 'pbt', eventType: 'mock', eventOpeningAt: '2030-01-01T00:00:00Z', eventClosingAt: '2030-01-02T00:00:00Z' }), invalid: { examType: 'x' }, patchBody: { name: 'Renamed event' }, fe: 'No', params: 'name, eventCode, examType, eventType, eventOpeningAt, eventClosingAt' },
    { base: '/sessions', module: 'Sessions', key: 'sessionId', body: () => ({ name: 'Blocked', startDate: '2030-01-01', endDate: '2030-01-02', startTime: '09:00', endTime: '10:00' }), invalid: { startTime: '25:00' }, fe: 'No', params: 'name, startDate, endDate, startTime, endTime' },
    { base: '/tests', module: 'Tests', key: 'testId', body: (f) => ({ name: 'Blocked', testCode: 'BLK', categoryId: f.A.categoryId, primaryInstructionId: f.A.instructionId, durationMinutes: 10, handicappedDurationMinutes: 10, totalQuestions: 1, totalMarks: 1, passingMarks: 0, graceMarks: 0, templateId: f.templateId }), invalid: { durationMinutes: 0 }, fe: 'Yes', params: 'Test fields (see DTO)' },
    { base: '/questions', module: 'Questions', key: 'questionId', body: (f) => ({ testId: f.A.testId, subjectId: f.A.subjectId, topicId: f.A.topicId, questionType: 'comprehension', questionData: [{ languageId: f.A.languageId, difficultyId: f.A.difficultyId, questionType: 'comprehension', options: null }] }), invalid: { questionType: 'essay' }, fe: 'Yes', params: 'testId, subjectId, topicId, questionType, questionData[], childQuestions[]?' },
    { base: '/candidates', module: 'Candidates', key: 'candidateId', body: (f) => ({ name: 'Blocked', enrollmentNumber: 'BLK-1', email: 'blk@qa.test', mobile: '1', dateOfRegistration: '2026-01-01', country: 'I', state: 'S', city: 'C', address: 'A', pincode: '1', groupIds: [f.A.groupId] }), invalid: { email: 'bad' }, fe: 'No', params: 'Candidate fields + groupIds[]' },
    { base: '/candidate-centre-mappings', module: 'Candidate-Centre Mappings', key: 'candidateCentreMappingId', body: (f) => ({ candidateId: f.A.candidateId, centreId: f.A.centreId, examDate: '2031-01-01' }), invalid: { examDate: '2031-13-40' }, patchBody: { examDate: '2031-01-02' }, fe: 'No', params: 'candidateId, centreId, examDate' },
    { base: '/test-candidate-mappings', module: 'Test-Candidate Mappings', key: 'testCandidateMappingId', body: (f) => ({ groupId: f.A.groupId, candidateId: f.A.candidateId, testId: f.A.testId, attemptNo: 9 }), invalid: { attemptNo: 0 }, patchBody: { status: 'not_started' }, fe: 'No', params: 'groupId, candidateId, testId, attemptNo?, status?, scores?' },
    { base: '/centre-users', module: 'Centre Users', key: 'centreUserId', body: (f) => ({ centreId: f.A.centreId, email: `blk.${Date.now()}@qa.test` }), invalid: { email: 'bad' }, fe: 'No', params: 'centreId, name, email, password?' },
  ];

  for (const c of cruds) {
    const id = (f: Fixtures) => String(f.A[c.key]);
    add({ apiId: `${c.base.slice(1)}.create`, module: c.module, method: 'post', path: c.base, purpose: `Create ${c.module}`, access: 'admin', real: () => c.base, body: c.body, invalidBody: c.invalid, usedByFrontend: c.fe, params: c.params, success: '201 created item' });
    add({ apiId: `${c.base.slice(1)}.list`, module: c.module, method: 'get', path: c.base, purpose: `List ${c.module}`, access: 'admin', real: () => c.base, safeRead: true, usedByFrontend: c.feList ?? c.fe, params: 'page, limit, filters', success: '200 {items, metadata}' });
    add({ apiId: `${c.base.slice(1)}.get`, module: c.module, method: 'get', path: `${c.base}/:id`, purpose: `Get ${c.module}`, access: 'admin', real: (f) => `${c.base}/${id(f)}`, idPath: (x) => `${c.base}/${x}`, safeRead: true, usedByFrontend: c.fe, params: 'id', success: '200 item' });
    add({ apiId: `${c.base.slice(1)}.update`, module: c.module, method: 'patch', path: `${c.base}/:id`, purpose: `Update ${c.module}`, access: 'admin', real: (f) => `${c.base}/${id(f)}`, idPath: (x) => `${c.base}/${x}`, body: () => c.patchBody ?? { isActive: true }, invalidBody: { unknownField: 1 }, usedByFrontend: c.fe, params: 'Partial fields', success: '200 item' });
    add({ apiId: `${c.base.slice(1)}.delete`, module: c.module, method: 'delete', path: `${c.base}/:id`, purpose: `Soft delete ${c.module}`, access: 'admin', real: (f) => `${c.base}/${id(f)}`, idPath: (x) => `${c.base}/${x}`, usedByFrontend: c.fe, params: 'id', success: '200 message' });
  }

  add({ apiId: 'difficulties.status', module: 'Difficulties', method: 'patch', path: '/difficulties/:id/status', purpose: 'Toggle difficulty active flag', access: 'admin', real: (f) => `/difficulties/${f.A.difficultyId}/status`, idPath: (x) => `/difficulties/${x}/status`, body: () => ({ isActive: true }), invalidBody: { isActive: 'yes' }, usedByFrontend: 'No', params: 'isActive', success: '200 item' });
  add({ apiId: 'tests.stats', module: 'Tests', method: 'get', path: '/tests/:id/stats', purpose: 'Question count and marks for a test', access: 'admin', real: (f) => `/tests/${f.A.testId}/stats`, idPath: (x) => `/tests/${x}/stats`, safeRead: true, usedByFrontend: 'No', params: 'id', success: '200 stats' });

  // Instruction languages (nested)
  const ilBase = (f: Fixtures) => `/instructions/${f.A.instructionId}/languages`;
  add({ apiId: 'instruction-languages.create', module: 'Instruction Languages', method: 'post', path: '/instructions/:instructionId/languages', purpose: 'Add instruction text for a language', access: 'admin', real: ilBase, body: (f) => ({ languageId: f.A.languageId, content: 'x' }), invalidBody: { content: '' }, usedByFrontend: 'No', params: 'languageId, content', success: '201 item' });
  add({ apiId: 'instruction-languages.list', module: 'Instruction Languages', method: 'get', path: '/instructions/:instructionId/languages', purpose: 'List instruction texts', access: 'admin', real: ilBase, idPath: (x) => `/instructions/${x}/languages`, safeRead: true, usedByFrontend: 'No', params: 'page, limit, languageId, isActive', success: '200 list' });
  add({ apiId: 'instruction-languages.get', module: 'Instruction Languages', method: 'get', path: '/instructions/:instructionId/languages/:id', purpose: 'Get instruction text', access: 'admin', real: (f) => `${ilBase(f)}/${f.A.instructionLanguageId}`, idPath: (x, f) => `${ilBase(f)}/${x}`, safeRead: true, usedByFrontend: 'No', params: 'instructionId, id', success: '200 item' });
  add({ apiId: 'instruction-languages.update', module: 'Instruction Languages', method: 'patch', path: '/instructions/:instructionId/languages/:id', purpose: 'Update instruction text', access: 'admin', real: (f) => `${ilBase(f)}/${f.A.instructionLanguageId}`, idPath: (x, f) => `${ilBase(f)}/${x}`, body: () => ({ content: 'Hacked' }), invalidBody: { content: '' }, usedByFrontend: 'No', params: 'languageId?, content?, isActive?', success: '200 item' });
  add({ apiId: 'instruction-languages.delete', module: 'Instruction Languages', method: 'delete', path: '/instructions/:instructionId/languages/:id', purpose: 'Delete instruction text', access: 'admin', real: (f) => `${ilBase(f)}/${f.A.instructionLanguageId}`, idPath: (x, f) => `${ilBase(f)}/${x}`, usedByFrontend: 'No', params: 'instructionId, id', success: '200 message' });

  // Candidate documents (nested)
  const docBase = (f: Fixtures) => `/candidates/${f.A.candidateId}/documents`;
  add({ apiId: 'documents.create', module: 'Candidate Documents', method: 'post', path: '/candidates/:candidateId/documents', purpose: 'Add candidate document', access: 'admin', real: docBase, body: () => ({ documentName: 'x' }), invalidBody: { documentType: 'passport' }, usedByFrontend: 'No', params: 'fileUrl?, documentType?, documentName?', success: '201 item' });
  add({ apiId: 'documents.list', module: 'Candidate Documents', method: 'get', path: '/candidates/:candidateId/documents', purpose: 'List candidate documents', access: 'admin', real: docBase, idPath: (x) => `/candidates/${x}/documents`, safeRead: true, usedByFrontend: 'No', params: 'page, limit, documentType, isActive', success: '200 list' });
  add({ apiId: 'documents.get', module: 'Candidate Documents', method: 'get', path: '/candidates/:candidateId/documents/:id', purpose: 'Get candidate document', access: 'admin', real: (f) => `${docBase(f)}/${f.A.documentId}`, idPath: (x, f) => `${docBase(f)}/${x}`, safeRead: true, usedByFrontend: 'No', params: 'candidateId, id', success: '200 item' });
  add({ apiId: 'documents.update', module: 'Candidate Documents', method: 'patch', path: '/candidates/:candidateId/documents/:id', purpose: 'Update candidate document', access: 'admin', real: (f) => `${docBase(f)}/${f.A.documentId}`, idPath: (x, f) => `${docBase(f)}/${x}`, body: () => ({ documentName: 'Hacked' }), invalidBody: { documentName: 5 }, usedByFrontend: 'No', params: 'Partial', success: '200 item' });
  add({ apiId: 'documents.delete', module: 'Candidate Documents', method: 'delete', path: '/candidates/:candidateId/documents/:id', purpose: 'Delete candidate document', access: 'admin', real: (f) => `${docBase(f)}/${f.A.documentId}`, idPath: (x, f) => `${docBase(f)}/${x}`, usedByFrontend: 'No', params: 'candidateId, id', success: '200 message' });

  // Test settings
  add({ apiId: 'test-settings.create', module: 'Test Settings', method: 'post', path: '/test-settings', purpose: 'Create settings for a test', access: 'admin', real: () => '/test-settings', body: (f) => ({ testId: f.A.testId }), invalidBody: { testId: 'x' }, usedByFrontend: 'Yes', params: 'testId + 30 flags', success: '201 item' });
  add({ apiId: 'test-settings.byTest', module: 'Test Settings', method: 'get', path: '/test-settings/test/:testId', purpose: 'Get settings by test id', access: 'admin', real: (f) => `/test-settings/test/${f.A.testId}`, idPath: (x) => `/test-settings/test/${x}`, safeRead: true, usedByFrontend: 'Yes', params: 'testId', success: '200 item' });
  add({ apiId: 'test-settings.get', module: 'Test Settings', method: 'get', path: '/test-settings/:id', purpose: 'Get settings', access: 'admin', real: (f) => `/test-settings/${f.A.testSettingId}`, idPath: (x) => `/test-settings/${x}`, safeRead: true, usedByFrontend: 'No', params: 'id', success: '200 item' });
  add({ apiId: 'test-settings.update', module: 'Test Settings', method: 'patch', path: '/test-settings/:id', purpose: 'Update settings', access: 'admin', real: (f) => `/test-settings/${f.A.testSettingId}`, idPath: (x) => `/test-settings/${x}`, body: () => ({ enableBackspace: true }), invalidBody: { clockFormat: 'x' }, usedByFrontend: 'Yes', params: 'Flags', success: '200 item' });
  add({ apiId: 'test-settings.delete', module: 'Test Settings', method: 'delete', path: '/test-settings/:id', purpose: 'Delete settings', access: 'admin', real: (f) => `/test-settings/${f.A.testSettingId}`, idPath: (x) => `/test-settings/${x}`, usedByFrontend: 'No', params: 'id', success: '200 message' });

  // Test-candidate assignment helpers
  add({ apiId: 'tcm.assignGroups', module: 'Test-Candidate Mappings', method: 'post', path: '/test-candidate-mappings/assign-groups', purpose: 'Assign a test to all candidates in groups', access: 'admin', real: () => '/test-candidate-mappings/assign-groups', body: (f) => ({ testId: f.A.testId, groupIds: [f.A.groupId] }), invalidBody: { groupIds: [] }, usedByFrontend: 'No', params: 'testId, groupIds[]', success: '201 {assigned, alreadyAssigned}' });
  add({ apiId: 'tcm.assignEmail', module: 'Test-Candidate Mappings', method: 'post', path: '/test-candidate-mappings/assign-email', purpose: 'Assign a test by candidate emails', access: 'admin', real: () => '/test-candidate-mappings/assign-email', body: (f) => ({ testId: f.A.testId, email: f.A.candidateEmail }), invalidBody: { email: 'not-an-email' }, usedByFrontend: 'No', params: 'testId, email (comma list), groupId?', success: '201 {assigned, alreadyAssigned}' });

  // Candidate self-service
  add({ apiId: 'candidates.login', module: 'Candidate Auth', method: 'post', path: '/candidates/login', purpose: 'Candidate login at an exam centre', access: 'public', real: () => '/candidates/login', invalidBody: { enrollmentNumber: '' }, usedByFrontend: 'No', params: 'companyToken, enrollmentNumber, password, centreCode', success: '200 tokens + exam desk' });
  add({ apiId: 'candidates.refresh', module: 'Candidate Auth', method: 'post', path: '/candidates/refresh', purpose: 'Rotate candidate tokens', access: 'public', real: () => '/candidates/refresh', invalidBody: {}, usedByFrontend: 'No', params: 'refreshToken', success: '200 tokens' });
  add({ apiId: 'candidates.logout', module: 'Candidate Auth', method: 'post', path: '/candidates/logout', purpose: 'Candidate logout', access: 'candidate', real: () => '/candidates/logout', body: () => ({}), usedByFrontend: 'No', params: 'None', success: '200 message' });
  add({ apiId: 'candidates.me', module: 'Candidate Auth', method: 'get', path: '/candidates/me', purpose: 'Candidate profile + exam desk', access: 'candidate', real: () => '/candidates/me', safeRead: true, usedByFrontend: 'No', params: 'None', success: '200 profile' });
  add({ apiId: 'exam.details', module: 'Candidate Exam', method: 'get', path: '/candidates/tests/:testId', purpose: 'Exam details for a mapped test', access: 'candidate', real: (f) => `/candidates/tests/${f.A.testId}`, idPath: (x) => `/candidates/tests/${x}`, safeRead: true, usedByFrontend: 'No', params: 'testId', success: '200 details' });
  add({ apiId: 'exam.paper', module: 'Candidate Exam', method: 'get', path: '/candidates/tests/:testId/questions', purpose: 'Exam paper (no answers)', access: 'candidate', real: (f) => `/candidates/tests/${f.A.testId}/questions`, idPath: (x) => `/candidates/tests/${x}/questions`, safeRead: true, usedByFrontend: 'No', params: 'testId', success: '200 paper' });
  add({ apiId: 'feedback.create', module: 'Feedback', method: 'post', path: '/candidates/tests/:testId/feedback', purpose: 'Candidate feedback for a test', access: 'candidate', real: (f) => `/candidates/tests/${f.A.testId}/feedback`, idPath: (x) => `/candidates/tests/${x}/feedback`, body: () => ({ rating: 5 }), invalidBody: { rating: 9 }, usedByFrontend: 'No', params: 'rating 1-5, comment?', success: '201 feedback' });

  // Centre user self-service
  add({ apiId: 'centre-users.login', module: 'Centre User Auth', method: 'post', path: '/centre-users/login', purpose: 'Centre user login', access: 'public', real: () => '/centre-users/login', invalidBody: { email: 'x' }, usedByFrontend: 'No', params: 'companyToken, email, password', success: '200 tokens' });
  add({ apiId: 'centre-users.refresh', module: 'Centre User Auth', method: 'post', path: '/centre-users/refresh', purpose: 'Rotate centre user tokens', access: 'public', real: () => '/centre-users/refresh', invalidBody: {}, usedByFrontend: 'No', params: 'refreshToken', success: '200 tokens' });
  add({ apiId: 'centre-users.logout', module: 'Centre User Auth', method: 'post', path: '/centre-users/logout', purpose: 'Centre user logout', access: 'centre', real: () => '/centre-users/logout', body: () => ({}), usedByFrontend: 'No', params: 'None', success: '200 message' });
  add({ apiId: 'centre-users.me', module: 'Centre User Auth', method: 'get', path: '/centre-users/me', purpose: 'Centre user profile', access: 'centre', real: () => '/centre-users/me', safeRead: true, usedByFrontend: 'No', params: 'None', success: '200 profile' });

  // Files
  add({ apiId: 'files.upload', module: 'Files', method: 'post', path: '/files/upload', purpose: 'Upload file to S3 (multipart)', access: 'any-admin-jwt', real: () => '/files/upload', body: () => ({}), usedByFrontend: 'Yes', params: 'multipart: file, folderType?, filename?', success: '201 {key, url}' });
  add({ apiId: 'files.replace', module: 'Files', method: 'put', path: '/files', purpose: 'Replace file at key (multipart)', access: 'any-admin-jwt', real: () => '/files', body: () => ({}), usedByFrontend: 'No', params: 'multipart: file, key, filename?', success: '200 {key, url}' });
  add({ apiId: 'files.uploadUrl', module: 'Files', method: 'post', path: '/files/upload-url', purpose: 'Presigned PUT URL', access: 'any-admin-jwt', real: () => '/files/upload-url', body: () => ({ fileName: 'a.png', contentType: 'image/png' }), invalidBody: { fileName: 'a.exe', contentType: 'application/x-msdownload' }, usedByFrontend: 'No', params: 'fileName, contentType, folder?, key?, expiresIn?', success: '201 {uploadUrl}' });
  add({ apiId: 'files.downloadUrl', module: 'Files', method: 'post', path: '/files/download-url', purpose: 'Presigned GET URL', access: 'any-admin-jwt', real: () => '/files/download-url', body: (f) => ({ key: `${f.A.companyId}/docs/x.png` }), invalidBody: { key: '../etc/passwd' }, usedByFrontend: 'Yes', params: 'key, expiresIn?', success: '201 {url}' });
  add({ apiId: 'files.delete', module: 'Files', method: 'delete', path: '/files', purpose: 'Delete file by key (query)', access: 'any-admin-jwt', real: () => '/files', usedByFrontend: 'No', params: 'query: key, previousKey?', success: '200 message' });

  void missing;
  return list;
}

/** Endpoints the frontend calls that the backend does not have. */
export const FRONTEND_ONLY_ENDPOINTS = [
  { method: 'POST', path: '/auth/forgot-password', caller: 'admin_frontend/src/features/auth/api/forgot-password.ts' },
  { method: 'POST', path: '/auth/forgot-password/verify', caller: 'admin_frontend/src/features/auth/api/forgot-password.ts' },
  { method: 'POST', path: '/auth/forgot-password/reset', caller: 'admin_frontend/src/features/auth/api/forgot-password.ts' },
  { method: 'GET', path: '/workspaces', caller: 'admin_frontend/src/features/workspace/api/resolve-workspace.ts' },
  { method: 'GET', path: '/dashboard', caller: 'admin_frontend/src/features/dashboard/api/fetch-dashboard-data.ts' },
  { method: 'POST', path: '/tests/import-qti', caller: 'admin_frontend/src/features/test-manager/api/tests-mutations.ts' },
];
