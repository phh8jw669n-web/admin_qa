import { expect, test } from '@playwright/test'
import { flush, rec, shot } from './helpers'
import { open, PAGES } from './pages'

const EV = 'admin_frontend/qa_tests/e2e/responsive.spec.ts'
test.afterAll(() => flush('responsive'))
const WIDTHS = [360, 768, 1366, 1920]
const targets = PAGES.filter((p) => ['login', 'dashboard', 'test-list', 'wizard-1', 'wizard-3', 'question-bank', 'companies', 'workspace-missing'].includes(p.key))

for (const p of targets) {
  for (const w of WIDTHS) {
    test(`${p.name} @ ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: w < 800 ? 780 : 900 })
      await open(page, p)
      const m = await page.evaluate(() => {
        const doc = document.documentElement
        const main = document.querySelector('main') as HTMLElement | null
        const aside = document.querySelector('aside') as HTMLElement | null
        const mainRect = main?.getBoundingClientRect()
        return {
          overflowX: doc.scrollWidth - doc.clientWidth,
          mainWidth: mainRect ? Math.round(mainRect.width) : null,
          asideWidth: aside ? Math.round(aside.getBoundingClientRect().width) : null,
          asideVisible: aside ? getComputedStyle(aside).display !== 'none' : false,
          tinyTargets: [...document.querySelectorAll('button, a')].filter((e) => { const r = (e as HTMLElement).getBoundingClientRect(); return r.width > 0 && (r.width < 24 || r.height < 24) }).length,
        }
      })
      const ev = await shot(page, `resp-${p.key}-${w}`)
      const problems: string[] = []
      if (m.overflowX > 2) problems.push(`page scrolls sideways by ${m.overflowX}px`)
      if (m.mainWidth !== null && m.mainWidth < 300) problems.push(`content area only ${m.mainWidth}px wide`)
      if (w <= 768 && m.asideVisible && m.asideWidth && m.asideWidth > 100) problems.push(`sidebar ${m.asideWidth}px always open`)
      if (w <= 768 && m.tinyTargets > 0) problems.push(`${m.tinyTargets} touch targets under 24px`)
      rec({ key: `resp.${p.key}.${w}`, category: 'responsive', module: p.name, page: p.name, title: `${p.name} at ${w}px`, steps: `1) Set viewport ${w}px 2) Open ${p.name}`, expected: 'No sideways scroll, readable content, menu collapses on small screens', actual: problems.join('; ') || 'OK', status: problems.length ? 'Fail' : 'Pass', evidence: ev, extra: { width: w, browser: 'Chromium 141', ...m } })
      expect.soft(problems, `${p.name} @ ${w}`).toEqual([])
    })
  }
}
