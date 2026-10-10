import { appendFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import type { Page } from '@playwright/test'

export const DEMO = { slug: 'qa-demo', email: 'admin@qa-demo.test', password: 'DemoAdmin@123' }
export const SUPER = { email: 'superadmin@qa.test', password: 'SuperQa@12345' }
export const API = process.env.QA_API_URL ?? 'http://localhost:3000/api/v1'
const HERE = dirname(fileURLToPath(import.meta.url))
export const SHOTS = join(HERE, '..', '..', '..', 'qa_frontend', 'screenshots')
mkdirSync(SHOTS, { recursive: true })

export type Row = {
  key: string
  category: 'functional' | 'edge' | 'validation' | 'api' | 'a11y' | 'responsive' | 'perf' | 'security' | 'sim' | 'design'
  module: string
  page: string
  title: string
  steps: string
  data?: string
  expected: string
  actual: string
  status: 'Pass' | 'Fail' | 'Blocked' | 'Not Run'
  evidence: string
  extra?: Record<string, unknown>
}

/**
 * Rows are appended to results/e2e-rows.jsonl right away, because Playwright restarts
 * the worker after a failed test (in-memory state would be lost).
 */
const RESULTS = join(HERE, '..', 'results')
mkdirSync(RESULTS, { recursive: true })
export function rec(row: Row) {
  appendFileSync(join(RESULTS, 'e2e-rows.jsonl'), `${JSON.stringify({ ...row, at: new Date().toISOString() })}\n`)
}
/** Kept for spec compatibility; rows are already on disk. */
export function flush(_name: string) {}

export async function shot(page: Page, name: string, fullPage = true) {
  const file = join(SHOTS, `${name}.png`)
  await page.screenshot({ path: file, fullPage })
  return `qa_frontend/screenshots/${name}.png`
}

export async function loginAdmin(page: Page) {
  await page.goto(`/w/${DEMO.slug}/login`)
  await page.fill('#email', DEMO.email)
  await page.fill('#password', DEMO.password)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/dashboard/)
}

// Production build served by `vite preview` (set by run-e2e.sh). The app sends window.location.origin as the
// workspace URL, so map the preview host back to the seeded http://localhost:5173 URL.
export const PROD = process.env.QA_PROD_URL ?? ''
export async function useProd(page: Page) {
  if (!PROD) return ''
  await page.route('**/api/v1/companies/verify-workspace', (r) => r.continue({ postData: (r.request().postData() ?? '').replace(new URL(PROD).host, 'localhost:5173') }))
  return PROD
}

export async function loginAdminAt(page: Page, base: string) {
  await page.goto(`${base}/w/${DEMO.slug}/login`)
  await page.fill('#email', DEMO.email)
  await page.fill('#password', DEMO.password)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/dashboard/)
}

export async function loginSuper(page: Page) {
  await page.goto('/login')
  await page.fill('#email', SUPER.email)
  await page.fill('#password', SUPER.password)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/workspaces/)
}

export async function apiJson(method: string, path: string, body?: unknown, token?: string) {
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

export async function demoAdminToken() {
  const ws = await apiJson('POST', '/companies/verify-workspace', { workspaceUrl: `http://localhost:5173/w/${DEMO.slug}` })
  const l = await apiJson('POST', '/auth/login', { companyToken: ws.body.data.companyToken, email: DEMO.email, password: DEMO.password })
  return l.body.data.accessToken as string
}

export async function superToken() {
  const l = await apiJson('POST', '/super-admin/login', SUPER)
  return l.body.data.accessToken as string
}

/** Collects console errors and failed API calls for a page. */
export function watch(page: Page) {
  const errors: string[] = []
  const api: { method: string; url: string; status: number }[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`))
  page.on('response', (r) => {
    if (r.url().includes('/api/v1')) api.push({ method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status() })
  })
  return { errors, api }
}

export async function toastText(page: Page, timeout = 6000) {
  const t = page.locator('[data-sonner-toast]').first()
  try {
    await t.waitFor({ timeout })
    return (await t.innerText()).replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}

export const WS = (path: string) => `/w/${DEMO.slug}${path}`

/** Record a result and assert it. */
export function verdict(row: Omit<Row, 'status'>, pass: boolean, expectFn: (v: boolean, msg: string) => void) {
  rec({ ...row, status: pass ? 'Pass' : 'Fail' })
  expectFn(pass, `${row.key}: expected "${row.expected}" but got "${row.actual}"`)
}
