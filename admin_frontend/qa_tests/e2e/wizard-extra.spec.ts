import { expect, test } from '@playwright/test'
import { loginAdmin, shot, verdict, watch, WS } from './helpers'

const EV = 'admin_frontend/qa_tests/e2e/wizard-extra.spec.ts'
const ok = (v: boolean, m: string) => expect.soft(v, m).toBe(true)

test.describe('Test wizard extra checks', () => {
  test('template previews when file storage is down', async ({ page }) => {
    // QA env runs with AWS_ENABLED=false, so /files/download-url really returns 503
    const w = watch(page)
    await loginAdmin(page)
    await page.goto(WS('/test-manager/wizard/step-1'))
    await page.locator('#test-name').waitFor({ timeout: 30000 })
    await page.waitForTimeout(10000)
    const spinners = await page.locator('.animate-spin').count()
    const cards = await page.getByRole('button', { name: 'Select' }).count()
    const dl = w.api.filter((a) => a.url.startsWith('/api/v1/files/download-url'))
    const ev = await shot(page, 'wizard-template-previews-s3-down')
    verdict({ key: 'fe.wizard.template-preview-s3-down', category: 'api', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/step-1 (template picker)', title: 'Template previews when the file API fails', steps: '1) Open Create test with S3 disabled 2) Wait 10 s', expected: 'Each template card shows a placeholder, no endless spinner', actual: `${cards} cards, ${spinners} spinners after 10 s; download-url calls: ${dl.length} (${[...new Set(dl.map((a) => a.status))].join(',') || 'none'})`, evidence: ev }, spinners === 0, ok)
  })

  test('category dropdown with more than 20 categories', async ({ page }) => {
    // Simulate a workspace with 25 categories (mocked list API; real response shape copied from GET /categories)
    const all = Array.from({ length: 25 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, name: `Mock Category ${String(i + 1).padStart(2, '0')}`, ranking: i + 1, languageId: null, isActive: true }))
    await page.route('**/api/v1/categories?**', async (route) => {
      const u = new URL(route.request().url())
      const p = Number(u.searchParams.get('page') ?? 1)
      const l = Number(u.searchParams.get('limit') ?? 20)
      const items = all.slice((p - 1) * l, p * l)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'Categories fetched successfully', data: { items, metadata: { total: all.length, page: p, limit: l, totalPages: Math.ceil(all.length / l) } } }) })
    })
    const w = watch(page)
    await loginAdmin(page)
    await page.goto(WS('/test-manager/wizard/step-1'))
    await page.locator('#test-category').waitFor({ timeout: 30000 })
    await page.waitForTimeout(1500)
    await page.locator('#test-category').click()
    await page.getByRole('option').first().waitFor({ timeout: 10000 }).catch(() => undefined)
    const options = await page.getByRole('option').allInnerTexts()
    const calls = w.api.filter((a) => a.url.startsWith('/api/v1/categories?')).map((a) => a.url.split('?')[1])
    const ev = await shot(page, 'wizard-category-25')
    await page.keyboard.press('Escape')
    verdict({ key: 'fe.wizard.category-dropdown-25', category: 'edge', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/step-1', title: 'Category dropdown lists all 25 categories', steps: '1) Mock GET /categories with 25 items 2) Open Create test 3) Open Category', expected: '25 options', actual: `${options.length} options; requests: ${calls.join(' | ')}`, evidence: ev }, options.filter((o) => o.startsWith('Mock Category')).length === 25, ok)
  })
})
