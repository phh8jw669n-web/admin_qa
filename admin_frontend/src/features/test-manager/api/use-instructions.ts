import { useQuery } from '@tanstack/react-query'

import { fetchInstructions } from './fetch-instructions'

export const instructionsQueryKey = ['instructions'] as const

export function useInstructions() {
  return useQuery({
    queryKey: instructionsQueryKey,
    queryFn: fetchInstructions,
  })
}
