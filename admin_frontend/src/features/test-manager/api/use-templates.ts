import { useQuery } from '@tanstack/react-query'

import { fetchTemplates } from './fetch-templates'

export const templatesQueryKey = ['templates'] as const

export function useTemplates() {
  return useQuery({
    queryKey: templatesQueryKey,
    queryFn: fetchTemplates,
  })
}
