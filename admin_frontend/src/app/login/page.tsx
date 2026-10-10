import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

import { AuthMarketingPanel } from '@/components/auth/auth-shell'
import { login } from '@/features/auth/api/login'
import { toAuthUser } from '@/features/auth/map-user'
import { useAppPath } from '@/hooks/use-app-path'
import { getApiErrorMessage } from '@/lib/axios'
import { getSafeRedirect, isAuthPath } from '@/lib/workspace-url'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore, useIsAuthenticated } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Loader } from '@/components/shared/loader/loader'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const appPath = useAppPath()
  const setSession = useAuthStore((state) => state.setSession)
  const isAuthenticated = useIsAuthenticated()
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const isWorkspaceLogin = Boolean(workspace)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated && user) {
    const nextPath = getSafeRedirect(user, searchParams.get('redirect'))
    if (!isAuthPath(nextPath)) {
      return <Navigate to={nextPath} replace />
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await login({ email, password })
      setSession(response)
      const user = toAuthUser(response.admin, response.workspaceSlug ?? null)
      navigate(getSafeRedirect(user, searchParams.get('redirect')), { replace: true })
    } catch (submitError) {
      setError(getApiErrorMessage(submitError) || 'Invalid email or password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh">
      <AuthMarketingPanel />

      <div className="flex w-full flex-col items-center justify-center bg-background px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              {isWorkspaceLogin
                ? `Welcome to ${workspace?.name}. Enter your details to continue.`
                : 'Platform sign in. Tenant admins use their workspace URL.'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <div className="flex items-center gap-2">
                  <Link
                    to={appPath('/forgot-password')}
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'login-error' : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {!showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p id="login-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader size="sm" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
