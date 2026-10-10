import { readFileSync } from 'fs';
import { join } from 'path';
import { call } from './http';

export const FIXTURE_FILE = join(__dirname, '..', '.fixtures.json');

export const SUPER_ADMIN = {
  email: process.env.QA_SUPER_ADMIN_EMAIL ?? 'superadmin@qa.test',
  password: process.env.QA_SUPER_ADMIN_PASSWORD ?? 'SuperQa@12345',
};

export type TenantFixture = {
  companyId: string;
  companyToken: string;
  workspaceUrl: string;
  adminEmail: string;
  adminPassword: string;
  adminId: string;
  adminToken: string;
  adminRefresh: string;
  languageId: string;
  difficultyId: string;
  categoryId: string;
  subjectId: string;
  topicId: string;
  cstMappingId: string;
  instructionId: string;
  instructionLanguageId: string;
  testId: string;
  testSettingId: string;
  questionId: string;
  groupId: string;
  candidateId: string;
  candidateEmail: string;
  candidateEnrollment: string;
  candidatePassword: string;
  documentId: string;
  zoneId: string;
  regionId: string;
  centreId: string;
  centreCode: string;
  labId: string;
  centreUserId: string;
  centreUserEmail: string;
  centreUserPassword: string;
  candidateCentreMappingId: string;
  testCandidateMappingId: string;
  eventId: string;
  sessionId: string;
  candidateToken: string;
  candidateRefresh: string;
  centreUserToken: string;
  centreUserRefresh: string;
};

export type Fixtures = {
  suffix: string;
  superAdminToken: string;
  superAdminId: string;
  templateId: string;
  A: TenantFixture;
  B: TenantFixture;
};

export function loadFixtures(): Fixtures {
  return JSON.parse(readFileSync(FIXTURE_FILE, 'utf8')) as Fixtures;
}

export async function must<T = any>(
  label: string,
  p: Promise<{ status: number; body: any }>,
): Promise<T> {
  const res = await p;
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Fixture step failed: ${label} -> ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body?.data as T;
}

export function randomLetters(n: number) {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: n }, () => a[Math.floor(Math.random() * a.length)]).join('');
}

export function gst() {
  return `27${randomLetters(5)}${String(Math.floor(Math.random() * 9000) + 1000)}${randomLetters(1)}1Z${randomLetters(1)}`;
}

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export function companyBody(slug: string, adminEmail: string, adminPassword?: string) {
  return {
    name: `QA ${slug}`,
    workspaceUrl: `http://localhost:5173/w/${slug}`,
    addressLine1: '1 QA Street',
    pinCode: '400001',
    city: 'Mumbai',
    state: 'MH',
    country: 'India',
    phone: '9876543210',
    email: adminEmail,
    gstNo: gst(),
    firstName: 'QA',
    lastName: `Admin ${slug}`,
    primaryColor: '#0D9488',
    secondaryColor: '#0f172a',
    ...(adminPassword ? { adminPassword } : {}),
  };
}

export async function login(email: string, password: string, companyToken: string) {
  return must<{ accessToken: string; refreshToken: string; admin: { id: string } }>(
    `admin login ${email}`,
    call('post', '/auth/login', { body: { email, password, companyToken } }),
  );
}

export async function buildTenant(
  sa: string,
  slug: string,
  templateId: string,
): Promise<TenantFixture> {
  const adminEmail = `admin.${slug}@qa.test`;
  const adminPassword = 'AdminQa@12345';
  const company = await must('create company', call('post', '/super-admin/companies', { token: sa, body: companyBody(slug, adminEmail, adminPassword) }));
  const verify = await must('verify workspace', call('post', '/companies/verify-workspace', { body: { workspaceUrl: company.workspaceUrl } }));
  const session = await login(adminEmail, adminPassword, verify.companyToken);
  const t = session.accessToken;
  const language = await must('language', call('post', '/languages', { token: t, body: { name: `English ${slug}` } }));
  const difficulty = await must('difficulty', call('post', '/difficulties', { token: t, body: { name: `Easy ${slug}`, languageId: language.id } }));
  const category = await must('category', call('post', '/categories', { token: t, body: { name: `Category ${slug}`, ranking: 1 } }));
  const subject = await must('subject', call('post', '/subjects', { token: t, body: { name: `Physics ${slug}`, ranking: 1 } }));
  const topic = await must('topic', call('post', '/topics', { token: t, body: { name: `Optics ${slug}`, ranking: 1 } }));
  const cst = await must('cst mapping', call('post', '/category-subject-topic-mappings', { token: t, body: { categoryId: category.id, subjectId: subject.id, topicId: topic.id, ranking: 1 } }));
  const instruction = await must('instruction', call('post', '/instructions', { token: t, body: { name: `Instruction ${slug}`, ranking: 1 } }));
  const il = await must('instruction language', call('post', `/instructions/${instruction.id}/languages`, { token: t, body: { languageId: language.id, content: '<p>Read carefully</p>' } }));
  const test = await must('test', call('post', '/tests', { token: t, body: testBody(slug, category.id, instruction.id, templateId) }));
  const setting = await must('test setting', call('post', '/test-settings', { token: t, body: { testId: test.id } }));
  const question = await must('question', call('post', '/questions', { token: t, body: singleChoiceBody(test.id, subject.id, topic.id, language.id, difficulty.id) }));
  const group = await must('group', call('post', '/groups', { token: t, body: { name: `Group ${slug}` } }));
  const candidateEmail = `cand.${slug}@qa.test`;
  const candidateEnrollment = `ENR-${slug}`.slice(0, 100);
  const candidatePassword = 'CandQa@12345';
  const candidate = await must('candidate', call('post', '/candidates', { token: t, body: candidateBody(candidateEmail, candidateEnrollment, group.id, candidatePassword) }));
  const document = await must('document', call('post', `/candidates/${candidate.id}/documents`, { token: t, body: { documentType: 'id_proof', documentName: 'Aadhaar', fileUrl: 'docs/x.pdf' } }));
  const zone = await must('zone', call('post', '/zones', { token: t, body: { name: `West ${slug}` } }));
  const region = await must('region', call('post', '/regions', { token: t, body: { zoneId: zone.id, name: `Mumbai ${slug}`, latitude: 19.07, longitude: 72.87, stateName: 'MH' } }));
  const centreCode = `C-${slug}`.slice(0, 50);
  const centre = await must('centre', call('post', '/centres', { token: t, body: centreBody(zone.id, region.id, centreCode, slug) }));
  const lab = await must('lab', call('post', '/labs', { token: t, body: { zoneId: zone.id, regionId: region.id, centreId: centre.id, name: `Lab ${slug}`, sessionCount: 2, seats: 30 } }));
  const centreUserEmail = `centre.${slug}@qa.test`;
  const centreUserPassword = 'CentreQa@12345';
  const centreUser = await must('centre user', call('post', '/centre-users', { token: t, body: { centreId: centre.id, name: 'Centre Op', email: centreUserEmail, password: centreUserPassword } }));
  const ccm = await must('candidate centre mapping', call('post', '/candidate-centre-mappings', { token: t, body: { candidateId: candidate.id, centreId: centre.id, examDate: todayUtc() } }));
  const tcm = await must('test candidate mapping', call('post', '/test-candidate-mappings', { token: t, body: { groupId: group.id, candidateId: candidate.id, testId: test.id } }));
  const event = await must('event', call('post', '/events', { token: t, body: { name: `Event ${slug}`, eventCode: `EV-${slug}`.slice(0, 50), examType: 'cbt_private', eventType: 'regular', eventOpeningAt: '2030-01-01T09:00:00Z', eventClosingAt: '2030-01-02T09:00:00Z' } }));
  const sessionRow = await must('session', call('post', '/sessions', { token: t, body: { name: `Session ${slug}`, startDate: '2030-01-01', endDate: '2030-01-02', startTime: '09:00', endTime: '12:00' } }));
  const cand = await must<{ accessToken: string; refreshToken: string }>('candidate login', call('post', '/candidates/login', { body: { companyToken: verify.companyToken, enrollmentNumber: candidateEnrollment, password: candidatePassword, centreCode } }));
  const cu = await must<{ accessToken: string; refreshToken: string }>('centre login', call('post', '/centre-users/login', { body: { companyToken: verify.companyToken, email: centreUserEmail, password: centreUserPassword } }));

  return {
    companyId: company.id,
    companyToken: verify.companyToken,
    workspaceUrl: company.workspaceUrl,
    adminEmail,
    adminPassword,
    adminId: session.admin.id,
    adminToken: t,
    adminRefresh: session.refreshToken,
    languageId: language.id,
    difficultyId: difficulty.id,
    categoryId: category.id,
    subjectId: subject.id,
    topicId: topic.id,
    cstMappingId: cst.id,
    instructionId: instruction.id,
    instructionLanguageId: il.id,
    testId: test.id,
    testSettingId: setting.id,
    questionId: question.question.id,
    groupId: group.id,
    candidateId: candidate.id,
    candidateEmail,
    candidateEnrollment,
    candidatePassword,
    documentId: document.id,
    zoneId: zone.id,
    regionId: region.id,
    centreId: centre.id,
    centreCode,
    labId: lab.id,
    centreUserId: centreUser.id,
    centreUserEmail,
    centreUserPassword,
    candidateCentreMappingId: ccm.id,
    testCandidateMappingId: tcm.id,
    eventId: event.id,
    sessionId: sessionRow.id,
    candidateToken: cand.accessToken,
    candidateRefresh: cand.refreshToken,
    centreUserToken: cu.accessToken,
    centreUserRefresh: cu.refreshToken,
  };
}

export function testBody(slug: string, categoryId: string, instructionId: string, templateId: string, extra: Record<string, unknown> = {}) {
  return {
    name: `Test ${slug}`,
    testCode: `T${slug}`.replace(/[^A-Za-z0-9]/g, '').slice(0, 10),
    description: 'QA test',
    categoryId,
    primaryInstructionId: instructionId,
    durationMinutes: 60,
    handicappedDurationMinutes: 80,
    totalQuestions: 10,
    totalMarks: 40,
    passingMarks: 16,
    graceMarks: 0,
    templateId,
    isDraft: true,
    isPublished: false,
    startDate: '2030-01-01',
    endDate: '2030-01-02',
    startTime: '09:00',
    endTime: '12:00',
    ...extra,
  };
}

export function singleChoiceBody(testId: string, subjectId: string, topicId: string, languageId: string, difficultyId: string) {
  return {
    testId,
    subjectId,
    topicId,
    questionType: 'single_choice',
    questionData: [
      {
        languageId,
        difficultyId,
        questionType: 'single_choice',
        questionText: 'What is 2 + 2?',
        options: { options: [{ id: 'a', text: '3' }, { id: 'b', text: '4' }], correctOptions: ['b'] },
        rightMarks: 4,
        negativeMarks: 1,
      },
    ],
  };
}

export function candidateBody(email: string, enrollment: string, groupId: string, password?: string) {
  return {
    name: 'QA Candidate',
    enrollmentNumber: enrollment,
    email,
    mobile: '9000000000',
    dateOfRegistration: '2026-01-01',
    country: 'India',
    state: 'MH',
    city: 'Mumbai',
    address: '1 Exam Road',
    pincode: '400001',
    groupIds: [groupId],
    ...(password ? { password } : {}),
  };
}

export function centreBody(zoneId: string, regionId: string, code: string, slug: string) {
  return {
    zoneId,
    regionId,
    name: `Centre ${slug}`,
    code,
    address: '2 Centre Road',
    coordinatorName: 'Coord',
    coordinatorEmail: `coord.${slug}@qa.test`,
    primaryPhoneNo: '9111111111',
    labCount: 1,
    sessionCount: 2,
    seats: 30,
    latitude: 19.1,
    longitude: 72.9,
  };
}
