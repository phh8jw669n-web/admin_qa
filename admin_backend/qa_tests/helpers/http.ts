import request from 'supertest';

export const BASE_URL = process.env.QA_BASE_URL ?? 'http://localhost:3000';
export const API = '/api/v1';

export const http = () => request(BASE_URL);

export function bearer(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export async function call(
  method: HttpMethod,
  path: string,
  opts: { token?: string | null; body?: unknown; query?: Record<string, unknown>; headers?: Record<string, string> } = {},
) {
  let req = http()[method](`${API}${path}`).set(bearer(opts.token));
  if (opts.headers) req = req.set(opts.headers);
  if (opts.query) req = req.query(opts.query as Record<string, string>);
  if (opts.body !== undefined) req = req.send(opts.body as object);
  return req;
}

/** Short one-line summary of a response body for CSV evidence. */
export function short(body: unknown, max = 160): string {
  if (body == null || body === '') return '(empty)';
  const b = body as Record<string, unknown>;
  let text: string;
  if (typeof b === 'object' && ('message' in b || 'errors' in b)) {
    const parts = [] as string[];
    if (b.message) parts.push(String(b.message));
    if (Array.isArray(b.errors)) parts.push((b.errors as string[]).join('; '));
    text = parts.join(' | ');
  } else {
    text = JSON.stringify(body);
  }
  text = text.replace(/\s+/g, ' ');
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
