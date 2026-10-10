/** Error format, headers, CORS, body parsing, files. */
import request from 'supertest';
import { BASE_URL, call } from '../helpers/http';
import { flush } from '../helpers/recorder';
import { suite } from '../helpers/dsl';
import { loadFixtures } from '../helpers/fixtures';

const f = loadFixtures();
const EV = 'qa_tests/specs/08-errors-security-files.qa.spec.ts';
afterAll(() => flush('08-errors-security-files'));
const t = f.A.adminToken;
const raw = () => request(BASE_URL);

describe('Error handling', () => {
  const T = suite('Error Handling', EV);
  T('err.unknown-route', 'unknown route', {
    category: 'error', endpoint: 'GET /api/v1/nope', scenario: 'Route does not exist', expectStatus: 404, expected: '404 {success:false, message}',
    run: () => call('get', '/nope', { token: t }), verify: (r) => r.body.success === false && typeof r.body.message === 'string',
  });
  T('err.malformed-json', 'malformed JSON body', {
    category: 'error', endpoint: 'POST /api/v1/groups', scenario: 'Body "{bad json"', expectStatus: 400, expected: '400 {success:false} without parser details',
    run: () => raw().post('/api/v1/groups').set('Authorization', `Bearer ${t}`).set('Content-Type', 'application/json').send('{bad json'),
    verify: (r) => r.body.success === false && !/at JSON\.parse|SyntaxError/.test(JSON.stringify(r.body)),
  });
  T('err.urlencoded', 'form-urlencoded body', {
    category: 'error', endpoint: 'POST /api/v1/groups', scenario: 'Content-Type application/x-www-form-urlencoded', expectStatus: 415, expected: '415 Content-Type must be application/json',
    run: () => raw().post('/api/v1/groups').set('Authorization', `Bearer ${t}`).type('form').send('name=x'),
  });
  T('err.text-plain', 'text/plain body (CSRF-style simple request)', {
    category: 'security', endpoint: 'POST /api/v1/groups', scenario: 'Content-Type text/plain with JSON text', expectStatus: [400, 415], expected: '415 or 400, nothing created',
    run: () => raw().post('/api/v1/groups').set('Authorization', `Bearer ${t}`).set('Content-Type', 'text/plain').send('{"name":"csrf"}'),
  });
  T('err.too-large', 'body over 100 KB', {
    category: 'error', endpoint: 'POST /api/v1/groups', scenario: '200 KB JSON', expectStatus: 413, expected: '413 Request body is too large',
    run: () => call('post', '/groups', { token: t, body: { name: 'big', description: 'x'.repeat(200_000) } }),
  });
  T('err.null-byte-query', 'null byte in query string', {
    category: 'security', endpoint: 'GET /api/v1/groups', scenario: 'name=%00', expectStatus: 400, expected: '400 Null characters are not allowed',
    run: () => raw().get('/api/v1/groups?name=a%00b').set('Authorization', `Bearer ${t}`),
  });
  T('err.array-body', 'JSON array instead of object', {
    category: 'error', endpoint: 'POST /api/v1/groups', scenario: 'Body [1,2,3]', expectStatus: 400, expected: '400 validation error, not 500',
    run: () => raw().post('/api/v1/groups').set('Authorization', `Bearer ${t}`).send([1, 2, 3]),
  });
  T('err.proto-pollution', '__proto__ in body', {
    category: 'security', endpoint: 'POST /api/v1/groups', scenario: '{"name":"p","__proto__":{"isAdmin":true}}', expectStatus: [400, 201], expected: 'No crash; __proto__ ignored or rejected',
    run: () => raw().post('/api/v1/groups').set('Authorization', `Bearer ${t}`).set('Content-Type', 'application/json').send(`{"name":"proto ${Date.now()}","__proto__":{"isAdmin":true}}`),
  });
  T('err.wrong-type', 'number where string expected', {
    category: 'validation', endpoint: 'POST /api/v1/groups', scenario: 'name = 12345 (number)', expectStatus: 400, expected: '400 name must be a string', field: 'name', rule: 'String type',
    run: () => call('post', '/groups', { token: t, body: { name: 12345 } }),
  });
  T('err.500-format', 'server error format hides internals', {
    category: 'error', endpoint: 'POST /api/v1/tests', scenario: 'Trigger DB overflow (totalMarks 1e9)', expectStatus: [400, 500], expected: 'Generic message, no SQL/stack',
    run: () => call('post', '/tests', { token: t, body: { name: 'ovf', testCode: `OV${Date.now() % 10000}`, categoryId: f.A.categoryId, primaryInstructionId: f.A.instructionId, durationMinutes: 10, handicappedDurationMinutes: 10, totalQuestions: 1, totalMarks: 1e9, passingMarks: 0, graceMarks: 0, templateId: f.templateId } }),
    verify: (r) => !/numeric|overflow|SELECT|INSERT|QueryFailed/i.test(JSON.stringify(r.body)),
  });
  T('err.response-shape', 'success responses always use {success, message, data}', {
    category: 'error', endpoint: 'GET /api/v1/candidates/:id', scenario: 'Compare shape with other modules', expectStatus: 200, expected: 'success + message + data',
    run: () => call('get', `/candidates/${f.A.candidateId}`, { token: t }), verify: (r) => r.body.success === true && 'message' in r.body && 'data' in r.body,
  });
  T('err.method-not-allowed', 'PUT on a PATCH-only resource', {
    category: 'error', endpoint: 'PUT /api/v1/groups/:id', scenario: 'Wrong HTTP method', expectStatus: [404, 405], expected: '404/405 with JSON body',
    run: () => call('put', `/groups/${f.A.groupId}`, { token: t, body: {} }), verify: (r) => r.body.success === false,
  });
});

describe('Security headers and CORS', () => {
  const T = suite('Security', EV);
  T('sec.headers', 'helmet headers present', {
    category: 'security', endpoint: 'GET /api/v1/health', scenario: 'Check response headers', expectStatus: 200, expected: 'CSP, X-Frame-Options DENY, nosniff, HSTS, no X-Powered-By',
    run: async () => {
      const r = await raw().get('/api/v1/health');
      const h = r.headers;
      const ok = h['x-frame-options'] === 'DENY' && h['x-content-type-options'] === 'nosniff' && Boolean(h['strict-transport-security']) && Boolean(h['content-security-policy']) && !h['x-powered-by'];
      return { status: ok ? 200 : 500, body: { message: `xfo=${h['x-frame-options']} nosniff=${h['x-content-type-options']} hsts=${Boolean(h['strict-transport-security'])} csp=${Boolean(h['content-security-policy'])} powered=${h['x-powered-by'] ?? 'none'}` } };
    },
  });
  T('sec.cors-evil', 'CORS rejects unknown origin', {
    category: 'security', endpoint: 'OPTIONS /api/v1/auth/login', scenario: 'Origin: https://evil.example', expectStatus: [200, 204, 404], expected: 'No Access-Control-Allow-Origin for evil origin',
    run: async () => {
      const r = await raw().options('/api/v1/auth/login').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
      return { status: r.headers['access-control-allow-origin'] ? 500 : 204, body: { message: `ACAO=${r.headers['access-control-allow-origin'] ?? 'none'}` } };
    },
  });
  T('sec.cors-allowed', 'CORS allows configured origin', {
    category: 'security', endpoint: 'OPTIONS /api/v1/auth/login', scenario: 'Origin: http://localhost:5173', expectStatus: 204, expected: 'ACAO = http://localhost:5173',
    run: async () => {
      const r = await raw().options('/api/v1/auth/login').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'POST');
      return { status: r.headers['access-control-allow-origin'] === 'http://localhost:5173' ? 204 : 500, body: { message: `ACAO=${r.headers['access-control-allow-origin'] ?? 'none'}` } };
    },
  });
  T('sec.cors-workspace-headers', 'CORS preflight for headers the frontend sends', {
    category: 'security', endpoint: 'OPTIONS /api/v1/tests', scenario: 'Access-Control-Request-Headers: authorization,x-workspace-id,x-workspace-slug', expectStatus: 204, expected: 'Headers allowed (frontend always sends them)',
    run: async () => {
      const r = await raw().options('/api/v1/tests').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'GET').set('Access-Control-Request-Headers', 'authorization,x-workspace-id,x-workspace-slug');
      const allowed = String(r.headers['access-control-allow-headers'] ?? '').toLowerCase();
      return { status: allowed.includes('x-workspace-id') ? 204 : 500, body: { message: `allow-headers=${allowed}` } };
    },
  });
  T('sec.swagger-public', 'Swagger docs are public', {
    category: 'security', endpoint: 'GET /docs', scenario: 'Open /docs without login', expectStatus: [401, 404], expected: 'Docs hidden in production or behind auth',
    run: () => raw().get('/docs'),
  });
  T('sec.health-public', 'health endpoint shows infrastructure details', {
    category: 'security', endpoint: 'GET /api/v1/health', scenario: 'Anonymous call', expectStatus: 200, expected: 'Only up/down, no internal names (records DB+Redis names today)',
    run: () => call('get', '/health'), verify: (r) => !JSON.stringify(r.body).includes('redis'),
  });
});

describe('Files', () => {
  const T = suite('Files', EV);
  T('files.upload.no-file', 'upload without file', {
    endpoint: 'POST /api/v1/files/upload', scenario: 'Empty multipart', expectStatus: 400, expected: '400 No file provided',
    run: () => raw().post('/api/v1/files/upload').set('Authorization', `Bearer ${t}`).field('folderType', 'docs'),
  });
  T('files.upload.exe', 'upload .exe', {
    category: 'security', endpoint: 'POST /api/v1/files/upload', scenario: 'virus.exe application/x-msdownload', expectStatus: 400, expected: '400 This file type is not allowed',
    run: () => raw().post('/api/v1/files/upload').set('Authorization', `Bearer ${t}`).attach('file', Buffer.from('MZ fake'), { filename: 'virus.exe', contentType: 'application/x-msdownload' }),
  });
  T('files.upload.renamed-exe', 'exe renamed to .jpg with image content type', {
    category: 'security', endpoint: 'POST /api/v1/files/upload', scenario: 'MZ header bytes, name photo.jpg, type image/jpeg', expectStatus: 400, expected: '400 file content is not an image (magic bytes check)',
    run: () => raw().post('/api/v1/files/upload').set('Authorization', `Bearer ${t}`).attach('file', Buffer.from('MZ\x90\x00 executable'), { filename: 'photo.jpg', contentType: 'image/jpeg' }),
  });
  T('files.upload.svg', 'upload SVG', {
    category: 'security', endpoint: 'POST /api/v1/files/upload', scenario: 'logo.svg image/svg+xml', expectStatus: 400, expected: '400 not allowed (SVG can carry script)',
    run: () => raw().post('/api/v1/files/upload').set('Authorization', `Bearer ${t}`).attach('file', Buffer.from('<svg onload="alert(1)"/>'), { filename: 'logo.svg', contentType: 'image/svg+xml' }),
  });
  T('files.upload.s3-disabled', 'upload valid image when S3 is off', {
    category: 'error', endpoint: 'POST /api/v1/files/upload', scenario: 'AWS_ENABLED=false (QA env)', expectStatus: 503, expected: '503 File uploads are temporarily unavailable',
    run: () => raw().post('/api/v1/files/upload').set('Authorization', `Bearer ${t}`).attach('file', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'a.png', contentType: 'image/png' }),
  });
  T('files.upload.huge', 'upload 60 MB file', {
    category: 'edge', endpoint: 'POST /api/v1/files/upload', scenario: '60 MB PNG (limit 50 MB)', expectStatus: 413, expected: '413 File too large',
    run: () => raw().post('/api/v1/files/upload').set('Authorization', `Bearer ${t}`).attach('file', Buffer.alloc(60 * 1024 * 1024, 1), { filename: 'big.png', contentType: 'image/png' }),
  });
  T('files.upload.empty', 'upload empty file', {
    category: 'edge', endpoint: 'POST /api/v1/files/upload', scenario: '0 byte empty.png', expectStatus: 400, expected: '400 empty file',
    run: () => raw().post('/api/v1/files/upload').set('Authorization', `Bearer ${t}`).attach('file', Buffer.alloc(0), { filename: 'empty.png', contentType: 'image/png' }),
  });
  T('files.download.traversal', 'download URL for ../ key', {
    category: 'security', endpoint: 'POST /api/v1/files/download-url', scenario: 'key = ../other/x.png', expectStatus: 400, expected: '400 Invalid file path',
    run: () => call('post', '/files/download-url', { token: t, body: { key: '../other/x.png' } }),
  });
  T('files.download.other-tenant', 'download URL for company B key', {
    category: 'security', endpoint: 'POST /api/v1/files/download-url', scenario: 'key = <companyB>/docs/x.png', expectStatus: 400, expected: '400 Invalid file path (tenant check)',
    run: () => call('post', '/files/download-url', { token: t, body: { key: `${f.B.companyId}/docs/x.png` } }),
  });
  T('files.delete.other-tenant', 'delete company B file', {
    category: 'security', endpoint: 'DELETE /api/v1/files', scenario: 'key of company B', expectStatus: 400, expected: '400 Invalid file path',
    run: () => call('delete', '/files', { token: t, query: { key: `${f.B.companyId}/docs/x.png` } }),
  });
});
