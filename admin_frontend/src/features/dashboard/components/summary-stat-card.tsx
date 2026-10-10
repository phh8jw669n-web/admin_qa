import type { LucideIcon } from 'lucide-react'
import { ClipboardList, Users } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type SummaryStatCardProps = {
  title: string
  value: number
  icon: LucideIcon
}

export function SummaryStatCard({ title, value, icon: Icon }: SummaryStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-data text-3xl font-semibold tracking-tight">
          {value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  )
}

export const summaryStatConfig = {
  candidates: { icon: Users },
  tests: { icon: ClipboardList },
} as const
