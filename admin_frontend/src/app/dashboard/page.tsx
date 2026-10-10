import { ActivityLog } from '@/features/dashboard/components/activity-log'
import { CandidateChartPanel } from '@/features/dashboard/components/candidate-chart-panel'
import {
  SummaryStatCard,
  summaryStatConfig,
} from '@/features/dashboard/components/summary-stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { useDashboardData } from '@/features/dashboard/api/use-dashboard-data'
import { useTenant } from '@/components/providers/app-providers'
import { usePageLoader } from '@/hooks/use-page-loader'

export function DashboardPage() {
  const { data, isLoading } = useDashboardData()
  const { terminology } = useTenant()
  const candidate = terminology.candidate
  usePageLoader(isLoading)

  if (!data) {
    return null
  }

  const { summary, testOptions, candidateTrend, activityLog } = data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of candidates, tests, and live activity."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryStatCard
          title={`Total ${candidate}s`}
          value={summary.totalCandidates}
          icon={summaryStatConfig.candidates.icon}
        />
        <SummaryStatCard
          title="Total Tests"
          value={summary.totalTests}
          icon={summaryStatConfig.tests.icon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CandidateChartPanel
            candidateLabel={candidate}
            testOptions={testOptions}
            candidateTrend={candidateTrend}
          />
        </div>
        <ActivityLog entries={activityLog} />
      </div>
    </div>
  )
}
