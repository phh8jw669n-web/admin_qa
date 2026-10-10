import { expect, test } from '@playwright/test'
import { flush, loginAdmin, loginSuper, shot, verdict, watch, WS } from './helpers'

const EV = 'admin_frontend/qa_tests/e2e/pages-states.spec.ts'
const ok = (v: boolean, m: string) => expect.soft(v, m).toBe(true)
test.afterAll(() => flush('pages-states'))

test.describe('Placeholder and mock pages', () => {
  test('dashboard shows real data', async ({ page }) => {
    const w = watch(page)
    await loginAdmin(page)
    await page.waitForTimeout(1500)
    const t = await page.locator('main').innerText()
    const dashCall = w.api.some((a) => a.url.includes('/dashboard'))
    const ev = await shot(page, 'dashboard')
    verdict({ key: 'fe.dashboard.real-data', category: 'api', module: 'Dashboard', page: '/w/:slug/dashboard', title: 'Dashboard numbers come from the API', steps: '1) Log in to qa-demo (1,200 candidates, 1,101 tests) 2) Read cards', expected: 'Total candidates 1200 and total tests 1101', actual: `API called=${dashCall}; cards: ${t.slice(0, 160).replace(/\s+/g, ' ')}`, evidence: ev }, dashCall && t.includes('1,200'), ok)
  })

  test('question bank page is a placeholder', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(WS('/question-bank'))
    const t = await page.locator('main').innerText()
    const ev = await shot(page, 'question-bank')
    verdict({ key: 'fe.question-bank.placeholder', category: 'functional', module: 'Question Bank', page: '/w/:slug/question-bank', title: 'Question Bank has content', steps: '1) Open Question Bank', expected: 'List of subjects/questions', actual: t.slice(0, 160).replace(/\s+/g, ' '), evidence: ev }, !/scaffold/i.test(t), ok)
  })

  test('question bank filter Apply does nothing', async ({ page }) => {
    const w = watch(page)
    await loginAdmin(page)
    await page.goto(WS('/question-bank'))
    await page.waitForTimeout(1000)
    const before = w.api.filter((a) => !/verify-workspace|auth/.test(a.url)).length
    await page.getByRole('button', { name: /apply/i }).click()
    await page.waitForTimeout(1500)
    const after = w.api.filter((a) => !/verify-workspace|auth/.test(a.url)).length
    verdict({ key: 'fe.question-bank.filter', category: 'functional', module: 'Question Bank', page: '/w/:slug/question-bank', title: 'Filter Apply', steps: '1) Open Question Bank 2) Click Apply', expected: 'Results update or button is hidden until feature exists', actual: `${after - before} data API calls; no visible change (onSearch is a no-op)`, evidence: EV }, after > before, ok)
  })

  test('category management page is a placeholder', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(WS('/category-management'))
    const t = await page.locator('main').innerText()
    const ev = await shot(page, 'category-management')
    verdict({ key: 'fe.category.placeholder', category: 'functional', module: 'Category Management', page: '/w/:slug/category-management', title: 'Category page has content', steps: '1) Open Test Manager > Category', expected: 'Category tree from /categories', actual: t.slice(0, 160).replace(/\s+/g, ' '), evidence: ev }, !/scaffold/i.test(t), ok)
  })
})

test.describe('Loading, empty and error states (Test Manager list)', () => {
  test('API 500 shows an error', async ({ page }) => {
    await loginAdmin(page)
    await page.route('**/api/v1/tests?**', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Something went wrong. Please try again.' }) }))
    await page.goto(WS('/test-manager'))
    await page.waitForTimeout(4000)
    const t = await page.locator('main').innerText()
    const ev = await shot(page, 'test-list-500')
    verdict({ key: 'fe.state.500', category: 'api', module: 'Test Manager', page: '/w/:slug/test-manager', title: 'List API returns 500', steps: '1) Mock GET /tests -> 500 2) Open Test Manager', expected: 'Error message with Retry button', actual: /something went wrong/i.test(t) ? `Error shown; retry button=${/retry/i.test(t)}` : 'No error shown', evidence: ev }, /something went wrong/i.test(t) && /retry/i.test(t), ok)
  })

  test('empty list shows empty state', async ({ page }) => {
    await loginAdmin(page)
    await page.route('**/api/v1/tests?**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], metadata: { total: 0, page: 1, limit: 20, totalPages: 0 } } }) }))
    await page.goto(WS('/test-manager'))
    await page.waitForTimeout(2500)
    const t = await page.locator('main').innerText()
    const ev = await shot(page, 'test-list-empty')
    verdict({ key: 'fe.state.empty', category: 'api', module: 'Test Manager', page: '/w/:slug/test-manager', title: 'No tests yet', steps: '1) Mock empty list 2) Open Test Manager', expected: 'Friendly empty state with Create Tests action', actual: t.slice(-120).replace(/\s+/g, ' '), evidence: ev }, /no (tests|results|data)/i.test(t), ok)
  })

  test('slow API shows a loader', async ({ page }) => {
    await loginAdmin(page)
    await page.route('**/api/v1/tests?**', async (r) => {
      await new Promise((res) => setTimeout(res, 4000))
      await r.continue()
    })
    await page.goto(WS('/test-manager'))
    await page.waitForTimeout(1500)
    const loader = await page.locator('[role=status], .animate-spin, [aria-busy=true]').count()
    const ev = await shot(page, 'test-list-slow')
    verdict({ key: 'fe.state.slow', category: 'api', module: 'Test Manager', page: '/w/:slug/test-manager', title: 'Slow network', steps: '1) Delay GET /tests by 4 s 2) Open Test Manager', expected: 'Loader visible while waiting', actual: `${loader} loader element(s)`, evidence: ev }, loader > 0, ok)
  })

  test('offline while using the list', async ({ page, context }) => {
    await loginAdmin(page)
    await page.goto(WS('/test-manager'))
    await page.locator('tbody tr').first().waitFor({ timeout: 60000 })
    await context.setOffline(true)
    await page.getByRole('button', { name: /filters/i }).click()
    await page.getByLabel(/name/i).first().fill('Offline search')
    await page.getByRole('button', { name: /apply|search/i }).first().click()
    await page.waitForTimeout(3000)
    const t = await page.locator('main').innerText()
    const ev = await shot(page, 'offline')
    await context.setOffline(false)
    verdict({ key: 'fe.state.offline', category: 'api', module: 'Test Manager', page: '/w/:slug/test-manager', title: 'No network while searching', steps: '1) Open Test Manager 2) Go offline 3) Search by name', expected: 'Clear "You are offline / network error" message', actual: /network|offline/i.test(t) ? 'Network message shown' : t.slice(0, 120).replace(/\s+/g, ' '), evidence: ev }, /offline|network/i.test(t), ok)
  })

  test('API 401 during use sends user to login', async ({ page }) => {
    await loginAdmin(page)
    await page.route('**/api/v1/tests?**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Please sign in to continue' }) }))
    await page.goto(WS('/test-manager'))
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => undefined)
    verdict({ key: 'fe.state.401', category: 'api', module: 'Routing', page: '/w/:slug/test-manager', title: 'Session ends while browsing', steps: '1) Mock GET /tests -> 401 2) Open Test Manager', expected: 'Redirect to login with redirect param', actual: page.url().split('5173')[1], evidence: EV }, /login\?redirect=/.test(page.url()), ok)
  })

  test('companies API 500 shows error', async ({ page }) => {
    await loginSuper(page)
    await page.route('**/api/v1/super-admin/companies**', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Something went wrong. Please try again.' }) }))
    await page.goto('/companies')
    await page.waitForTimeout(3500)
    const t = await page.locator('main').innerText()
    verdict({ key: 'fe.state.companies-500', category: 'api', module: 'Companies', page: '/companies', title: 'Companies API 500', steps: '1) Mock 500 2) Open Companies', expected: 'Error message', actual: t.slice(-120).replace(/\s+/g, ' '), evidence: EV }, /something went wrong|failed|error/i.test(t), ok)
  })
})

test.describe('Navigation', () => {
  test('active menu item and sidebar collapse', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(WS('/test-manager'))
    const active = await page.locator('aside a[aria-current=page], nav a[aria-current=page]').allInnerTexts()
    await page.locator('aside button').first().click().catch(() => undefined)
    await page.waitForTimeout(400)
    const ev = await shot(page, 'sidebar-collapsed', false)
    verdict({ key: 'fe.nav.active', category: 'design', module: 'Layout', page: 'Sidebar', title: 'Active menu item is marked', steps: '1) Open Test Manager 2) Inspect sidebar', expected: 'Active link has aria-current="page"', actual: active.length ? `aria-current on "${active.join(',')}"` : 'Only colour shows the active item (no aria-current)', evidence: ev }, active.length > 0, ok)
  })

  test('unknown route inside workspace', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(WS('/does-not-exist'))
    await page.waitForTimeout(1500)
    const t = await page.locator('body').innerText()
    verdict({ key: 'fe.nav.404', category: 'design', module: 'Routing', page: '/w/:slug/*', title: 'Mistyped URL', steps: '1) Open /w/qa-demo/does-not-exist', expected: '404 page with link home', actual: `${page.url().split('5173')[1]} (silent redirect)`, evidence: EV }, /not found|404/i.test(t), ok)
  })

  test('theme toggle', async ({ page }) => {
    await loginAdmin(page)
    const before = await page.evaluate(() => document.documentElement.className)
    await page.locator('header button').first().click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.className)
    const ev = await shot(page, 'theme-light', false)
    verdict({ key: 'fe.nav.theme', category: 'functional', module: 'Layout', page: 'Header', title: 'Light/dark toggle', steps: '1) Click theme button', expected: 'Theme switches', actual: `${before} -> ${after}`, evidence: ev }, before !== after, ok)
  })
})
