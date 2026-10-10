import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { WizardShell } from '@/components/shared/wizard-shell/wizard-shell'
import { Loader, PageLoader } from '@/components/shared/loader/loader'
import { Button } from '@/components/ui/button'
import { useCreateTest, useUpdateTest } from '@/features/test-manager/api/tests-mutations'
import {
  useSaveTestSettings,
  useUpdateTestSettings,
} from '@/features/test-manager/api/test-settings-mutations'
import { useTest } from '@/features/test-manager/api/use-test'
import { useTestSettings } from '@/features/test-manager/api/use-test-settings'
import {
  Step1CreateForm,
  STEP_1_FORM_ID,
} from '@/features/test-manager/components/step-1-create-form'
import { Step2Settings } from '@/features/test-manager/components/step-2-settings'
import { Step3Questions } from '@/features/test-manager/components/step-3-questions'
import {
  areCreateTestPayloadsEqual,
  toCreateTestFormValues,
  toCreateTestPayload,
} from '@/features/test-manager/lib/to-create-test-payload'
import {
  areTestSettingsUpdatePayloadsEqual,
  toTestSettingsPayload,
  toTestSettingsUpdatePayload,
  type TestSettingsUpdatePayload,
} from '@/features/test-manager/lib/to-test-settings-payload'
import type { CreateTestFormValues } from '@/features/test-manager/schema/step-1-create.schema'
import { emptyTestSettings } from '@/features/test-manager/schema/step-2-settings.schema'
import { getWizardStepPath } from '@/features/test-manager/lib/wizard-path'
import { readTestIdBackup, useWizardStore } from '@/features/test-manager/store/wizard-store'
import { useAppPath } from '@/hooks/use-app-path'
import { getApiErrorMessage } from '@/lib/axios'

const wizardSteps = [
  { id: 1, label: 'Create' },
  { id: 2, label: 'Settings' },
  { id: 3, label: 'Questions' },
  { id: 4, label: 'Publish' },
  { id: 5, label: 'Assign' },
  { id: 6, label: 'Certificate' },
]

export function TestWizardPage() {
  const { step = 'step-1' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const appPath = useAppPath()
  const currentStep = Number(step.replace('step-', ''))
  const {
    testId: storedTestId,
    testSettingsId,
    completedSteps,
    stepData,
    setStepData,
    markStepComplete,
    setCurrentStep,
    setTestId,
    setTestSettingsId,
    resetWizard,
  } = useWizardStore()
  const urlTestId = searchParams.get('testId')
  const testId = urlTestId || storedTestId || readTestIdBackup()
  const createTest = useCreateTest()
  const updateTest = useUpdateTest()
  const saveTestSettings = useSaveTestSettings()
  const updateTestSettings = useUpdateTestSettings(testId)
  const lastPostedSettings = useRef<TestSettingsUpdatePayload | null>(null)
  const hydratedSettingsForTest = useRef<string | null>(null)
  const isLeavingWizard = useRef(false)
  const [settingsReady, setSettingsReady] = useState(false)
  const [wizardHydrated, setWizardHydrated] = useState(() => useWizardStore.persist.hasHydrated())
  const {
    data: test,
    isLoading: isTestLoading,
    isError: isTestError,
    error: testError,
    refetch: refetchTest,
  } = useTest(testId)
  const {
    data: fetchedSettings,
    isFetched: isSettingsFetched,
    isLoading: isSettingsLoading,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
  } = useTestSettings(testId, currentStep === 2)

  const isSaving =
    createTest.isPending ||
    updateTest.isPending ||
    saveTestSettings.isPending ||
    updateTestSettings.isPending
  const mappedTest = test ? toCreateTestFormValues(test) : undefined
  const step1Defaults = mappedTest
    ? {
        ...mappedTest,
        ...stepData.step1,
        categoryId: stepData.step1?.categoryId || mappedTest.categoryId,
        primaryInstructionId:
          stepData.step1?.primaryInstructionId || mappedTest.primaryInstructionId,
        templateId: stepData.step1?.templateId || mappedTest.templateId,
      }
    : stepData.step1
  const canShowStep1 = !testId || Boolean(test)

  useEffect(() => {
    hydratedSettingsForTest.current = null
    lastPostedSettings.current = null
    setSettingsReady(false)
  }, [testId])

  useEffect(() => {
    const unsub = useWizardStore.persist.onFinishHydration(() => {
      setWizardHydrated(true)
    })
    if (useWizardStore.persist.hasHydrated()) setWizardHydrated(true)
    return unsub
  }, [])

  useEffect(() => {
    if (isLeavingWizard.current) return
    if (testId && storedTestId !== testId) {
      setTestId(testId)
    }
  }, [setTestId, storedTestId, testId])

  useEffect(() => {
    if (isLeavingWizard.current || !testId) return
    if (searchParams.get('testId') === testId) return
    const next = new URLSearchParams(searchParams)
    next.set('testId', testId)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, testId])

  useEffect(() => {
    if (!Number.isInteger(currentStep) || currentStep < 1 || currentStep > wizardSteps.length) {
      navigate(getWizardStepPath(appPath, 1, testId), { replace: true })
    }
  }, [appPath, currentStep, navigate, testId])

  useEffect(() => {
    if (!wizardHydrated || isLeavingWizard.current) return
    if (currentStep > 1 && !testId) {
      toast.error('Create the test first')
      navigate(getWizardStepPath(appPath, 1), { replace: true })
    }
  }, [appPath, currentStep, navigate, testId, wizardHydrated])

  useEffect(() => {
    if (currentStep !== 2 || !testId || !isSettingsFetched) return
    if (hydratedSettingsForTest.current === testId) {
      setSettingsReady(true)
      return
    }

    hydratedSettingsForTest.current = testId

    if (!fetchedSettings) {
      setTestSettingsId(null)
      setSettingsReady(true)
      return
    }

    setTestSettingsId(fetchedSettings.id)
    setStepData('step2', fetchedSettings.settings)
    lastPostedSettings.current = fetchedSettings.payload
    setSettingsReady(true)
  }, [
    currentStep,
    fetchedSettings,
    isSettingsFetched,
    setStepData,
    setTestSettingsId,
    testId,
  ])

  const goToStep = (nextStep: number, nextTestId: string | null = testId) => {
    markStepComplete(currentStep)
    setCurrentStep(nextStep)
    navigate(getWizardStepPath(appPath, nextStep, nextTestId))
  }

  const handleStep1Submit = (values: CreateTestFormValues) => {
    const flags = {
      isDraft: test?.isDraft,
      isPublished: test?.isPublished,
      isActive: test?.isActive,
    }
    const payload = toCreateTestPayload(values, flags)
    const savedValues = stepData.step1 ?? (test ? toCreateTestFormValues(test) : undefined)

    const proceed = () => {
      setStepData('step1', values)
      goToStep(2)
    }

    if (testId) {
      if (
        savedValues &&
        areCreateTestPayloadsEqual(payload, toCreateTestPayload(savedValues, flags))
      ) {
        proceed()
        return
      }

      updateTest.mutate(
        { id: testId, payload },
        {
          onSuccess: () => {
            toast.success('Test updated')
            proceed()
          },
          onError: (error) => toast.error(getApiErrorMessage(error)),
        },
      )
      return
    }

    createTest.mutate(payload, {
      onSuccess: (created) => {
        setTestId(created.id)
        toast.success('Test created')
        setStepData('step1', values)
        goToStep(2, created.id)
      },
      onError: (error) => toast.error(getApiErrorMessage(error)),
    })
  }

  const handleStep2Next = () => {
    if (!testId) {
      toast.error('Create the test first')
      return
    }

    const settings = {
      ...emptyTestSettings,
      ...stepData.step2,
      shuffleQuestion: {
        ...emptyTestSettings.shuffleQuestion,
        ...stepData.step2?.shuffleQuestion,
      },
      testOptions: {
        ...emptyTestSettings.testOptions,
        ...stepData.step2?.testOptions,
      },
      timeSetting: {
        ...emptyTestSettings.timeSetting,
        ...stepData.step2?.timeSetting,
      },
      endTestSetting: {
        ...emptyTestSettings.endTestSetting,
        ...stepData.step2?.endTestSetting,
      },
    }
    const updatePayload = toTestSettingsUpdatePayload(settings)

    const proceed = (settingsId?: string | null) => {
      setStepData('step2', settings)
      lastPostedSettings.current = updatePayload
      if (settingsId) setTestSettingsId(settingsId)
      goToStep(3)
    }

    if (
      lastPostedSettings.current &&
      areTestSettingsUpdatePayloadsEqual(updatePayload, lastPostedSettings.current)
    ) {
      proceed(testSettingsId)
      return
    }

    if (testSettingsId) {
      updateTestSettings.mutate(
        { id: testSettingsId, payload: updatePayload },
        {
          onSuccess: () => {
            toast.success('Test settings updated')
            proceed(testSettingsId)
          },
          onError: (error) => toast.error(getApiErrorMessage(error)),
        },
      )
      return
    }

    saveTestSettings.mutate(toTestSettingsPayload(testId, settings), {
      onSuccess: (created) => {
        toast.success('Test settings created')
        proceed(created.id)
      },
      onError: (error) => toast.error(getApiErrorMessage(error)),
    })
  }

  const handleNext = () => {
    if (currentStep === 2) {
      handleStep2Next()
      return
    }

    goToStep(currentStep + 1)
  }

  const canShowStep2 = Boolean(testId) && settingsReady && !isSettingsError

  const leaveWizard = () => {
    isLeavingWizard.current = true
    resetWizard()
    navigate(appPath('/test-manager'))
  }

  return (
    <div className="space-y-6">
      <WizardShell
        steps={wizardSteps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onClose={leaveWizard}
      >
        {currentStep === 1 && testId && isTestLoading && <PageLoader label="Loading test…" />}

        {currentStep === 1 && testId && isTestError && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{getApiErrorMessage(testError)}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetchTest()}>
              Retry
            </Button>
          </div>
        )}

        {currentStep === 1 && canShowStep1 && (
          <Step1CreateForm
            key={testId ?? (stepData.step1 ? 'draft' : 'new')}
            defaultValues={step1Defaults}
            optionLabels={{
              category: test?.categoryName,
              instruction: test?.primaryInstructionName,
            }}
            onSubmit={handleStep1Submit}
          />
        )}

        {currentStep === 2 && testId && (isSettingsLoading || !settingsReady) && !isSettingsError && (
          <PageLoader label="Loading settings…" />
        )}

        {currentStep === 2 && testId && isSettingsError && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{getApiErrorMessage(settingsError)}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetchSettings()}>
              Retry
            </Button>
          </div>
        )}

        {currentStep === 2 && canShowStep2 && (
          <Step2Settings
            key={testSettingsId ?? 'new-settings'}
            value={stepData.step2}
            onChange={(data) => setStepData('step2', data)}
          />
        )}

        {currentStep === 3 && (
          <Step3Questions
            testId={testId}
            totalQuestions={test?.totalQuestions}
          />
        )}

        {currentStep > 3 && (
          <p className="text-sm text-muted-foreground">
            Step {currentStep} scaffold is ready. Add form sections and Zod schemas in{' '}
            <code>features/test-manager/schema</code>.
          </p>
        )}

        <div
          className={
            currentStep === 2 ? 'mt-6 flex justify-end gap-2' : 'mt-6 flex justify-between'
          }
        >
          {currentStep > 1 ? (
            <Button variant="secondary" asChild>
              <Link to={getWizardStepPath(appPath, currentStep - 1, testId)}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to={appPath('/test-manager')} onClick={resetWizard}>
                Cancel
              </Link>
            </Button>
          )}

          {currentStep < 6 ? (
            <Button
              type={currentStep === 1 ? 'submit' : 'button'}
              form={currentStep === 1 ? STEP_1_FORM_ID : undefined}
              onClick={currentStep === 1 ? undefined : handleNext}
              disabled={
                (currentStep === 1 &&
                  (isSaving || Boolean(testId && (isTestLoading || isTestError)))) ||
                (currentStep === 2 &&
                  (isSaving || !testId || isSettingsLoading || isSettingsError || !settingsReady))
              }
            >
              {(currentStep === 1 || currentStep === 2) && isSaving ? (
                <>
                  <Loader size="sm" />
                  Saving…
                </>
              ) : (
                'Next'
              )}
            </Button>
          ) : (
            <Button>Finish</Button>
          )}
        </div>
      </WizardShell>
    </div>
  )
}
