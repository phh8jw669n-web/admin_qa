import type { Workspace } from '@/features/workspace/types'

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 'ws-acme',
    slug: 'acme',
    name: 'Acme University',
    companyToken: 'mock-company-token-acme',
    theme: {
      primary: '#0D9488',
      secondary: '#0f172a',
      logo: '',
    },
  },
  {
    id: 'ws-demo',
    slug: 'demo',
    name: 'Demo Workspace',
    companyToken: 'mock-company-token-demo',
    theme: {
      primary: '#4F46E5',
      secondary: '#0f172a',
      logo: '',
    },
  },
]
