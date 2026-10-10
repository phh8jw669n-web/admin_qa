import { expect, test } from '@playwright/test'
import { DEMO, SUPER, WS, flush, loginAdmin, shot, toastText, verdict, watch } from './helpers'

const EV = 'admin_frontend/qa_tests/e2e/auth.spec.ts'
const ok = (v: boolean, m: string) => expect.soft(v, m).toBe(true)
test.afterAll(() => flush('auth'))

test.describe('Login', () => {
  test('workspace login page shows company branding', async ({ page }) => {
    await page.goto(WS('/login'))
    await page.getByText('Welcome to').waitFor({ timeout: 10000 }).catch(() => undefined)
    const text = await page.locator('body').innerText()
    const ev = await shot(page, 'login-workspace')
    verdict({ key: 'fe.login.render', category: 'functional', module: 'Login', page: '/w/:slug/login', title: 'Workspace login page loads', steps: '1) Open /w/qa-demo/login', expected: 'Sign in form with workspace name', actual: text.includes('QA Demo Institute') ? 'Workspace name shown' : 'Workspace name missing', evidence: ev }, text.includes('QA Demo Institute') && text.includes('Sign in'), ok)
  })

  test('valid admin login goes to dashboard', async ({ page }) => {
    await page.goto(WS('/login'))
    await page.fill('#email', DEMO.email)
    await page.fill('#password', DEMO.password)
    await page.click('button[type=submit]')
    await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => undefined)
    verdict({ key: 'fe.login.ok', category: 'functional', module: 'Login', page: '/w/:slug/login', title: 'Admin logs in', steps: '1) Open workspace login 2) Enter valid email and password 3) Click Sign in', data: DEMO.email, expected: 'Redirect to /w/qa-demo/dashboard', actual: page.url(), evidence: EV }, page.url().endsWith('/w/qa-demo/dashboard'), ok)
  })

  test('wrong password shows clear error', async ({ page }) => {
    await page.goto(WS('/login'))
    await page.fill('#email', `nobody.${Date.now()}@qa.test`)
    await page.fill('#password', 'Wrong@12345')
    await page.click('button[type=submit]')
    const err = page.locator('#login-error')
    await err.waitFor({ timeout: 10000 }).catch(() => undefined)
    const msg = (await err.innerText().catch(() => '')).trim()
    const ev = await shot(page, 'login-wrong-password')
    verdict({ key: 'fe.login.wrong', category: 'functional', module: 'Login', page: '/w/:slug/login', title: 'Wrong password message', steps: '1) Enter unknown email + wrong password 2) Sign in', expected: 'Inline error "Invalid email or password" announced (role=alert)', actual: msg || '(no message)', evidence: ev }, msg === 'Invalid email or password', ok)
  })

  test('empty form uses browser validation only', async ({ page }) => {
    await page.goto(WS('/login'))
    await page.click('button[type=submit]')
    const valid = await page.locator('#email').evaluate((e: HTMLInputElement) => e.validationMessage)
    verdict({ key: 'fe.login.empty', category: 'validation', module: 'Login', page: '/w/:slug/login', title: 'Submit empty login form', steps: '1) Click Sign in with empty fields', expected: 'Required message on Email', actual: valid ? `Native message: ${valid}` : 'No message', evidence: EV }, Boolean(valid), ok)
  })

  test('double click on Sign in sends one request', async ({ page }) => {
    const w = watch(page)
    await page.goto(WS('/login'))
    await page.fill('#email', DEMO.email)
    await page.fill('#password', DEMO.password)
    await page.locator('button[type=submit]').dblclick()
    await page.waitForURL(/dashboard/).catch(() => undefined)
    const logins = w.api.filter((a) => a.url.includes('/auth/login')).length
    verdict({ key: 'fe.login.double-click', category: 'edge', module: 'Login', page: '/w/:slug/login', title: 'Double click Sign in', steps: '1) Fill form 2) Double-click Sign in', expected: '1 login request (button disabled while submitting)', actual: `${logins} login request(s)`, evidence: EV }, logins === 1, ok)
  })

  test('company admin on platform login is told to use workspace URL', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', DEMO.email)
    await page.fill('#password', DEMO.password)
    await page.click('button[type=submit]')
    await page.locator('#login-error').waitFor({ timeout: 10000 }).catch(() => undefined)
    const msg = (await page.locator('#login-error').innerText().catch(() => '')).trim()
    verdict({ key: 'fe.login.admin-on-platform', category: 'edge', module: 'Login', page: '/login', title: 'Tenant admin uses platform login', steps: '1) Open /login 2) Enter company admin credentials', expected: 'Message explains to use the workspace URL', actual: msg || '(no message)', evidence: EV }, /workspace/i.test(msg), ok)
  })

  test('super admin login', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', SUPER.email)
    await page.fill('#password', SUPER.password)
    await page.click('button[type=submit]')
    await page.waitForURL(/workspaces/).catch(() => undefined)
    verdict({ key: 'fe.login.super', category: 'functional', module: 'Login', page: '/login', title: 'Super admin logs in', steps: '1) Open /login 2) Valid super admin credentials', expected: 'Redirect to /workspaces', actual: page.url(), evidence: EV }, page.url().endsWith('/workspaces'), ok)
  })

  test('unknown workspace shows not found page', async ({ page }) => {
    await page.goto('/w/does-not-exist/login')
    await page.getByText('Workspace not found').waitFor({ timeout: 10000 }).catch(() => undefined)
    const ev = await shot(page, 'workspace-not-found')
    const t = await page.locator('body').innerText()
    verdict({ key: 'fe.workspace.unknown', category: 'functional', module: 'Workspace Gate', page: '/w/:slug/*', title: 'Unknown workspace slug', steps: '1) Open /w/does-not-exist/login', expected: '"Workspace not found" page', actual: t.slice(0, 120).replace(/\s+/g, ' '), evidence: ev }, t.includes('Workspace not found'), ok)
  })

  test('workspace slug with special characters', async ({ page }) => {
    await page.goto('/w/%3Cscript%3Ealert(1)%3C%2Fscript%3E/login')
    await page.waitForTimeout(2500)
    const dialog = await page.locator('script:has-text("alert(1)")').count()
    const t = await page.locator('body').innerText()
    verdict({ key: 'fe.workspace.xss-slug', category: 'security', module: 'Workspace Gate', page: '/w/:slug/*', title: 'Script tag in workspace slug', steps: '1) Open /w/<script>alert(1)</script>/login', expected: 'Not found page, slug shown as text only', actual: dialog ? 'Script injected' : `Rendered as text: ${t.slice(0, 80).replace(/\s+/g, ' ')}`, evidence: EV }, dialog === 0, ok)
  })
})

test.describe('Protected routes and session', () => {
  test('protected page without login redirects to login with redirect param', async ({ page }) => {
    await page.goto(WS('/test-manager'))
    await page.waitForURL(/login/).catch(() => undefined)
    verdict({ key: 'fe.route.protected', category: 'security', module: 'Routing', page: '/w/:slug/test-manager', title: 'Direct URL without login', steps: '1) Clear storage 2) Open /w/qa-demo/test-manager', expected: 'Redirect to /w/qa-demo/login?redirect=...', actual: page.url(), evidence: EV }, /\/w\/qa-demo\/login\?redirect=/.test(page.url()), ok)
  })

  test('redirect param back to the page after login', async ({ page }) => {
    await page.goto(WS('/test-manager'))
    await page.waitForURL(/login/)
    await page.fill('#email', DEMO.email)
    await page.fill('#password', DEMO.password)
    await page.click('button[type=submit]')
    await page.waitForURL((u) => u.pathname.endsWith('/test-manager')).catch(() => undefined)
    verdict({ key: 'fe.route.redirect-back', category: 'functional', module: 'Routing', page: '/w/:slug/login', title: 'Return to requested page after login', steps: '1) Open protected URL 2) Log in', expected: 'Lands on /w/qa-demo/test-manager', actual: page.url(), evidence: EV }, page.url().endsWith('/w/qa-demo/test-manager'), ok)
  })

  test('open redirect is blocked', async ({ page }) => {
    await page.goto(WS('/login?redirect=//evil.example/phish'))
    await page.fill('#email', DEMO.email)
    await page.fill('#password', DEMO.password)
    await page.click('button[type=submit]')
    await page.waitForTimeout(2500)
    verdict({ key: 'fe.route.open-redirect', category: 'security', module: 'Routing', page: '/w/:slug/login', title: 'Open redirect via ?redirect=//evil', steps: '1) Open login?redirect=//evil.example 2) Log in', expected: 'Stays on app (dashboard)', actual: page.url(), evidence: EV }, page.url().startsWith('http://localhost:5173/w/qa-demo/'), ok)
  })

  test('tokens are stored in localStorage', async ({ page }) => {
    await loginAdmin(page)
    const stored = await page.evaluate(() => localStorage.getItem('auth-store-v3') ?? '')
    const hasRefresh = /refreshToken":"ey/.test(stored)
    verdict({ key: 'fe.security.token-storage', category: 'security', module: 'Auth Store', page: 'All', title: 'Where tokens are stored', steps: '1) Log in 2) Read localStorage auth-store-v3', expected: 'Refresh token not readable by JavaScript (httpOnly cookie)', actual: hasRefresh ? 'Access and refresh token in localStorage' : 'Not in localStorage', evidence: EV }, !hasRefresh, ok)
  })

  test('expired access token is not refreshed (user is logged out)', async ({ page }) => {
    const w = watch(page)
    await loginAdmin(page)
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('auth-store-v3') ?? '{}')
      const [h, , s] = raw.state.accessToken.split('.')
      const p = btoa(JSON.stringify({ sub: 'x', exp: 1 })).replace(/=+$/, '')
      raw.state.accessToken = `${h}.${p}.${s}`
      localStorage.setItem('auth-store-v3', JSON.stringify(raw))
    })
    await page.goto(WS('/test-manager'))
    await page.waitForTimeout(4000)
    const refreshed = w.api.some((a) => a.url.includes('/refresh'))
    const ev = await shot(page, 'session-expired')
    verdict({ key: 'fe.session.refresh', category: 'functional', module: 'Auth Store', page: 'All', title: 'Access token expires (15 min)', steps: '1) Log in 2) Make access token invalid/expired 3) Open Test Manager', expected: 'App calls /auth/refresh and keeps the user signed in', actual: refreshed ? 'Refreshed' : `No refresh call; now at ${page.url()}`, evidence: ev }, refreshed, ok)
  })

  test('logout clears session and blocks back button', async ({ page }) => {
    await loginAdmin(page)
    await page.locator('header button').last().click()
    const item = page.getByRole('menuitem', { name: /log ?out|sign ?out/i })
    await item.click()
    await page.waitForURL(/login/).catch(() => undefined)
    const stored = await page.evaluate(() => localStorage.getItem('auth-store-v3') ?? '')
    await page.goBack()
    await page.waitForTimeout(1500)
    verdict({ key: 'fe.logout', category: 'functional', module: 'Layout', page: 'Profile menu', title: 'Logout then Back', steps: '1) Log in 2) Profile menu > Log out 3) Browser Back', expected: 'Login page; no token stored; Back does not show protected data', actual: `after Back: ${page.url()} token stored=${/accessToken":"ey/.test(stored)}`, evidence: EV }, !/accessToken":"ey/.test(stored) && !/dashboard$/.test(page.url()), ok)
  })
})

test.describe('Forgot password', () => {
  test('forgot password calls a missing API', async ({ page }) => {
    const w = watch(page)
    await page.goto(WS('/forgot-password'))
    await page.fill('input[type=email]', DEMO.email)
    await page.getByRole('button', { name: 'Send' }).click()
    await page.waitForTimeout(2500)
    const call = w.api.find((a) => a.url.includes('forgot-password'))
    const msg = (await page.locator('[role=alert], .text-destructive').allInnerTexts()).join(' ') || (await toastText(page, 1000))
    const ev = await shot(page, 'forgot-password-error')
    verdict({ key: 'fe.forgot.api', category: 'api', module: 'Forgot Password', page: '/w/:slug/forgot-password', title: 'Send OTP', steps: '1) Open forgot password 2) Enter admin email 3) Send', expected: 'OTP step shown (API exists)', actual: `${call?.status ?? 'no call'} ${msg}`.trim(), evidence: ev }, call?.status === 200 || call?.status === 201, ok)
  })
})
