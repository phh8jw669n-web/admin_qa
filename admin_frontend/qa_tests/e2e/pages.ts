import type { Page } from '@playwright/test'
import { apiJson, demoAdminToken, loginAdmin, loginSuper, WS } from './helpers'

export type PageDef = { key: string; name: string; url: string | (() => Promise<string>); role: 'none' | 'admin' | 'super'; ready?: string }

export const PAGES: PageDef[] = [
  { key: 'login', name: 'Workspace login', url: WS('/login'), role: 'none', ready: '#email' },
  { key: 'login-platform', name: 'Platform login', url: '/login', role: 'none', ready: '#email' },
  { key: 'forgot', name: 'Forgot password', url: WS('/forgot-password'), role: 'none', ready: 'input[type=email]' },
  { key: 'workspace-missing', name: 'Workspace not found', url: '/w/nope-nope/login', role: 'none' },
  { key: 'dashboard', name: 'Dashboard', url: WS('/dashboard'), role: 'admin', ready: 'main h2' },
  { key: 'test-list', name: 'Test Manager list', url: WS('/test-manager'), role: 'admin', ready: 'tbody tr' },
  { key: 'wizard-1', name: 'Test wizard step 1', url: WS('/test-manager/wizard/step-1'), role: 'admin', ready: '#test-name' },
  {
    key: 'wizard-3', name: 'Test wizard step 3 (questions)', role: 'admin',
    url: async () => {
      const t = await demoAdminToken()
      const demo = (await apiJson('GET', '/tests?testCode=DEMO1', undefined, t)).body.data.items[0]
      return WS(`/test-manager/wizard/step-3?testId=${demo.id}`)
    },
  },
  { key: 'question-bank', name: 'Question Bank', url: WS('/question-bank'), role: 'admin', ready: 'main h2' },
  { key: 'category', name: 'Category Management', url: WS('/category-management'), role: 'admin', ready: 'main h2' },
  { key: 'workspaces', name: 'Workspaces', url: '/workspaces', role: 'super', ready: 'main h2' },
  { key: 'companies', name: 'Companies', url: '/companies', role: 'super', ready: 'tbody tr' },
]

export async function open(page: Page, p: PageDef) {
  if (p.role === 'admin') await loginAdmin(page)
  if (p.role === 'super') await loginSuper(page)
  const url = typeof p.url === 'string' ? p.url : await p.url()
  await page.goto(url)
  if (p.ready) await page.locator(p.ready).first().waitFor({ timeout: 60000 }).catch(() => undefined)
  await page.waitForTimeout(1200)
}
