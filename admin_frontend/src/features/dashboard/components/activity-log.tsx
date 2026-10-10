import { AlertTriangle, CircleCheck, LogIn, LogOut, Play } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ActivityLogEntry } from '@/features/dashboard/types'

type ActivityLogProps = {
  entries: ActivityLogEntry[]
}

const typeConfig: Record<
  ActivityLogEntry['type'],
  {
    label: string
    variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'
    icon: typeof LogIn
    dotClass: string
  }
> = {
  login: { label: 'Login', variant: 'secondary', icon: LogIn, dotClass: 'status-dot--primary' },
  start: { label: 'Started', variant: 'default', icon: Play, dotClass: 'status-dot--primary' },
  finish: {
    label: 'Finished',
    variant: 'success',
    icon: CircleCheck,
    dotClass: 'status-dot--success',
  },
  offline: { label: 'Offline', variant: 'warning', icon: LogOut, dotClass: 'status-dot--warning' },
  alert: {
    label: 'Alert',
    variant: 'destructive',
    icon: AlertTriangle,
    dotClass: 'status-dot--error',
  },
}

export function ActivityLog({ entries }: ActivityLogProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[420px] pr-3">
          <div className="space-y-3">
            {entries.map((entry) => {
              const config = typeConfig[entry.type]
              const Icon = config.icon

              return (
                <div key={entry.id} className="panel space-y-2 rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={config.variant} className="gap-1.5">
                      <span className={`status-dot ${config.dotClass}`} aria-hidden="true" />
                      <Icon className="h-3 w-3 shrink-0" />
                      {config.label}
                    </Badge>
                    <span className="font-data shrink-0 text-xs text-muted-foreground">
                      {entry.timestamp}
                    </span>
                  </div>
                  <p className="text-sm">{entry.message}</p>
                  {(entry.candidate || entry.test) && (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {entry.candidate && <span>{entry.candidate}</span>}
                      {entry.candidate && entry.test && <span>·</span>}
                      {entry.test && <span>{entry.test}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
