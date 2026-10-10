import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CandidateTrendPoint, TestFilterOption } from '@/features/dashboard/types'

import { chartColors, chartGradientId } from './chart-theme'

type CandidateChartPanelProps = {
  candidateLabel: string
  testOptions: TestFilterOption[]
  candidateTrend: Record<string, CandidateTrendPoint[]>
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="panel rounded-md px-3 py-2 text-sm">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="text-muted-foreground">
          <span className="font-data" style={{ color: entry.color }}>
            {entry.value}
          </span>{' '}
          {entry.name}
        </p>
      ))}
    </div>
  )
}

function formatChartDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export function CandidateChartPanel({
  candidateLabel,
  testOptions,
  candidateTrend,
}: CandidateChartPanelProps) {
  const defaultTest = testOptions[0]?.id ?? 'all'
  const allPoints = candidateTrend[defaultTest] ?? candidateTrend.all ?? []
  const defaultStart = allPoints[0]?.date ?? ''
  const defaultEnd = allPoints[allPoints.length - 1]?.date ?? ''

  const [selectedTest, setSelectedTest] = useState(defaultTest)
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)

  const chartData = useMemo(() => {
    const points = candidateTrend[selectedTest] ?? candidateTrend.all ?? []

    return points
      .filter((point) => {
        if (startDate && point.date < startDate) return false
        if (endDate && point.date > endDate) return false
        return true
      })
      .map((point) => ({
        ...point,
        label: formatChartDate(point.date),
      }))
  }, [candidateTrend, selectedTest, startDate, endDate])

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>{candidateLabel} Count</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="panel flex flex-wrap items-end gap-4 rounded-md p-4">
          <div className="space-y-2">
            <Label>Test</Label>
            <Select value={selectedTest} onValueChange={setSelectedTest}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select test" />
              </SelectTrigger>
              <SelectContent>
                {testOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-[160px] font-data"
            />
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-[160px] font-data"
            />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={chartGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.2} />
                <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.muted}
              opacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: chartColors.muted, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: chartColors.muted, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="candidates"
              name={candidateLabel}
              fill={`url(#${chartGradientId})`}
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="candidates"
              name={candidateLabel}
              stroke={chartColors.primary}
              strokeWidth={2}
              dot={{ fill: chartColors.primary, r: 3 }}
              activeDot={{ r: 5, fill: chartColors.primary }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
