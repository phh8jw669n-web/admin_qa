/** Pure logic. Test names start with [key] so results map to qa_frontend CSV rows. */
import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getPaginationItems } from '@/components/shared/data-table/pagination'
import { getApiErrorMessage } from '@/lib/axios'
import { validatePassword } from '@/lib/password-validation'
import { getDefaultHomePath, getSafeRedirect, getWorkspaceSlugFromPathname, isAuthPath, stripWorkspacePrefix } from '@/lib/workspace-url'
import { createTestSchema, emptyCreateTestValues } from '@/features/test-manager/schema/step-1-create.schema'
import { toCreateTestPayload, toCreateTestFormValues } from '@/features/test-manager/lib/to-create-test-payload'
import { mapRole } from '@/features/auth/types'

const admin = { role: 'admin' as const, workspaceSlug: 'acme' }
const sa = { role: 'super_admin' as const, workspaceSlug: null }
const valid = { ...emptyCreateTestValues, name: 'T', testCode: 'T1', categoryId: 'c', primaryInstructionId: 'i', durationMinutes: '60', totalQuestions: '5', totalMarks: '20', templateId: 't', startDate: '2030-01-01', endDate: '2030-01-01', startTime: '09:00', endTime: '11:00' }

function axiosErr(status: number, data: unknown) {
  const e = new AxiosError('Request failed with status code ' + status, 'ERR_BAD_REQUEST', undefined, undefined, { status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } })
  return e
}

describe('workspace-url', () => {
  it('[fe.unit.redirect.same-workspace] keeps a redirect inside own workspace', () => {
    expect(getSafeRedirect(admin, '/w/acme/test-manager')).toBe('/w/acme/test-manager')
  })
  it('[fe.unit.redirect.other-workspace] blocks a redirect to another workspace', () => {
    expect(getSafeRedirect(admin, '/w/evil/dashboard')).toBe('/w/acme/dashboard')
  })
  it('[fe.unit.redirect.protocol-relative] blocks //evil.example', () => {
    expect(getSafeRedirect(admin, '//evil.example/x')).toBe('/w/acme/dashboard')
  })
  it('[fe.unit.redirect.backslash] blocks /\\evil.example (browser treats as //)', () => {
    expect(getSafeRedirect(admin, '/\\evil.example')).toBe('/w/acme/dashboard')
  })
  it('[fe.unit.redirect.prefix-trick] blocks /w/acme-evil (prefix of slug)', () => {
    expect(getSafeRedirect(admin, '/w/acme-evil/dashboard')).toBe('/w/acme/dashboard')
  })
  it('[fe.unit.redirect.super] super admin cannot be sent into a workspace', () => {
    expect(getSafeRedirect(sa, '/w/acme/dashboard')).toBe('/workspaces')
  })
  it('[fe.unit.home] default home paths', () => {
    expect(getDefaultHomePath(admin)).toBe('/w/acme/dashboard')
    expect(getDefaultHomePath(sa)).toBe('/workspaces')
  })
  it('[fe.unit.slug.decode] decodes encoded slug', () => {
    expect(getWorkspaceSlugFromPathname('/w/my%20co/login')).toBe('my co')
  })
  it('[fe.unit.slug.bad-encoding] malformed encoding does not crash', () => {
    expect(() => getWorkspaceSlugFromPathname('/w/%E0%A4%A/login')).not.toThrow()
  })
  it('[fe.unit.auth-path] auth paths detected inside workspace', () => {
    expect(isAuthPath('/w/acme/login')).toBe(true)
    expect(isAuthPath('/w/acme/forgot-password')).toBe(true)
    expect(stripWorkspacePrefix('/w/acme')).toBe('/')
  })
})

describe('password rule', () => {
  it('[fe.unit.password.strong] accepts a strong password', () => expect(validatePassword('Abcdef1!')).toBeNull())
  it('[fe.unit.password.weak] rejects missing symbol', () => expect(validatePassword('Abcdefg1')).toMatch(/special/))
  it('[fe.unit.password.short] rejects 7 chars', () => expect(validatePassword('Ab1!xyz')).toMatch(/8/))
})

describe('step 1 schema (create test)', () => {
  it('[fe.unit.schema.valid] valid values pass', () => expect(createTestSchema.safeParse(valid).success).toBe(true))
  it('[fe.unit.schema.handicapped-equal] handicapped equal to duration is allowed (backend allows >=)', () => {
    expect(createTestSchema.safeParse({ ...valid, handicappedDurationMinutes: '60' }).success).toBe(true)
  })
  it('[fe.unit.schema.name-max] name longer than 200 is rejected before the API (backend max 200)', () => {
    expect(createTestSchema.safeParse({ ...valid, name: 'a'.repeat(201) }).success).toBe(false)
  })
  it('[fe.unit.schema.code-max] test code longer than 10 is rejected before the API (backend max 10)', () => {
    expect(createTestSchema.safeParse({ ...valid, testCode: 'ABCDEFGHIJK' }).success).toBe(false)
  })
  it('[fe.unit.schema.buffer-format] start buffer "15 min" is rejected (backend needs HH:MM)', () => {
    expect(createTestSchema.safeParse({ ...valid, startBufferTime: '15 min' }).success).toBe(false)
  })
  it('[fe.unit.schema.decimal-marks] total marks 12.5 is allowed (backend allows 2 decimals)', () => {
    expect(createTestSchema.safeParse({ ...valid, totalMarks: '12.5' }).success).toBe(true)
  })
  it('[fe.unit.schema.grace] grace marks above total are rejected', () => {
    expect(createTestSchema.safeParse({ ...valid, graceMarks: '500' }).success).toBe(false)
  })
  it('[fe.unit.schema.end-before-start] end date before start date is rejected', () => {
    expect(createTestSchema.safeParse({ ...valid, endDate: '2029-12-31' }).success).toBe(false)
  })
})

describe('create test payload', () => {
  it('[fe.unit.payload.handicapped-empty] empty handicapped duration is not sent as 0', () => {
    const p = toCreateTestPayload(valid)
    expect(p.handicappedDurationMinutes).not.toBe(0)
  })
  it('[fe.unit.payload.buffer-empty] empty start buffer time is not sent as ""', () => {
    const p = toCreateTestPayload(valid)
    expect(p.startBufferTime).not.toBe('')
  })
  it('[fe.unit.payload.round-trip] API test maps back to the same form values', () => {
    const p = toCreateTestPayload({ ...valid, handicappedDurationMinutes: '80', startBufferTime: '00:15' })
    const back = toCreateTestFormValues({ ...p, startTime: '09:00:00', endTime: '11:00:00', startBufferTime: '00:15:00' })
    expect(back.startTime).toBe('09:00')
    expect(back.startBufferTime).toBe('00:15')
    expect(back.handicappedDurationMinutes).toBe('80')
  })
})

describe('error messages', () => {
  it('[fe.unit.error.errors-array] joins backend errors[]', () => {
    expect(getApiErrorMessage(axiosErr(400, { success: false, errors: ['name should not be empty', 'code too long'] }))).toBe('name should not be empty. code too long')
  })
  it('[fe.unit.error.no-body] 404 without body gives a friendly message', () => {
    expect(getApiErrorMessage(axiosErr(404, undefined))).not.toMatch(/status code/)
  })
  it('[fe.unit.error.network] network error gives a friendly message', () => {
    const e = new AxiosError('Network Error', 'ERR_NETWORK')
    expect(getApiErrorMessage(e)).not.toBe('Network Error')
  })
})

describe('misc', () => {
  it('[fe.unit.pagination] pagination items with dots', () => {
    expect(getPaginationItems(0, 20)).toEqual([0, 1, 2, 3, 4, 'dots', 19])
    expect(getPaginationItems(10, 20)).toEqual([0, 'dots', 9, 10, 11, 'dots', 19])
  })
  it('[fe.unit.role] unknown role is not mapped to admin', () => {
    expect(mapRole('candidate')).not.toBe('admin')
  })
})
