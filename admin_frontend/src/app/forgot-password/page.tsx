import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AuthBackToSignIn, AuthFormHeader, AuthMarketingPanel } from '@/components/auth/auth-shell'
import { PasswordField } from '@/components/auth/password-field'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/shared/loader/loader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  resetPassword,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
} from '@/features/auth/api/forgot-password'
import { validatePassword } from '@/lib/password-validation'
import { useAppPath } from '@/hooks/use-app-path'

type Step = 'email' | 'otp' | 'password'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const appPath = useAppPath()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.'
    return null
  }

  const validateOtp = (value: string): string | null => {
    if (!value.trim()) return 'OTP is required.'
    if (!/^\d{6}$/.test(value)) return 'OTP must be a 6-digit number.'
    return null
  }

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const emailValidation = validateEmail(email)
    setEmailError(emailValidation)
    if (emailValidation) return

    setIsSubmitting(true)
    try {
      await sendForgotPasswordOtp(email.trim())
      setStep('otp')
      setOtp('')
      setOtpError(null)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to send OTP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const otpValidation = validateOtp(otp)
    setOtpError(otpValidation)
    if (otpValidation) return

    setIsSubmitting(true)
    try {
      await verifyForgotPasswordOtp(email.trim(), otp)
      setStep('password')
      setPassword('')
      setConfirmPassword('')
      setPasswordError(null)
      setConfirmPasswordError(null)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to verify OTP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const passwordValidation = validatePassword(password)
    const confirmValidation = !confirmPassword
      ? 'Please confirm your password.'
      : confirmPassword !== password
        ? 'Passwords do not match.'
        : null

    setPasswordError(passwordValidation)
    setConfirmPasswordError(confirmValidation)
    if (passwordValidation || confirmValidation) return

    setIsSubmitting(true)
    try {
      await resetPassword(email.trim(), otp, password)
      toast.success('Password updated successfully')
      navigate(appPath('/login'), { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to reset password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh">
      <AuthMarketingPanel />

      <div className="flex w-full flex-col items-center justify-center bg-background px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          {step === 'email' && (
            <>
              <AuthFormHeader
                title="Forgot password"
                description="Enter your email address and we'll send you a one-time password."
              />
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setEmailError(null)
                    }}
                    placeholder="admin@testtakers.com"
                    autoComplete="email"
                    aria-invalid={emailError ? true : undefined}
                    required
                  />
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>

                {formError && (
                  <p className="text-sm text-destructive" role="alert">
                    {formError}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader size="sm" />
                      Sending…
                    </>
                  ) : (
                    'Send'
                  )}
                </Button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <AuthFormHeader
                title="Enter OTP"
                description={`We sent a 6-digit code to ${email}.`}
              />
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">One-time password</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '').slice(0, 6)
                      setOtp(digits)
                      setOtpError(null)
                    }}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    maxLength={6}
                    aria-invalid={otpError ? true : undefined}
                    required
                  />
                  {otpError && <p className="text-xs text-destructive">{otpError}</p>}
                </div>

                {formError && (
                  <p className="text-sm text-destructive" role="alert">
                    {formError}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader size="sm" />
                      Verifying…
                    </>
                  ) : (
                    'Enter'
                  )}
                </Button>
              </form>
            </>
          )}

          {step === 'password' && (
            <>
              <AuthFormHeader
                title="Set new password"
                description="Choose a strong password for your account."
              />
              <form onSubmit={handleResetPassword} className="space-y-4">
                <PasswordField
                  id="new-password"
                  label="New password"
                  value={password}
                  onChange={(value) => {
                    setPassword(value)
                    setPasswordError(null)
                  }}
                  error={passwordError}
                  autoComplete="new-password"
                />

                <PasswordField
                  id="confirm-password"
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={(value) => {
                    setConfirmPassword(value)
                    setConfirmPasswordError(null)
                  }}
                  error={confirmPasswordError}
                  autoComplete="new-password"
                />

                {formError && (
                  <p className="text-sm text-destructive" role="alert">
                    {formError}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader size="sm" />
                      Updating…
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </form>
            </>
          )}

          <AuthBackToSignIn />
        </div>
      </div>
    </div>
  )
}
