export type DashboardSummary = {
  totalCandidates: number
  totalTests: number
}

export type TestFilterOption = {
  id: string
  name: string
}

export type CandidateTrendPoint = {
  date: string
  candidates: number
}

export type ActivityLogEntry = {
  id: string
  timestamp: string
  message: string
  type: 'login' | 'start' | 'finish' | 'offline' | 'alert'
  candidate?: string
  test?: string
}

export type DashboardData = {
  summary: DashboardSummary
  testOptions: TestFilterOption[]
  candidateTrend: Record<string, CandidateTrendPoint[]>
  activityLog: ActivityLogEntry[]
}
