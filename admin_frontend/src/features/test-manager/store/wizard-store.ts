import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { CreateTestFormValues } from '@/features/test-manager/schema/step-1-create.schema'
import type { TestSettingsData } from '@/features/test-manager/schema/step-2-settings.schema'
import type { QuestionsStepData } from '@/features/test-manager/schema/step-3-questions.schema'

export type CreateTestData = CreateTestFormValues

export type { TestSettingsData, QuestionsStepData }
export type PublishData = Record<string, unknown>
export type AssignData = Record<string, unknown>
export type CertificateData = Record<string, unknown>

export type StepData = {
  step1?: CreateTestData
  step2?: TestSettingsData
  step3?: QuestionsStepData
  step4?: PublishData
  step5?: AssignData
  step6?: CertificateData
}

type WizardStore = {
  testId: string | null
  testSettingsId: string | null
  currentStep: number
  stepData: StepData
  completedSteps: number[]
  setTestId: (testId: string) => void
  setTestSettingsId: (testSettingsId: string | null) => void
  startEditing: (testId: string) => void
  setCurrentStep: (step: number) => void
  setStepData: <K extends keyof StepData>(step: K, data: StepData[K]) => void
  markStepComplete: (step: number) => void
  resetWizard: () => void
}

const initialState = {
  testId: null,
  testSettingsId: null,
  currentStep: 1,
  stepData: {},
  completedSteps: [] as number[],
}

const TEST_ID_BACKUP_KEY = 'test-wizard-testId'

function writeTestIdBackup(testId: string | null) {
  if (typeof sessionStorage === 'undefined') return
  if (testId) sessionStorage.setItem(TEST_ID_BACKUP_KEY, testId)
  else sessionStorage.removeItem(TEST_ID_BACKUP_KEY)
}

export function readTestIdBackup(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(TEST_ID_BACKUP_KEY)
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      ...initialState,
      setTestId: (testId) =>
        set((state) => {
          writeTestIdBackup(testId)
          return {
            testId,
            testSettingsId: state.testId === testId ? state.testSettingsId : null,
          }
        }),
      setTestSettingsId: (testSettingsId) => set({ testSettingsId }),
      startEditing: (testId) => {
        writeTestIdBackup(testId)
        set({ ...initialState, testId })
      },
      setCurrentStep: (step) => set({ currentStep: step }),
      setStepData: (step, data) =>
        set((state) => ({
          stepData: { ...state.stepData, [step]: data },
        })),
      markStepComplete: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),
      resetWizard: () => {
        writeTestIdBackup(null)
        set(initialState)
      },
    }),
    {
      name: 'test-wizard-draft',
      partialize: (state) => ({
        testId: state.testId,
        testSettingsId: state.testSettingsId,
        currentStep: state.currentStep,
        stepData: state.stepData,
        completedSteps: state.completedSteps,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.testId) writeTestIdBackup(state.testId)
      },
    },
  ),
)
