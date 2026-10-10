import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { short } from './http';

export type Category = 'api' | 'auth' | 'validation' | 'edge' | 'error' | 'sim' | 'db' | 'security';

export type ResultRow = {
  key: string;
  category: Category;
  module: string;
  endpoint: string;
  scenario: string;
  request: string;
  expectedStatus: string;
  expected: string;
  actualStatus: string;
  actual: string;
  status: 'Pass' | 'Fail';
  evidence: string;
  role?: string;
  shouldAllow?: string;
  wasAllowed?: string;
  field?: string;
  rule?: string;
  leaks?: string;
  ms?: number;
};

const rows: ResultRow[] = [];

export function record(row: ResultRow) {
  rows.push(row);
}

export function flush(specName: string) {
  const dir = join(__dirname, '..', 'results');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${specName}.json`), JSON.stringify(rows, null, 1));
}

type CheckInput = {
  key: string;
  category?: Category;
  module: string;
  endpoint: string;
  scenario: string;
  request?: unknown;
  expectStatus: number | number[];
  expected: string;
  run: () => Promise<{ status: number; body: unknown; text?: string }>;
  /** Extra assertion on the response. Return true when it is correct. */
  verify?: (res: { status: number; body: any }) => boolean;
  evidence: string;
  role?: string;
  field?: string;
  rule?: string;
};

/** Runs one API check, records the real result, returns pass flag and response. */
export async function check(input: CheckInput) {
  const started = Date.now();
  const res = await input.run();
  const ms = Date.now() - started;
  const expected = Array.isArray(input.expectStatus) ? input.expectStatus : [input.expectStatus];
  let pass = expected.includes(res.status);
  if (pass && input.verify) {
    try {
      pass = Boolean(input.verify(res as { status: number; body: any }));
    } catch {
      pass = false;
    }
  }
  const bodyText = JSON.stringify(res.body ?? '');
  const leaks = /QueryFailedError|at \w+ \(|node_modules|stack|SELECT |INSERT INTO|duplicate key value/i.test(bodyText);
  const allowed = res.status >= 200 && res.status < 300;
  record({
    key: input.key,
    category: input.category ?? 'api',
    module: input.module,
    endpoint: input.endpoint,
    scenario: input.scenario,
    request: input.request === undefined ? 'N/A' : typeof input.request === 'string' ? input.request : JSON.stringify(input.request).slice(0, 220),
    expectedStatus: expected.join(' or '),
    expected: input.expected,
    actualStatus: String(res.status),
    actual: short(res.body),
    status: pass ? 'Pass' : 'Fail',
    evidence: input.evidence,
    role: input.role,
    shouldAllow: expected.some((s) => s >= 200 && s < 300) ? 'Yes' : 'No',
    wasAllowed: allowed ? 'Yes' : 'No',
    field: input.field,
    rule: input.rule,
    leaks: leaks ? 'Yes' : 'No',
    ms,
  });
  return { pass, res };
}
