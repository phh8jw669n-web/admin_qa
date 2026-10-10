import { expect, test, type Page } from '@playwright/test'
import { apiJson, demoAdminToken, flush, loginAdmin, shot, toastText, verdict, watch, WS } from './helpers'

const EV = 'admin_frontend/qa_tests/e2e/test-manager.spec.ts'
const ok = (v: boolean, m: string) => expect.soft(v, m).toBe(true)
test.afterAll(() => flush('test-manager'))

async function fillStep1(page: Page, over: Record<string, string> = {}) {
  const v = { name: `UI Test ${Date.now() % 100000}`, code: `UI${Date.now() % 1000000}`, duration: '60', handicapped: '', total: '5', marks: '20', start: '2030-03-01', end: '2030-03-01', startTime: '09:00', endTime: '11:00', buffer: '', ...over }
  await page.fill('#test-name', v.name)
  await page.fill('#test-code', v.code)
  await page.locator('#test-category').click()
  await page.getByRole('option', { name: 'Engineering' }).click()
  await page.locator('#test-instructions').click()
  await page.getByRole('option', { name: 'General Instructions' }).click()
  await page.fill('#test-duration', v.duration)
  if (v.handicapped) await page.fill('#test-handicapped-duration', v.handicapped)
  await page.fill('#test-total-questions', v.total)
  await page.fill('#test-total-marks', v.marks)
  await page.fill('#test-start-date', v.start)
  await page.fill('#test-end-date', v.end)
  await page.fill('#test-start-time', v.startTime)
  await page.fill('#test-end-time', v.endTime)
  if (v.buffer) await page.fill('#test-start-buffer-time', v.buffer)
  await page.getByRole('button', { name: 'Select' }).first().click()
  return v
}

test.describe('Test list', () => {
  test('list loads without React errors', async ({ page }) => {
    const w = watch(page)
    await loginAdmin(page)
    const t0 = Date.now()
    await page.goto(WS('/test-manager'))
    await page.locator('tbody tr').first().waitFor({ timeout: 60000 })
    await page.waitForTimeout(2000)
    const ms = Date.now() - t0
    const listCalls = w.api.filter((a) => a.url.startsWith('/api/v1/tests?')).length
    const loop = w.errors.find((e) => e.includes('Maximum update depth'))
    const ev = await shot(page, 'test-list')
    verdict({ key: 'fe.tests.render-loop', category: 'functional', module: 'Test Manager', page: '/w/:slug/test-manager', title: 'No render loop while list loads', steps: '1) Log in 2) Open Test Manager', expected: 'No console errors', actual: loop ? `Console: ${loop.slice(0, 90)}` : 'No errors', evidence: ev }, !loop, ok)
    verdict({ key: 'fe.tests.request-count', category: 'perf', module: 'Test Manager', page: '/w/:slug/test-manager', title: 'Requests needed to show the list', steps: '1) Open Test Manager with 1,101 tests', expected: '1 request per page shown (server pagination)', actual: `${listCalls} sequential GET /tests calls, ${ms} ms until settled`, evidence: EV, extra: { ms, listCalls } }, listCalls <= 2, ok)
    const pager = await page.locator('main').innerText()
    const shown = Number(/of (\d+)/.exec(pager)?.[1] ?? 0)
    const total = (await apiJson('GET', '/tests?limit=1', undefined, await demoAdminToken())).body.data.metadata.total
    verdict({ key: 'fe.tests.all-rows', category: 'functional', module: 'Test Manager', page: '/w/:slug/test-manager', title: 'All tests reachable', steps: '1) Open Test Manager 2) Read pager total', data: `${total} tests in DB`, expected: `Pager total = ${total}`, actual: `Pager total = ${shown} (MAX_PAGES 50 x 20)`, evidence: EV }, shown === total, ok)
  })

  test('status column for a new draft test', async ({ page }) => {
    const token = await demoAdminToken()
    const cats = (await apiJson('GET', '/categories?limit=1', undefined, token)).body.data.items
    const ins = (await apiJson('GET', '/instructions?limit=1', undefined, token)).body.data.items
    const tpl = (await apiJson('GET', '/super-admin/templates?limit=1', undefined, token)).body.data.items
    const name = `AAA Draft ${Date.now() % 100000}`
    await apiJson('POST', '/tests', { name, testCode: `DR${Date.now() % 100000}`, categoryId: cats[0].id, primaryInstructionId: ins[0].id, durationMinutes: 10, handicappedDurationMinutes: 10, totalQuestions: 1, totalMarks: 1, passingMarks: 0, graceMarks: 0, templateId: tpl[0].id, isDraft: true }, token)
    await loginAdmin(page)
    await page.goto(WS('/test-manager'))
    const row = page.locator('tbody tr', { hasText: name })
    await row.waitFor({ timeout: 60000 })
    const text = (await row.innerText()).replace(/\s+/g, ' ')
    verdict({ key: 'fe.tests.status-draft', category: 'functional', module: 'Test Manager', page: '/w/:slug/test-manager', title: 'Draft test shows Draft', steps: '1) Create test via API with isDraft=true (isPublished not sent) 2) Open Test Manager', expected: 'Status "Draft", Published "Unpublished"', actual: text.slice(0, 140), evidence: EV }, /Draft/.test(text) && /Unpublished/.test(text), ok)
  })

  test('filters search by name', async ({ page }) => {
    const w = watch(page)
    await loginAdmin(page)
    await page.goto(WS('/test-manager'))
    await page.locator('tbody tr').first().waitFor({ timeout: 60000 })
    await page.getByRole('button', { name: /filters/i }).click()
    await page.waitForTimeout(500)
    const ev = await shot(page, 'test-filters', false)
    const nameInput = page.getByLabel(/name/i).first()
    await nameInput.fill('Mock Test 10')
    await page.getByRole('button', { name: /apply|search/i }).first().click()
    await page.waitForTimeout(2500)
    const rows = await page.locator('tbody tr').count()
    const called = w.api.some((a) => a.url.includes('name=Mock'))
    verdict({ key: 'fe.tests.filter-name', category: 'functional', module: 'Test Manager', page: '/w/:slug/test-manager', title: 'Filter by test name', steps: '1) Filters 2) Name = "Mock Test 10" 3) Apply', expected: 'Only matching tests listed (server search)', actual: `API called with name=${called}; rows=${rows}`, evidence: ev }, called && rows > 0 && rows <= 20, ok)
  })

  test('delete asks for confirmation', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(WS('/test-manager'))
    await page.locator('tbody tr').first().waitFor({ timeout: 60000 })
    const del = page.getByRole('button', { name: /^delete$/i })
    const disabled = await del.isDisabled()
    await page.locator('tbody tr').first().locator('input[type=checkbox]').check()
    await del.click()
    const dialog = await page.getByRole('alertdialog').or(page.getByRole('dialog')).first().isVisible()
    const ev = await shot(page, 'test-delete-confirm', false)
    await page.getByRole('button', { name: /cancel/i }).click()
    verdict({ key: 'fe.tests.delete-confirm', category: 'functional', module: 'Test Manager', page: '/w/:slug/test-manager', title: 'Delete needs selection and confirmation', steps: '1) Delete disabled with no selection 2) Select row 3) Delete', expected: 'Disabled first, then confirm dialog', actual: `disabled=${disabled}, dialog=${dialog}`, evidence: ev }, disabled && dialog, ok)
  })

  test('import QTI', async ({ page }) => {
    const w = watch(page)
    await loginAdmin(page)
    await page.goto(WS('/test-manager'))
    await page.locator('tbody tr').first().waitFor({ timeout: 60000 })
    await page.getByRole('button', { name: /import tests/i }).click()
    const input = page.locator('[role=dialog] input[type=file]')
    await input.setInputFiles({ name: 'sample.xml', mimeType: 'text/xml', buffer: Buffer.from('<assessmentTest/>') })
    await page.getByRole('dialog').getByRole('button', { name: /import|upload/i }).last().click()
    const toast = await toastText(page)
    const call = w.api.find((a) => a.url.includes('import-qti'))
    const ev = await shot(page, 'qti-import', false)
    verdict({ key: 'fe.tests.import-qti', category: 'api', module: 'Test Manager', page: '/w/:slug/test-manager (Import)', title: 'Import a QTI file', steps: '1) Import Tests 2) Choose sample.xml 3) Import', expected: 'Test imported', actual: `POST /tests/import-qti -> ${call?.status ?? 'not called'}; toast "${toast}"`, evidence: ev }, call?.status === 201 || call?.status === 200, ok)
  })
})

test.describe('Test wizard', () => {
  test('step 1 empty submit shows field errors', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(WS('/test-manager/wizard/step-1'))
    await page.locator('#test-name').waitFor()
    await page.getByRole('button', { name: /next/i }).click()
    await page.waitForTimeout(600)
    const errs = (await page.locator('main .text-destructive').allInnerTexts()).filter((x) => x.trim() !== '*')
    const focused = await page.evaluate(() => document.activeElement?.id ?? '')
    const ev = await shot(page, 'wizard-step1-empty')
    verdict({ key: 'fe.wizard.step1.empty', category: 'validation', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/1', title: 'Next with empty form', steps: '1) Open Create test 2) Click Next', expected: 'Each required field shows a message and focus moves to the first error', actual: `${errs.length} messages; focus on "${focused}"`, evidence: ev }, errs.length >= 10 && focused === 'test-name', ok)
  })

  test('step 1 with optional fields empty creates the test', async ({ page }) => {
    const w = watch(page)
    await loginAdmin(page)
    await page.goto(WS('/test-manager/wizard/step-1'))
    await page.locator('#test-name').waitFor()
    await fillStep1(page)
    await page.getByRole('button', { name: /next/i }).click()
    const toast = await toastText(page)
    const post = w.api.find((a) => a.method === 'POST' && a.url === '/api/v1/tests')
    const ev = await shot(page, 'wizard-step1-optional-empty')
    verdict({ key: 'fe.wizard.step1.optional-empty', category: 'functional', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/1', title: 'Create test leaving optional fields empty', steps: '1) Fill all * fields 2) Leave "For Handicapped" and "Start Buffer Time" empty 3) Next', expected: 'Test created, go to step 2', actual: `POST /tests -> ${post?.status}; toast "${toast}"; url ${page.url().split('5173')[1]}`, evidence: ev }, post?.status === 201, ok)
    verdict({ key: 'fe.wizard.step1.error-message', category: 'design', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/1', title: 'Server error message is readable', steps: '1) Trigger a server validation error on Next', expected: 'Plain message naming the field', actual: toast || '(no toast)', evidence: ev }, !!toast && !/regular expression|\^|\$\//.test(toast), ok)
  })

  test('step 1 handicapped equal to duration', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(WS('/test-manager/wizard/step-1'))
    await page.locator('#test-name').waitFor()
    await fillStep1(page, { handicapped: '60', buffer: '00:15' })
    await page.getByRole('button', { name: /next/i }).click()
    await page.waitForTimeout(800)
    const err = (await page.locator('main .text-destructive').allInnerTexts()).filter((x) => x.trim() !== '*').join(' | ')
    verdict({ key: 'fe.wizard.step1.handicapped-equal', category: 'validation', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/1', title: 'Handicapped = duration', steps: '1) Duration 60 2) Handicapped 60 3) Next', expected: 'Accepted (backend allows >=)', actual: err || 'Accepted', evidence: EV }, !err, ok)
  })

  test('full happy path steps 1 to 3', async ({ page }) => {
    const w = watch(page)
    await loginAdmin(page)
    await page.goto(WS('/test-manager/wizard/step-1'))
    await page.locator('#test-name').waitFor()
    await fillStep1(page, { handicapped: '80', buffer: '00:15' })
    await page.getByRole('button', { name: /next/i }).click()
    await page.waitForURL(/wizard\/step-2/, { timeout: 6000 }).catch(() => undefined)
    const firstClickUrl = page.url()
    const ev1 = await shot(page, 'wizard-after-create')
    verdict({ key: 'fe.wizard.step1.advance', category: 'functional', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/step-1', title: 'Wizard moves to step 2 after "Test created"', steps: '1) Fill every field 2) Click Next once', expected: 'Step 2 (Settings) opens', actual: `After toast "Test created" URL is ${firstClickUrl.split('5173')[1]}`, evidence: ev1 }, /wizard\/step-2/.test(firstClickUrl), ok)
    if (!/wizard\/step-2/.test(page.url())) {
      await page.getByRole('button', { name: /next/i }).click()
      await page.waitForURL(/wizard\/step-2/, { timeout: 15000 }).catch(() => undefined)
    }
    const step2Url = page.url()
    const ev2a = await shot(page, 'wizard-step2')
    verdict({ key: 'fe.wizard.step1.ok', category: 'functional', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/step-1', title: 'Create test with all fields', steps: '1) Fill every field incl. handicapped 80 and buffer 00:15 2) Next (twice if needed)', expected: 'Test created, step 2 opens', actual: step2Url.split('5173')[1], evidence: ev2a }, /wizard\/step-2/.test(step2Url), ok)
    await page.getByRole('button', { name: /next/i }).last().click()
    await page.waitForURL(/wizard\/step-3/, { timeout: 15000 }).catch(() => undefined)
    const settings = w.api.find((a) => a.url.includes('/test-settings') && a.method !== 'GET')
    const ev2 = await shot(page, 'wizard-step3')
    verdict({ key: 'fe.wizard.step2.ok', category: 'functional', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/step-2', title: 'Save default settings', steps: '1) On step 2 click Next', expected: 'Settings saved, step 3 opens', actual: `settings ${settings?.method} -> ${settings?.status}; ${page.url().split('5173')[1]}`, evidence: ev2 }, /wizard\/step-3/.test(page.url()) && (settings?.status ?? 0) < 300, ok)
    const step3 = await page.locator('main').innerText()
    verdict({ key: 'fe.wizard.step3.render', category: 'functional', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/3', title: 'Questions step renders', steps: '1) Reach step 3', expected: 'Question entry form with subject/topic', actual: step3.slice(0, 120).replace(/\s+/g, ' '), evidence: ev2 }, /question/i.test(step3), ok)
  })

  test('refresh in the middle of the wizard keeps the data', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(WS('/test-manager/wizard/step-1'))
    await page.locator('#test-name').waitFor()
    await page.fill('#test-name', 'Half filled test')
    await page.fill('#test-code', 'HALF1')
    await page.reload()
    await page.locator('#test-name').waitFor()
    const name = await page.inputValue('#test-name')
    verdict({ key: 'fe.wizard.refresh', category: 'edge', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/1', title: 'Refresh mid-form', steps: '1) Type name and code 2) Reload page', expected: 'Draft kept or user warned before leaving', actual: name ? `Kept: "${name}"` : 'Typed data lost, no warning', evidence: EV }, name === 'Half filled test', ok)
  })

  test('step URL can be opened directly without a test', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(WS('/test-manager/wizard/step-3'))
    await page.waitForTimeout(2000)
    const t = await page.locator('main').innerText()
    const ev = await shot(page, 'wizard-step3-direct')
    verdict({ key: 'fe.wizard.direct-step3', category: 'edge', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/3', title: 'Open step 3 directly', steps: '1) Open /wizard/step-3 with no test created', expected: 'Redirect to step 1 or clear message', actual: t.slice(0, 120).replace(/\s+/g, ' '), evidence: ev }, /create the test first|step 1/i.test(t) || /wizard\/step-1/.test(page.url()), ok)
  })

  test('invalid step number', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(WS('/test-manager/wizard/step-99'))
    await page.waitForTimeout(1500)
    const t = await page.locator('body').innerText()
    verdict({ key: 'fe.wizard.bad-step', category: 'edge', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/:step', title: 'Step 99 in URL', steps: '1) Open /wizard/step-99', expected: 'Redirect to step 1 or 404 page', actual: `${page.url().split('5173')[1]} :: ${t.slice(0, 60).replace(/\s+/g, ' ')}`, evidence: EV }, /wizard\/step-1/.test(page.url()) || /not found/i.test(t), ok)
  })
})

test.describe('Questions step', () => {
  test('add a single choice question', async ({ page }) => {
    const w = watch(page)
    const token = await demoAdminToken()
    const demo = (await apiJson('GET', '/tests?testCode=DEMO1', undefined, token)).body.data.items[0]
    await loginAdmin(page)
    await page.goto(WS(`/test-manager/wizard/step-3?testId=${demo.id}`))
    await page.getByRole('button', { name: /add question/i }).click()
    await page.locator('#question-subject').click()
    await page.getByRole('option', { name: 'Physics' }).click()
    await page.locator('#question-topic').click()
    const topics = await page.getByRole('option').allInnerTexts()
    await page.getByRole('option', { name: 'Mechanics' }).click()
    verdict({ key: 'fe.questions.topic-filter', category: 'functional', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/step-3', title: 'Topic list follows the chosen subject', steps: '1) Add Question 2) Subject = Physics 3) Open Topic', data: 'Only Mechanics is mapped to Physics', expected: 'Only Mechanics', actual: topics.join(', '), evidence: EV }, topics.length === 1 && topics[0] === 'Mechanics', ok)
    await page.locator('#question-type').click()
    await page.getByRole('option', { name: 'Single Choice' }).click()
    const editor = page.locator('[contenteditable=true]').first()
    await editor.click()
    await page.keyboard.type(`What is 2 + 2? ${Date.now() % 1000}`)
    await page.getByPlaceholder('Option A').fill('3')
    await page.getByPlaceholder('Option B').fill('4')
    await page.getByPlaceholder('Option C').fill('5')
    await page.getByPlaceholder('Option D').fill('6')
    await page.getByLabel('Mark option B as correct').check()
    await page.getByRole('button', { name: /save question/i }).click()
    const firstToast = await toastText(page, 3000)
    verdict({ key: 'fe.questions.difficulty-hidden', category: 'design', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/step-3', title: 'Required difficulty is easy to find', steps: '1) Fill question, options, correct answer 2) Save', expected: 'All required fields visible and marked * before saving', actual: firstToast ? `Blocked by "${firstToast}"; field is inside collapsed "Advance Options" with no *` : 'Saved without extra step', evidence: EV }, !firstToast.includes('difficulty'), ok)
    const diff = page.locator('button', { hasText: /select difficulty/i })
    await page.locator('[data-sonner-toast]').first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => undefined)
    if (await diff.count()) {
      await diff.first().click()
      await page.getByRole('option', { name: 'Easy' }).click()
    }
    await page.getByRole('button', { name: /save question/i }).click()
    const toast = await toastText(page)
    const post = w.api.find((a) => a.method === 'POST' && a.url === '/api/v1/questions')
    const ev = await shot(page, 'question-saved')
    verdict({ key: 'fe.questions.add-single', category: 'functional', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/step-3', title: 'Save a single choice question', steps: '1) Subject, topic, type 2) Type question 3) 4 options, B correct 4) Save Question', expected: 'Question saved and counter increases', actual: `POST /questions -> ${post?.status}; toast "${toast}"`, evidence: ev }, post?.status === 201, ok)
  })

  test('save question with nothing filled', async ({ page }) => {
    const token = await demoAdminToken()
    const demo = (await apiJson('GET', '/tests?testCode=DEMO1', undefined, token)).body.data.items[0]
    await loginAdmin(page)
    await page.goto(WS(`/test-manager/wizard/step-3?testId=${demo.id}`))
    await page.getByRole('button', { name: /add question/i }).click()
    await page.getByRole('button', { name: /save question/i }).click()
    await page.waitForTimeout(800)
    const msgs = (await page.locator('main .text-destructive').allInnerTexts()).filter((x) => x.trim() !== '*')
    const ev = await shot(page, 'question-empty-save')
    verdict({ key: 'fe.questions.empty', category: 'validation', module: 'Test Wizard', page: '/w/:slug/test-manager/wizard/step-3', title: 'Save empty question', steps: '1) Add Question 2) Save Question', expected: 'Subject, topic and type errors', actual: msgs.join(' | ') || '(no messages)', evidence: ev }, msgs.length >= 3, ok)
  })
})
