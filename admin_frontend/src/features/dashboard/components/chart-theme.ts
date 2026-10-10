export const chartColors = {
  primary: 'var(--primary)',
  secondary: 'var(--primary)',
  success: '#059669',
  warning: '#D97706',
  muted: '#94A3B8',
} as const

export const statusChartColors = [
  chartColors.primary,
  chartColors.warning,
  chartColors.success,
] as const

export const chartGradientId = 'chartGrad'
