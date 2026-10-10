import type { DashboardData } from '@/features/dashboard/types'
import type { TestListItem } from '@/features/test-manager/types'

const testSeeds = [
  {
    name: 'AICTE MBA Mock CET 1',
    testCategory: 'AICTE MBA',
    testTemplate: 'AICTE MBA Mock CET 2015',
  },
  {
    name: 'AICTE MBA Mock CET 2',
    testCategory: 'AICTE MBA',
    testTemplate: 'AICTE MBA Mock CET 2015',
  },
  {
    name: 'GATE Mock Series — Paper 1',
    testCategory: 'Engineering',
    testTemplate: 'GATE Mock Series',
  },
  {
    name: 'JEE Advanced Drill',
    testCategory: 'Science',
    testTemplate: 'JEE Advanced Drill',
  },
  {
    name: 'NEET Biology Practice',
    testCategory: 'Medical',
    testTemplate: 'NEET Full Mock',
  },
  {
    name: 'CAT Quant Sectional',
    testCategory: 'Management',
    testTemplate: 'CAT Sectional',
  },
  {
    name: 'UPSC Prelims GS Paper 1',
    testCategory: 'Civil Services',
    testTemplate: 'UPSC Prelims',
  },
  {
    name: 'SSC CGL Tier 1 Mock',
    testCategory: 'Government',
    testTemplate: 'SSC CGL',
  },
]

const statuses = ['Published', 'Draft'] as const

export const mockTests: TestListItem[] = Array.from({ length: 35 }, (_, index) => {
  const seed = testSeeds[index % testSeeds.length]
  const month = String((index % 12) + 1).padStart(2, '0')
  const day = String((index % 28) + 1).padStart(2, '0')
  const status = statuses[index % 3 === 0 ? 1 : 0]

  return {
    id: String(index + 1),
    name: index < testSeeds.length ? seed.name : `${seed.name} — Set ${index + 1}`,
    startDate: `2026-${month}-${day}`,
    endDate: `2026-12-${day}`,
    status,
    question: 50 + (index % 8) * 15,
    testCategory: seed.testCategory,
    testTemplate: seed.testTemplate,
    isActive: index % 7 !== 0,
    isPublished: status === 'Published',
  }
})

export const mockDashboardData: DashboardData = {
  summary: {
    totalCandidates: 842,
    totalTests: 128,
  },
  testOptions: [
    { id: 'all', name: 'All Tests' },
    { id: 'test-1', name: 'Test 1 — GATE Mock Series' },
    { id: 'test-2', name: 'Test 2 — JEE Advanced Drill' },
  ],
  candidateTrend: {
    all: [
      { date: '2026-08-01', candidates: 45 },
      { date: '2026-08-02', candidates: 62 },
      { date: '2026-08-03', candidates: 58 },
      { date: '2026-08-04', candidates: 74 },
      { date: '2026-08-05', candidates: 91 },
      { date: '2026-08-06', candidates: 88 },
      { date: '2026-08-07', candidates: 102 },
      { date: '2026-08-08', candidates: 95 },
      { date: '2026-08-09', candidates: 110 },
      { date: '2026-08-10', candidates: 118 },
      { date: '2026-08-11', candidates: 125 },
      { date: '2026-08-12', candidates: 132 },
    ],
    'test-1': [
      { date: '2026-08-01', candidates: 20 },
      { date: '2026-08-02', candidates: 28 },
      { date: '2026-08-03', candidates: 25 },
      { date: '2026-08-04', candidates: 32 },
      { date: '2026-08-05', candidates: 40 },
      { date: '2026-08-06', candidates: 38 },
      { date: '2026-08-07', candidates: 45 },
      { date: '2026-08-08', candidates: 42 },
      { date: '2026-08-09', candidates: 50 },
      { date: '2026-08-10', candidates: 55 },
      { date: '2026-08-11', candidates: 58 },
      { date: '2026-08-12', candidates: 62 },
    ],
    'test-2': [
      { date: '2026-08-01', candidates: 25 },
      { date: '2026-08-02', candidates: 30 },
      { date: '2026-08-03', candidates: 33 },
      { date: '2026-08-04', candidates: 38 },
      { date: '2026-08-05', candidates: 51 },
      { date: '2026-08-06', candidates: 50 },
      { date: '2026-08-07', candidates: 57 },
      { date: '2026-08-08', candidates: 53 },
      { date: '2026-08-09', candidates: 60 },
      { date: '2026-08-10', candidates: 63 },
      { date: '2026-08-11', candidates: 67 },
      { date: '2026-08-12', candidates: 70 },
    ],
  },
  activityLog: [
    {
      id: 'a1',
      timestamp: '2026-08-12 17:42:10',
      message: 'Candidate started test',
      type: 'start',
      candidate: 'Candidate 2',
      test: 'Test 1',
    },
    {
      id: 'a2',
      timestamp: '2026-08-12 17:38:55',
      message: 'Candidate logged in',
      type: 'login',
      candidate: 'Candidate 2',
      test: 'Test 1',
    },
    {
      id: 'a3',
      timestamp: '2026-08-12 17:35:20',
      message: 'Candidate resumed test',
      type: 'start',
      candidate: 'Candidate 3',
      test: 'Test 2',
    },
    {
      id: 'a4',
      timestamp: '2026-08-12 17:30:00',
      message: 'Candidate finished test',
      type: 'finish',
      candidate: 'Candidate 1',
      test: 'Test 1',
    },
    {
      id: 'a5',
      timestamp: '2026-08-12 17:28:15',
      message: 'Candidate forced offline',
      type: 'offline',
      candidate: 'Candidate 4',
      test: 'Test 1',
    },
    {
      id: 'a6',
      timestamp: '2026-08-12 17:25:40',
      message: 'Webcam disconnected',
      type: 'alert',
      candidate: 'Candidate 5',
      test: 'Test 2',
    },
    {
      id: 'a7',
      timestamp: '2026-08-12 17:20:05',
      message: 'Candidate logged in',
      type: 'login',
      candidate: 'Candidate 1',
      test: 'Test 1',
    },
    {
      id: 'a8',
      timestamp: '2026-08-12 17:15:30',
      message: 'Candidate finished test',
      type: 'finish',
      candidate: 'Candidate 3',
      test: 'Test 2',
    },
  ],
}
