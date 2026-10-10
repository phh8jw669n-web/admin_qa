import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'

import { useAppPath } from '@/hooks/use-app-path'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function AuthMarketingPanel() {
  const workspace = useWorkspaceStore((state) => state.workspace)

  return (
    <div className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.9) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative z-10 flex items-center gap-2 text-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100/10 ring-1 ring-slate-100/20">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium tracking-wide">
          {workspace?.name ?? 'Test Takers'}
        </span>
      </div>

      <div className="relative z-10 max-w-md">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          {workspace ? 'Workspace Console' : 'Platform Console'}
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-destructive-foreground">
          Every test, every taker, one clean sheet.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Manage exams, monitor sessions, and review results — all from a single dashboard built for
          the people running the show.
        </p>
      </div>

      <p className="relative z-10 text-xs font-bold text-muted-foreground">
        &copy; {new Date().getFullYear()} Test Takers. All rights reserved.
      </p>
    </div>
  )
}

export function AuthFormHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8 space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function AuthBackToSignIn() {
  const appPath = useAppPath()

  return (
    <p className="mt-6 text-center text-sm text-muted-foreground">
      Remember your password?{' '}
      <Link
        to={appPath('/login')}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Sign in
      </Link>
    </p>
  )
}
