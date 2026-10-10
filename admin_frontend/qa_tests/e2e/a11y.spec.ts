import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { flush, rec, shot, verdict, WS } from './helpers'
import { open, PAGES } from './pages'

const EV = 'admin_frontend/qa_tests/e2e/a11y.spec.ts'
const ok = (v: boolean, m: string) => expect.soft(v, m).toBe(true)
test.afterAll(() => flush('a11y'))

for (const p of PAGES) {
  test(`axe scan: ${p.name}`, async ({ page }) => {
    await open(page, p)
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    for (const v of res.violations) {
      rec({
        key: `a11y.${p.key}.${v.id}`, category: 'a11y', module: p.name, page: p.name, title: v.help, steps: `1) Open ${p.name} 2) Run axe-core (WCAG 2.1 AA)`,
        expected: 'No violations', actual: `${v.nodes.length} node(s): ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' ; ')}`.slice(0, 300),
        status: 'Fail', evidence: EV, extra: { impact: v.impact, rule: v.id, tags: v.tags.filter((t) => t.startsWith('wcag')).join(' '), helpUrl: v.helpUrl, nodes: v.nodes.length },
      })
    }
    rec({ key: `a11y.${p.key}.summary`, category: 'a11y', module: p.name, page: p.name, title: 'axe scan summary', steps: `1) Open ${p.name} 2) axe-core WCAG 2.1 AA`, expected: '0 violations', actual: `${res.violations.length} rule(s) failed, ${res.passes.length} passed`, status: res.violations.length ? 'Fail' : 'Pass', evidence: EV, extra: { violations: res.violations.map((v) => `${v.id}(${v.impact})`) } })
    expect.soft(res.violations.map((v) => v.id), `${p.name} axe violations`).toEqual([])
  })
}

test('keyboard: login form', async ({ page }) => {
  await page.goto(WS('/login'))
  await page.locator('#email').waitFor()
  await page.locator('body').click()
  const order: string[] = []
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab')
    order.push(await page.evaluate(() => { const e = document.activeElement as HTMLElement; return e?.id || e?.getAttribute('aria-label') || e?.innerText?.slice(0, 20) || e?.tagName }))
  }
  const toggleReachable = order.some((x) => /show password|hide password/i.test(x))
  verdict({ key: 'kb.login.order', category: 'a11y', module: 'Login', page: 'Workspace login', title: 'Tab order on login', steps: '1) Open login 2) Press Tab 6 times', expected: 'Email -> Forgot link -> Password -> Show password -> Sign in', actual: order.join(' -> '), evidence: EV, extra: { wcag: '2.4.3 Focus Order', who: 'Keyboard users' } }, order.indexOf('email') < order.indexOf('password'), ok)
  verdict({ key: 'kb.login.toggle', category: 'a11y', module: 'Login', page: 'Workspace login', title: 'Show password button reachable by keyboard', steps: '1) Tab through login form', expected: 'Show/Hide password button receives focus', actual: toggleReachable ? 'Reachable' : 'Skipped (tabIndex=-1)', evidence: EV, extra: { wcag: '2.1.1 Keyboard', who: 'Keyboard and switch users' } }, toggleReachable, ok)
  await page.locator('#email').focus()
  const outline = await page.evaluate(() => { const s = getComputedStyle(document.activeElement as Element); return `${s.outlineStyle} ${s.outlineWidth} ${s.boxShadow}` })
  verdict({ key: 'kb.login.focus-visible', category: 'a11y', module: 'Login', page: 'Workspace login', title: 'Visible focus', steps: '1) Focus Email field', expected: 'Visible focus ring', actual: outline, evidence: EV, extra: { wcag: '2.4.7 Focus Visible', who: 'Keyboard users' } }, !/none 0px none/.test(outline), ok)
  await page.locator('#email').fill('admin@qa-demo.test')
  await page.locator('#password').fill('DemoAdmin@123')
  await page.keyboard.press('Enter')
  await page.waitForURL(/dashboard/, { timeout: 10000 }).catch(() => undefined)
  verdict({ key: 'kb.login.enter', category: 'a11y', module: 'Login', page: 'Workspace login', title: 'Enter submits', steps: '1) Fill form 2) Press Enter', expected: 'Logged in', actual: page.url().split('5173')[1], evidence: EV, extra: { wcag: '2.1.1 Keyboard', who: 'Keyboard users' } }, /dashboard/.test(page.url()), ok)
})

test('keyboard: sidebar and row actions', async ({ page }) => {
  const { loginAdmin } = await import('./helpers')
  await loginAdmin(page)
  await page.goto(WS('/test-manager'))
  await page.locator('tbody tr').first().waitFor({ timeout: 60000 })
  const actionBtn = page.locator('tbody tr').first().locator('button').last()
  const name = (await actionBtn.getAttribute('aria-label')) ?? (await actionBtn.innerText())
  await actionBtn.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  const menu = await page.getByRole('menu').count()
  const ev = await shot(page, 'kb-row-menu', false)
  verdict({ key: 'kb.row-actions', category: 'a11y', module: 'Test Manager', page: 'Test Manager list', title: 'Row action menu by keyboard, with a name', steps: '1) Focus row action button 2) Enter', expected: 'Menu opens; button has an accessible name', actual: `menu opened=${menu > 0}; button name="${name || '(none)'}"`, evidence: ev, extra: { wcag: '4.1.2 Name, Role, Value', who: 'Screen reader users' } }, menu > 0 && Boolean(name?.trim()), ok)
})

test('screen reader: form errors are linked to fields', async ({ page }) => {
  const { loginAdmin } = await import('./helpers')
  await loginAdmin(page)
  await page.goto(WS('/test-manager/wizard/step-1'))
  await page.locator('#test-name').waitFor()
  await page.getByRole('button', { name: /next/i }).click()
  await page.waitForTimeout(500)
  const info = await page.evaluate(() => { const e = document.getElementById('test-name')!; return `aria-invalid=${e.getAttribute('aria-invalid')} aria-describedby=${e.getAttribute('aria-describedby')}` })
  verdict({ key: 'sr.wizard.errors', category: 'a11y', module: 'Test Wizard', page: 'Test wizard step 1', title: 'Error text announced and linked', steps: '1) Click Next on empty form 2) Inspect Test Name input', expected: 'aria-invalid=true and aria-describedby points to the error', actual: info, evidence: EV, extra: { wcag: '3.3.1 Error Identification', who: 'Screen reader users' } }, /aria-invalid=true aria-describedby=\S+/.test(info) && !/describedby=null/.test(info), ok)
})
