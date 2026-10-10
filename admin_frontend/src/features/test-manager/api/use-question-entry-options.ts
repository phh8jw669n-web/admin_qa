import { useQuery } from '@tanstack/react-query'

import {
  fetchDifficulties,
  fetchLanguages,
  fetchSubjects,
  fetchTopics,
} from '@/features/test-manager/api/fetch-question-entry-options'

export function subjectsQueryKey() {
  return ['subjects'] as const
}

export function topicsQueryKey() {
  return ['topics'] as const
}

export function languagesQueryKey() {
  return ['languages'] as const
}

export function difficultiesQueryKey() {
  return ['difficulties'] as const
}

export function useSubjects() {
  return useQuery({
    queryKey: subjectsQueryKey(),
    queryFn: fetchSubjects,
  })
}

export function useTopics() {
  return useQuery({
    queryKey: topicsQueryKey(),
    queryFn: fetchTopics,
  })
}

export function useLanguages() {
  return useQuery({
    queryKey: languagesQueryKey(),
    queryFn: fetchLanguages,
  })
}

export function useDifficulties() {
  return useQuery({
    queryKey: difficultiesQueryKey(),
    queryFn: fetchDifficulties,
  })
}
