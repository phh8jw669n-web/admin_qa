import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PasswordField } from '@/components/auth/password-field'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

describe('PasswordField', () => {
  it('[fe.unit.password-field.toggle] show/hide toggles input type', async () => {
    render(<PasswordField id="pw" label="Password" value="secret" onChange={() => undefined} />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: /show password/i }))
    expect(input).toHaveAttribute('type', 'text')
  })
  it('[fe.unit.password-field.keyboard] toggle button can be reached with Tab', () => {
    render(<PasswordField id="pw" label="Password" value="" onChange={() => undefined} />)
    expect(screen.getByRole('button', { name: /show password/i })).not.toHaveAttribute('tabindex', '-1')
  })
  it('[fe.unit.password-field.error-link] error text is linked with aria-describedby', () => {
    render(<PasswordField id="pw" label="Password" value="" onChange={() => undefined} error="Too short" />)
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-describedby', 'pw-error')
  })
})

describe('ConfirmDialog', () => {
  it('[fe.unit.confirm.calls] confirm button calls onConfirm once', async () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open onOpenChange={() => undefined} title="Delete" description="Sure?" confirmLabel="Delete" onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
  it('[fe.unit.confirm.pending] confirm button disabled while confirming (no double delete)', () => {
    render(<ConfirmDialog open onOpenChange={() => undefined} title="Delete" description="Sure?" confirmLabel="Delete" isConfirming onConfirm={() => undefined} />)
    const btns = screen.getAllByRole('button').filter((b) => /delete|deleting/i.test(b.textContent ?? ''))
    expect(btns[0]).toBeDisabled()
  })
})
