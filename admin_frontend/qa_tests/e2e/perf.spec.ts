import { expect, test } from '@playwright/test'
import { flush, rec, loginAdmin, WS } from './helpers'

const EV = 'admin_frontend/qa_tests/e2e/perf.spec.ts'
test.afterAll(() => flush('perf'))

async function measure(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const js = res.filter((r) => r.initiatorType === 'script' || r.name.endsWith('.js') || r.name.includes('.ts') || r.name.includes('.tsx'))
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null
    return { domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), fcp: fcp && Math.round(fcp), requests: res.length, jsRequests: js.length, transferKB: Math.round(res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024) }
  })
}

test('login page load (dev server)', async ({ page }) => {
  await page.goto(WS('/login'))
  await page.locator('#email').waitFor()
  await page.waitForTimeout(500)
  const m = await measure(page)
  rec({ key: 'perf.login.dev', category: 'perf', module: 'Login', page: 'Workspace login', title: 'Login page timings (Vite dev, unbundled)', steps: '1) Cold open /w/qa-demo/login', expected: 'FCP < 1800 ms', actual: JSON.stringify(m), status: (m.fcp ?? 9999) < 1800 ? 'Pass' : 'Fail', evidence: EV, extra: m })
  expect.soft(m.fcp ?? 9999).toBeLessThan(1800)
})

test('test list time to data with 1,101 tests', async ({ page }) => {
  await loginAdmin(page)
  const t0 = Date.now()
  await page.goto(WS('/test-manager'))
  await page.locator('tbody tr').first().waitFor({ timeout: 60000 })
  const firstRow = Date.now() - t0
  rec({ key: 'perf.tests.first-row', category: 'perf', module: 'Test Manager', page: 'Test Manager list', title: 'Time until first row shows', steps: '1) Log in 2) Open Test Manager (1,101 tests)', expected: '< 1000 ms', actual: `${firstRow} ms (waits for all 50 pages before rendering)`, status: firstRow < 1000 ? 'Pass' : 'Fail', evidence: EV, extra: { firstRow } })
  expect.soft(firstRow).toBeLessThan(1000)
})

test('test list on Slow 3G', async ({ page, context }) => {
  await loginAdmin(page)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 })
  const t0 = Date.now()
  await page.goto(WS('/test-manager'))
  const ok = await page.locator('tbody tr').first().waitFor({ timeout: 85000 }).then(() => true).catch(() => false)
  const ms = Date.now() - t0
  rec({ key: 'perf.tests.slow3g', category: 'perf', module: 'Test Manager', page: 'Test Manager list', title: 'Test list on Slow 3G', steps: '1) Emulate 400 kbps, 400 ms latency 2) Open Test Manager', expected: '< 10 s to first row', actual: ok ? `${ms} ms` : `> ${ms} ms (gave up)`, status: ok && ms < 10000 ? 'Pass' : 'Fail', evidence: EV, extra: { ms } })
  expect.soft(ok && ms < 10000).toBe(true)
})
