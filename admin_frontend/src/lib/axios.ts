import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { getLoginPath, isAuthPath } from '@/lib/workspace-url'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

function requestUrl(config?: InternalAxiosRequestConfig) {
  return config?.url ?? ''
}

function isPublicAuthRequest(config?: InternalAxiosRequestConfig) {
  const url = requestUrl(config)
  return (
    url.includes('/login') ||
    url.includes('/verify-workspace') ||
    url.includes('/forgot-password')
  )
}

function isLogoutRequest(config?: InternalAxiosRequestConfig) {
  return requestUrl(config).includes('/auth/logout')
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  const workspace = useWorkspaceStore.getState().workspace

  if (token && !isPublicAuthRequest(config)) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (workspace) {
    config.headers['X-Workspace-Id'] = workspace.id
    config.headers['X-Workspace-Slug'] = workspace.slug
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type')
    } else {
      delete (config.headers as { 'Content-Type'?: string })['Content-Type']
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !isPublicAuthRequest(error.config) && !isLogoutRequest(error.config)) {
      useAuthStore.getState().logout()

      const current = window.location.pathname + window.location.search
      const redirect = encodeURIComponent(current)

      if (!isAuthPath(window.location.pathname)) {
        window.location.assign(`${getLoginPath()}?redirect=${redirect}`)
      }
    }

    return Promise.reject(error)
  },
)

function readMessage(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (Array.isArray(value) && value.length) {
    const parts = value
      .map((item) => readMessage(item))
      .filter((item): item is string => Boolean(item))
    return parts.length > 0 ? parts.join('. ') : undefined
  }
  if (!value || typeof value !== 'object') return undefined

  const record = value as Record<string, unknown>
  if (typeof record.message === 'string' && record.message.trim()) return record.message.trim()
  if (typeof record.error === 'string' && record.error.trim()) return record.error.trim()
  if (Array.isArray(record.errors) && record.errors.length) {
    const fromErrors = readMessage(record.errors)
    if (fromErrors) return fromErrors
  }
  if (record.data != null) {
    const nested = readMessage(record.data)
    if (nested) return nested
  }

  return undefined
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return readMessage(error.response?.data) || error.message
  }

  if (error instanceof Error) return error.message
  return 'Something went wrong'
}
