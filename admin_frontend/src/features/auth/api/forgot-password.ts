import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'
import { useWorkspaceStore } from '@/stores/workspace-store'

const MOCK_OTP = '123456'

const PLATFORM_EMAILS = ['superadmin@testtakers.com']

const WORKSPACE_EMAILS: Record<string, string[]> = {
  acme: ['admin@testtakers.com'],
  demo: ['admin@demo.testtakers.com'],
}

function isKnownEmail(email: string): boolean {
  const normalized = email.toLowerCase()
  const workspace = useWorkspaceStore.getState().workspace

  if (!workspace) return PLATFORM_EMAILS.includes(normalized)
  return WORKSPACE_EMAILS[workspace.slug]?.includes(normalized) ?? false
}

export async function sendForgotPasswordOtp(email: string): Promise<void> {
  if (useMockApi) {
    if (!isKnownEmail(email)) {
      throw new Error('No account found with this email address.')
    }
    return
  }

  await apiClient<void>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  })
}

export async function verifyForgotPasswordOtp(email: string, otp: string): Promise<void> {
  if (useMockApi) {
    if (!isKnownEmail(email)) {
      throw new Error('Invalid request. Please start again.')
    }
    if (otp !== MOCK_OTP) {
      throw new Error('Invalid OTP. Please try again.')
    }
    return
  }

  await apiClient<void>('/auth/forgot-password/verify', {
    method: 'POST',
    body: { email, otp },
  })
}

export async function resetPassword(email: string, otp: string, password: string): Promise<void> {
  if (useMockApi) {
    if (!isKnownEmail(email)) {
      throw new Error('Invalid request. Please start again.')
    }
    if (otp !== MOCK_OTP) {
      throw new Error('Invalid OTP. Please try again.')
    }
    return
  }

  await apiClient<void>('/auth/forgot-password/reset', {
    method: 'POST',
    body: { email, otp, password },
  })
}
