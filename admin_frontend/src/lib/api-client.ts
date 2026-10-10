import type { AxiosRequestConfig } from 'axios'

import { api } from '@/lib/axios'

type RequestOptions = Omit<AxiosRequestConfig, 'url' | 'method' | 'data'> & {
  params?: Record<string, string | number | boolean | undefined>
  body?: unknown
  method?: AxiosRequestConfig['method']
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, method = 'GET', ...rest } = options

  const response = await api.request<T>({
    url: path,
    method,
    params,
    data: body,
    ...rest,
  })

  return response.data
}
