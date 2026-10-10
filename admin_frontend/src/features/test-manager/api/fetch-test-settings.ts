import axios from 'axios'

import {
  toTestSettingsFormValues,
  type TestSettingsUpdatePayload,
} from '@/features/test-manager/lib/to-test-settings-payload'
import type { TestSettingsData } from '@/features/test-manager/schema/step-2-settings.schema'
import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'

export type TestSettingsRecord = {
  id: string
  settings: TestSettingsData
  payload: TestSettingsUpdatePayload
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function assertApiSuccess(payload: unknown, fallbackMessage: string) {
  const root = asRecord(payload)
  if (root?.success === false) {
    throw new Error(asString(root.message) || fallbackMessage)
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function unwrapSettingsRecord(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload)
  if (!root) return null

  if (root.success === false) {
    const message = asString(root.message)?.toLowerCase() ?? ''
    if (message.includes('not found')) return null
    throw new Error(asString(root.message) || 'Unable to load test settings')
  }

  if (root.data === null) return null

  const nested = asRecord(root.data)
  const record = nested ?? root
  const id = asString(record.id)

  if (!id) return null

  return record
}

function toClockFormat(value: unknown): TestSettingsUpdatePayload['clockFormat'] {
  return value === 'hh_mm' || value === 'hh-mm' ? 'hh_mm' : 'mm_ss'
}

function toSectionQuestionNumbering(
  value: unknown,
): TestSettingsUpdatePayload['sectionQuestionNumbering'] {
  return value === 'by_section' || value === 'by-section' ? 'by_section' : 'continuous'
}

function normalizeSettings(record: Record<string, unknown>): TestSettingsRecord {
  const id = asString(record.id)
  if (!id) throw new Error('Test settings response is missing an id')

  const payload: TestSettingsUpdatePayload = {
    groupQuestionsBySubjectArea: asBoolean(record.groupQuestionsBySubjectArea, false),
    groupQuestionsByTopic: asBoolean(record.groupQuestionsByTopic, false),
    sectionQuestionNumbering: toSectionQuestionNumbering(record.sectionQuestionNumbering),
    randomizeQuestionOrderWithinTopics: asBoolean(record.randomizeQuestionOrderWithinTopics, false),
    randomizeAnswerOptions: asBoolean(record.randomizeAnswerOptions, false),
    isAllQuestionsMandatory: asBoolean(record.isAllQuestionsMandatory, false),
    showCorrectAnswerAfterAttempt: asBoolean(record.showCorrectAnswerAfterAttempt, false),
    enablePartialCredit: asBoolean(record.enablePartialCredit, false),
    enableGenericPlugin: asBoolean(record.enableGenericPlugin, false),
    showInternetSpeed: asBoolean(record.showInternetSpeed, false),
    enablePartialMarking: asBoolean(record.enablePartialMarking, false),
    enableScientificCalculator: asBoolean(record.enableScientificCalculator, false),
    enableActivityLog: asBoolean(record.enableActivityLog, false),
    showIncorrectWordsTyped: asBoolean(record.showIncorrectWordsTyped, false),
    enableBackspace: asBoolean(record.enableBackspace, false),
    allowQuestionNavigation: asBoolean(record.allowQuestionNavigation, false),
    showMarksDuringTest: asBoolean(record.showMarksDuringTest, false),
    enableMultipleLanguages: asBoolean(record.enableMultipleLanguages, false),
    showQuestionInSingleLine: asBoolean(record.showQuestionInSingleLine, false),
    showDefaultCalculator: asBoolean(record.showDefaultCalculator, false),
    enableOfflineMode: asBoolean(record.enableOfflineMode, false),
    enableSecureBrowser: asBoolean(record.enableSecureBrowser, false),
    isTestTimeBound: asBoolean(record.isTestTimeBound, true),
    clockFormat: toClockFormat(record.clockFormat),
    enableSections: asBoolean(record.enableSections, false),
    showPersonalizedMessage: asBoolean(record.showPersonalizedMessage, true),
    passFeedbackMessage: asString(record.passFeedbackMessage) ?? '',
    failFeedbackMessage: asString(record.failFeedbackMessage) ?? '',
    submissionMessage: asString(record.submissionMessage) ?? '',
    enableCandidateFeedback: asBoolean(record.enableCandidateFeedback, false),
  }

  return {
    id,
    payload,
    settings: toTestSettingsFormValues(payload),
  }
}

export function extractTestSettingsId(payload: unknown): string | null {
  const root = asRecord(payload)
  if (!root) return null

  const nested = asRecord(root.data)
  const nestedData = asRecord(nested?.data)

  return (
    asString(root.id) ??
    asString(nested?.id) ??
    asString(nestedData?.id) ??
    asString(root.testSettingsId) ??
    asString(nested?.testSettingsId) ??
    null
  )
}

export async function fetchTestSettingsByTestId(testId: string): Promise<TestSettingsRecord | null> {
  if (useMockApi) {
    await delay(200)
    return null
  }

  try {
    const payload = await apiClient<unknown>(`/test-settings/test/${encodeURIComponent(testId)}`)
    const record = unwrapSettingsRecord(payload)
    return record ? normalizeSettings(record) : null
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }

    throw error
  }
}
