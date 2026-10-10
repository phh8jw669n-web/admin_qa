import { useQuery } from '@tanstack/react-query'

import { fetchQuestionsByTestId } from '@/features/test-manager/api/fetch-questions'

export function questionsQueryKey(testId: string) {
  return ['questions', 'test', testId] as const
}

export function useQuestions(testId: string | null, enabled = true) {
  return useQuery({
    queryKey: questionsQueryKey(testId ?? ''),
    queryFn: () => fetchQuestionsByTestId(testId!),
    enabled: Boolean(testId) && enabled,
  })
}
