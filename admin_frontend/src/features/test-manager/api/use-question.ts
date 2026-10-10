import { useQuery } from '@tanstack/react-query'

import { fetchQuestionById } from '@/features/test-manager/api/fetch-questions'

export function questionQueryKey(id: string) {
  return ['questions', id] as const
}

export function useQuestion(id: string | null) {
  return useQuery({
    queryKey: questionQueryKey(id ?? ''),
    queryFn: () => fetchQuestionById(id!),
    enabled: Boolean(id),
  })
}
