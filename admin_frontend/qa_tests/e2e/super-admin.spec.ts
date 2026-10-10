import { expect, test } from '@playwright/test'
import { apiJson, flush, loginSuper, shot, superToken, toastText, verdict, watch } from './helpers'

const EV = 'admin_frontend/qa_tests/e2e/super-admin.spec.ts'
const ok = (v: boolean, m: string) => expect.soft(v, m).toBe(true)
test.afterAll(() => flush('super-admin'))

test.describe('Workspaces page', () => {
  test('workspaces list loads', async ({ page }) => {
    const w = watch(page)
    await loginSuper(page)
    await page.waitForTimeout(2500)
    const cards = await page.locator('main [class*=card], main .rounded-xl').count()
    const call = w.api.find((a) => a.url.startsWith('/api/v1/workspaces'))
    const text = await page.locator('main').innerText()
    const ev = await shot(page, 'workspaces-empty')
    verdict({ key: 'fe.workspaces.load', category: 'api', module: 'Workspaces', page: '/workspaces', title: 'Workspaces list', steps: '1) Log in as super admin 2) Land on /workspaces', expected: 'List of workspaces, or an error message if loading fails', actual: `GET /workspaces -> ${call?.status}; cards=${cards}; error text shown=${/error|failed|unable/i.test(text)}`, evidence: ev }, call?.status === 200, ok)
  })
})

test.describe('Companies page', () => {
  test('companies list shows all companies', async ({ page }) => {
    const total = (await apiJson('GET', '/super-admin/companies?limit=1', undefined, await superToken())).body.data.metadata.total
    await loginSuper(page)
    await page.goto('/companies')
    await page.locator('tbody tr').first().waitFor()
    const pager = await page.locator('main').innerText()
    const shown = /of (\d+)/.exec(pager)?.[1]
    const ev = await shot(page, 'companies-list')
    verdict({ key: 'fe.companies.all-rows', category: 'functional', module: 'Companies', page: '/companies', title: 'List shows every company', steps: '1) Log in as super admin 2) Open Companies 3) Read pager total', data: `${total} companies in DB`, expected: `Pager total = ${total}`, actual: `Pager shows "of ${shown}" (UI fetches page 1 only, limit 20)`, evidence: ev }, Number(shown) === total, ok)
  })

  test('HTML in company name is shown as text', async ({ page }) => {
    await loginSuper(page)
    await page.goto('/companies')
    await page.locator('tbody tr').first().waitFor()
    const injected = await page.locator('main img[src="x"]').count()
    verdict({ key: 'fe.companies.xss', category: 'security', module: 'Companies', page: '/companies', title: 'Company name with <img onerror>', steps: '1) Company with HTML name exists (from API tests) 2) Open Companies', expected: 'Name rendered as text, no <img> element', actual: injected ? 'img element injected' : 'Rendered as text', evidence: EV }, injected === 0, ok)
  })

  test('create company form validation', async ({ page }) => {
    await loginSuper(page)
    await page.goto('/companies')
    await page.getByRole('button', { name: /create company/i }).click()
    await page.getByRole('dialog').getByRole('button', { name: /create company/i }).click()
    await page.waitForTimeout(600)
    const errs = await page.locator('[role=dialog] .text-destructive').allInnerTexts()
    const ev = await shot(page, 'company-create-empty', false)
    verdict({ key: 'fe.companies.create.empty', category: 'validation', module: 'Companies', page: '/companies (Create dialog)', title: 'Submit empty create form', steps: '1) Open Create Company 2) Click Create Company', expected: 'Every required field shows its own message', actual: `${errs.length} messages: ${errs.slice(0, 4).join(' | ')}`, evidence: ev }, errs.length >= 8, ok)
  })

  test('create company end to end', async ({ page }) => {
    const w = watch(page)
    await loginSuper(page)
    await page.goto('/companies')
    await page.getByRole('button', { name: /create company/i }).click()
    const s = `ui${Date.now().toString(36)}`
    const d = page.getByRole('dialog')
    await d.locator('#company-name').fill(`UI Company ${s}`)
    await d.locator('#company-email').fill(`owner.${s}@qa.test`)
    await d.locator('#company-website').fill('https://ui.example')
    await d.locator('#company-workspace-url').fill(s)
    await d.locator('#company-address').fill('1 UI Street')
    await d.locator('#company-pin-code').fill('400001')
    await d.locator('#company-city').fill('Mumbai')
    await d.locator('#company-state').fill('MH')
    await d.locator('#company-country').fill('India')
    await d.locator('#company-first-name').fill('Ui')
    await d.locator('#company-last-name').fill('Owner')
    await d.locator('#company-phone').fill('9876543210')
    await d.locator('#company-gst').fill(`27UIQAZ${String(Date.now() % 9000 + 1000)}F1Z5`)
    await d.getByRole('button', { name: /create company/i }).click()
    const toast = await toastText(page)
    const post = w.api.find((a) => a.method === 'POST' && a.url.includes('/super-admin/companies'))
    const ev = await shot(page, 'company-create-result', false)
    verdict({ key: 'fe.companies.create.ok', category: 'functional', module: 'Companies', page: '/companies (Create dialog)', title: 'Create company', steps: '1) Open Create Company 2) Fill all required fields 3) Create', data: `workspace ${s}`, expected: 'Success toast and row in table', actual: `POST ${post?.status}; toast "${toast}"`, evidence: ev }, post?.status === 201, ok)
    const list = await apiJson('GET', `/super-admin/companies?name=${encodeURIComponent(`UI Company ${s}`)}`, undefined, await superToken())
    const wsUrl = list.body.data.items[0]?.workspaceUrl
    await page.goto(`/w/${s}/login`)
    await page.waitForTimeout(2500)
    const reachable = !(await page.locator('body').innerText()).includes('Workspace not found')
    const ev2 = await shot(page, 'company-created-workspace-unreachable')
    verdict({ key: 'fe.companies.create.reachable', category: 'functional', module: 'Companies', page: '/w/:slug/login', title: 'New company workspace opens', steps: '1) Create company with workspace "slug" (as placeholder "acme" suggests) 2) Open /w/slug/login', expected: 'Login page of the new company', actual: reachable ? 'Login page shown' : 'Workspace not found', evidence: ev2 }, reachable, ok)
    verdict({ key: 'fe.companies.create.workspace-url', category: 'functional', module: 'Companies', page: '/companies (Create dialog)', title: 'Workspace URL saved in the format the login page looks up', steps: '1) Create company with workspace "slug" 2) Read workspaceUrl from API', expected: `http://localhost:5173/w/${s}`, actual: String(wsUrl), evidence: EV }, wsUrl === `http://localhost:5173/w/${s}`, ok)
  })

  test('status toggle keeps address line 2', async ({ page }) => {
    const token = await superToken()
    const list = await apiJson('GET', '/super-admin/companies?limit=1', undefined, token)
    const target = list.body.data.items[0]
    await apiJson('PUT', `/super-admin/companies/${target.id}`, { addressLine2: 'Tower B, Floor 7' }, token)
    await loginSuper(page)
    await page.goto('/companies')
    const row = page.locator('tbody tr').first()
    await row.waitFor()
    await row.locator('button').last().click()
    const toggle = page.getByRole('menuitem', { name: /disable|enable|deactivate|activate/i }).first()
    await toggle.click()
    await toastText(page)
    const after = await apiJson('GET', `/super-admin/companies/${target.id}`, undefined, token)
    await apiJson('PUT', `/super-admin/companies/${target.id}`, { status: 'active' }, token)
    verdict({ key: 'fe.companies.toggle-wipes', category: 'functional', module: 'Companies', page: '/companies', title: 'Enable/disable from row menu', steps: '1) Company has address line 2 2) Row menu > Disable 3) Read company from API', expected: 'Only status changes; address line 2 kept', actual: `addressLine2 after toggle = "${after.body.data.addressLine2 ?? ''}"`, evidence: EV }, after.body.data.addressLine2 === 'Tower B, Floor 7', ok)
  })

  test('delete asks for confirmation', async ({ page }) => {
    await loginSuper(page)
    await page.goto('/companies')
    const row = page.locator('tbody tr').first()
    await row.waitFor()
    await row.locator('button').last().click()
    await page.getByRole('menuitem', { name: /delete/i }).click()
    const dlg = page.getByRole('alertdialog').or(page.getByRole('dialog'))
    const visible = await dlg.first().isVisible()
    const ev = await shot(page, 'company-delete-confirm', false)
    await page.getByRole('button', { name: /cancel/i }).click()
    verdict({ key: 'fe.companies.delete-confirm', category: 'functional', module: 'Companies', page: '/companies', title: 'Delete confirmation', steps: '1) Row menu > Delete', expected: 'Confirm dialog with company name', actual: visible ? 'Dialog shown' : 'No dialog', evidence: ev }, visible, ok)
  })
})
