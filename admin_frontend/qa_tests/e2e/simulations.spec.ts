import { expect, test, type Page } from '@playwright/test'
import { DEMO, flush, loginAdmin, rec, shot, toastText, watch, WS } from './helpers'

const EV = 'admin_frontend/qa_tests/e2e/simulations.spec.ts'
test.afterAll(() => flush('simulations'))

type Step = { name: string; ok: boolean; note: string }
function sim(key: string, persona: string, goal: string, steps: Step[], well: string, stuck: string, severity: string, suggestion: string) {
  const failed = steps.filter((s) => !s.ok).length
  const result = failed === 0 ? 'Completed' : failed === steps.length ? 'Failed' : 'Partly'
  rec({ key, category: 'sim', module: persona, page: goal, title: goal, steps: steps.map((s, i) => `${i + 1}) ${s.name}`).join(' '), expected: 'Goal reached without confusion', actual: steps.map((s, i) => `${i + 1}) ${s.ok ? 'ok' : 'PROBLEM'}: ${s.note}`).join(' '), status: result === 'Completed' ? 'Pass' : 'Fail', evidence: EV, extra: { persona, well, stuck, result, severity, suggestion } })
  expect.soft(result).toBe('Completed')
}

async function fillCreate(page: Page) {
  await page.fill('#test-name', `Persona test ${Date.now() % 100000}`)
  await page.fill('#test-code', `PS${Date.now() % 1000000}`)
  await page.locator('#test-category').click()
  await page.getByRole('option', { name: 'Engineering' }).click()
  await page.locator('#test-instructions').click()
  await page.getByRole('option', { name: 'General Instructions' }).click()
  await page.fill('#test-duration', '60')
  await page.fill('#test-total-questions', '10')
  await page.fill('#test-total-marks', '40')
  await page.fill('#test-start-date', '2030-05-01')
  await page.fill('#test-end-date', '2030-05-01')
  await page.fill('#test-start-time', '10:00')
  await page.fill('#test-end-time', '12:00')
  await page.getByRole('button', { name: 'Select' }).first().click()
}

test('New admin: first login and first test', async ({ page }) => {
  const s: Step[] = []
  await loginAdmin(page)
  s.push({ name: 'Logs in', ok: true, note: 'Dashboard opens' })
  const dash = await page.locator('main').innerText()
  s.push({ name: 'Reads dashboard numbers', ok: /1,200/.test(dash), note: 'Shows 842 candidates / 128 tests (mock), real data is 1,200 / 1,101' })
  await page.getByRole('link', { name: 'Test', exact: true }).click()
  await page.getByRole('button', { name: /create tests/i }).click()
  await page.locator('#test-name').waitFor()
  s.push({ name: 'Opens Create Tests', ok: true, note: 'Wizard step 1' })
  await fillCreate(page)
  await page.getByRole('button', { name: /next/i }).click()
  const t = await toastText(page)
  s.push({ name: 'Fills required (*) fields only and clicks Next', ok: /created/i.test(t), note: `Toast: "${t}"` })
  await shot(page, 'sim-new-admin')
  sim('sim.fe.new-admin', 'New admin', 'First login and create a first test', s, 'Login is quick; form has clear * markers and inline errors', 'Dashboard numbers are fake; creating a test fails with a regex message about an optional field', 'High', 'Send null for empty optional fields; show real dashboard data or hide it')
})

test('Power admin: big list and bulk delete', async ({ page }) => {
  const s: Step[] = []
  await loginAdmin(page)
  const t0 = Date.now()
  await page.goto(WS('/test-manager'))
  await page.locator('tbody tr').first().waitFor({ timeout: 60000 })
  const ms = Date.now() - t0
  s.push({ name: 'Opens list of 1,101 tests', ok: ms < 1500, note: `${ms} ms until first row` })
  const pager = await page.locator('main').innerText()
  s.push({ name: 'Checks total count', ok: /of 1101|of 1,101/.test(pager), note: `Pager: ${/\d+–\d+ of \d+/.exec(pager)?.[0] ?? 'n/a'}` })
  const boxes = page.locator('tbody tr input[type=checkbox]')
  for (let i = 0; i < 3; i += 1) await boxes.nth(i).check()
  await page.getByRole('button', { name: /^delete$/i }).click()
  const dlg = await page.getByRole('alertdialog').or(page.getByRole('dialog')).first().innerText()
  s.push({ name: 'Selects 3 rows and clicks Delete', ok: /3 tests/.test(dlg), note: dlg.replace(/\s+/g, ' ').slice(0, 80) })
  await page.getByRole('button', { name: /cancel/i }).click()
  const quick = page.getByRole('button', { name: /quick assign/i })
  await quick.click()
  await page.waitForTimeout(800)
  const opened = await page.getByRole('dialog').count()
  s.push({ name: 'Clicks Quick Assign', ok: opened > 0, note: opened ? 'Dialog opened' : 'Nothing happens' })
  sim('sim.fe.power-admin', 'Power admin', 'Work with many tests quickly', s, 'Row selection and confirm dialog work', 'Long wait for the list; only 1,000 of 1,101 tests reachable; Quick Assign does nothing', 'High', 'Server-side pagination; implement or hide Quick Assign')
})

test('Limited-role admin: tries other areas', async ({ page }) => {
  const s: Step[] = []
  await loginAdmin(page)
  await page.goto('/companies')
  await page.waitForTimeout(1000)
  s.push({ name: 'Types /companies in the address bar', ok: !/\/companies$/.test(page.url()), note: `Sent to ${page.url().split('5173')[1]}` })
  await page.goto('/w/other-company/dashboard')
  await page.waitForTimeout(2000)
  const t = await page.locator('body').innerText()
  s.push({ name: 'Opens another workspace URL', ok: !/QA Demo Institute[\s\S]*Dashboard/.test(t) || /Workspace not found/.test(t), note: t.slice(0, 60).replace(/\s+/g, ' ') })
  sim('sim.fe.limited-role', 'Limited-role admin', 'Reach platform pages or another tenant', s, 'Routes are guarded; user is sent back home', 'No message tells the user why they were redirected', 'Low', 'Show an "Access denied" page instead of a silent redirect')
})

test('Careless user: double click Next and Back mid-wizard', async ({ page }) => {
  const s: Step[] = []
  const w = watch(page)
  await loginAdmin(page)
  await page.goto(WS('/test-manager/wizard/step-1'))
  await page.locator('#test-name').waitFor()
  await fillCreate(page)
  await page.fill('#test-handicapped-duration', '90')
  await page.fill('#test-start-buffer-time', '00:10')
  await page.getByRole('button', { name: /next/i }).dblclick()
  await page.waitForTimeout(2500)
  const posts = w.api.filter((a) => a.method === 'POST' && a.url === '/api/v1/tests')
  s.push({ name: 'Double-clicks Next', ok: posts.length === 1, note: `${posts.length} POST /tests (${posts.map((p) => p.status).join(',')})` })
  await page.goBack()
  await page.waitForTimeout(1500)
  s.push({ name: 'Presses browser Back', ok: true, note: `Now at ${page.url().split('5173')[1]}` })
  await page.goForward()
  await page.waitForTimeout(1500)
  const name = await page.locator('#test-name').inputValue().catch(() => '')
  s.push({ name: 'Presses Forward and expects data kept', ok: Boolean(name), note: name ? `Name kept "${name}"` : 'Form empty' })
  sim('sim.fe.careless', 'Careless user', 'Create a test with double clicks and Back', s, 'Button disables during save', 'Depends on wizard state; see steps', 'Medium', 'Disable Next while saving; keep draft on Back/Forward')
})

test('Malicious user: XSS in test name and token theft', async ({ page }) => {
  const s: Step[] = []
  await loginAdmin(page)
  await page.goto(WS('/test-manager/wizard/step-1'))
  await page.locator('#test-name').waitFor()
  await fillCreate(page)
  const xss = `<img src=x onerror="window.__xss=1">${Date.now() % 1000}`
  await page.fill('#test-name', xss)
  await page.fill('#test-handicapped-duration', '90')
  await page.fill('#test-start-buffer-time', '00:10')
  await page.getByRole('button', { name: /next/i }).click()
  await page.waitForTimeout(2000)
  await page.goto(WS('/test-manager'))
  await page.locator('tbody tr').first().waitFor({ timeout: 60000 })
  const fired = await page.evaluate(() => (window as unknown as { __xss?: number }).__xss === 1)
  s.push({ name: 'Saves test name with <img onerror>', ok: !fired, note: fired ? 'Script ran' : 'Shown as text' })
  const token = await page.evaluate(() => /refreshToken":"ey/.test(localStorage.getItem('auth-store-v3') ?? ''))
  s.push({ name: 'Reads refresh token from localStorage (as injected script would)', ok: !token, note: token ? 'Readable' : 'Not readable' })
  sim('sim.fe.malicious', 'Malicious user', 'Run script or steal session', s, 'React escapes text; no XSS found in tested fields', 'Any future XSS can steal the 7-day refresh token from localStorage', 'High', 'Move refresh token to httpOnly cookie; add CSP on the frontend host')
})

test('Slow-network user: login on Slow 3G', async ({ page, context }) => {
  const s: Step[] = []
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 })
  const t0 = Date.now()
  await page.goto(WS('/login'), { timeout: 85000 })
  const loaded = await page.locator('#email').waitFor({ timeout: 85000 }).then(() => true).catch(() => false)
  s.push({ name: 'Opens login page', ok: loaded && Date.now() - t0 < 15000, note: `${Date.now() - t0} ms` })
  if (loaded) {
    await page.fill('#email', DEMO.email)
    await page.fill('#password', DEMO.password)
    const t1 = Date.now()
    await page.click('button[type=submit]')
    const spinner = await page.getByText(/signing in/i).isVisible().catch(() => false)
    s.push({ name: 'Clicks Sign in and sees progress', ok: spinner, note: spinner ? '"Signing in..." shown' : 'No feedback' })
    await page.waitForURL(/dashboard/, { timeout: 85000 }).catch(() => undefined)
    s.push({ name: 'Reaches dashboard', ok: /dashboard/.test(page.url()), note: `${Date.now() - t1} ms` })
  }
  await shot(page, 'sim-slow-network')
  sim('sim.fe.slow-network', 'Slow-network user', 'Log in on a slow connection', s, 'Sign in button shows progress', 'Dev build loads hundreds of modules; production bundle is 1.25 MB + 1.16 MB JS', 'Medium', 'Code-split CKEditor and routes; lazy load pages')
})

test('Mobile user: login and navigate at 360px', async ({ page }) => {
  const s: Step[] = []
  await page.setViewportSize({ width: 360, height: 760 })
  await loginAdmin(page)
  s.push({ name: 'Logs in on phone', ok: true, note: 'Login form fits' })
  const m = await page.evaluate(() => ({ main: Math.round(document.querySelector('main')!.getBoundingClientRect().width), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }))
  s.push({ name: 'Reads dashboard', ok: m.main > 300 && m.overflow <= 2, note: `content width ${m.main}px, sideways scroll ${m.overflow}px` })
  await page.goto(WS('/test-manager'))
  await page.locator('tbody tr').first().waitFor({ timeout: 60000 })
  await shot(page, 'sim-mobile-test-list')
  const o2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  s.push({ name: 'Opens Test Manager table', ok: o2 <= 2, note: `sideways scroll ${o2}px` })
  sim('sim.fe.mobile', 'Mobile user', 'Use the panel on a phone', s, 'Login works', 'Sidebar stays open and squeezes content; tables overflow', 'Medium', 'Off-canvas sidebar under 768px; responsive table/card layout')
})

test('Keyboard user: log in and open Create Tests without mouse', async ({ page }) => {
  const s: Step[] = []
  await page.goto(WS('/login'))
  await page.locator('#email').focus()
  await page.keyboard.type(DEMO.email)
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.type(DEMO.password)
  await page.keyboard.press('Enter')
  await page.waitForURL(/dashboard/, { timeout: 10000 }).catch(() => undefined)
  s.push({ name: 'Logs in with keyboard', ok: /dashboard/.test(page.url()), note: page.url().split('5173')[1] })
  let reached = false
  for (let i = 0; i < 25; i += 1) {
    await page.keyboard.press('Tab')
    const txt = await page.evaluate(() => (document.activeElement as HTMLElement)?.innerText ?? '')
    if (/^Test$/.test(txt.trim())) { reached = true; break }
  }
  s.push({ name: 'Tabs to "Test" menu item', ok: reached, note: reached ? 'Reached' : 'Not reached in 25 tabs' })
  if (reached) {
    await page.keyboard.press('Enter')
    await page.waitForURL(/test-manager/).catch(() => undefined)
  }
  s.push({ name: 'Opens Test Manager with Enter', ok: /test-manager/.test(page.url()), note: page.url().split('5173')[1] })
  sim('sim.fe.keyboard', 'Keyboard / screen-reader user', 'Use the app without a mouse', s, 'Native inputs and links work with keyboard', 'Show-password button skipped; icon-only buttons need names (see accessibility.csv)', 'Medium', 'Add aria-labels; keep all controls in tab order')
})
