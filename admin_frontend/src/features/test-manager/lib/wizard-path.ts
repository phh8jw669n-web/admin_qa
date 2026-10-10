export function getWizardStepPath(
  appPath: (path: string) => string,
  step: number,
  testId?: string | null,
): string {
  const pathname = appPath(`/test-manager/wizard/step-${step}`)
  if (!testId) return pathname
  return `${pathname}?testId=${encodeURIComponent(testId)}`
}
