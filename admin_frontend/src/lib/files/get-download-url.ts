import { apiClient } from '@/lib/api-client'

export const FILE_DOWNLOAD_URL_EXPIRES_IN = 86_400

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function findHttpUrl(value: unknown, depth = 0): string | undefined {
  if (depth > 6) return undefined

  if (typeof value === 'string') {
    const text = value.trim()
    if (/^https?:\/\//i.test(text)) return text
    return undefined
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findHttpUrl(item, depth + 1)
      if (url) return url
    }
    return undefined
  }

  const record = asRecord(value)
  if (!record) return undefined

  const preferred = [
    'downloadUrl',
    'signedUrl',
    'signedURL',
    'presignedUrl',
    'preSignedUrl',
    'fileUrl',
    'url',
    'href',
    'location',
  ]

  for (const key of preferred) {
    const url = findHttpUrl(record[key], depth + 1)
    if (url) return url
  }

  for (const nested of Object.values(record)) {
    const url = findHttpUrl(nested, depth + 1)
    if (url) return url
  }

  return undefined
}

function extractDownloadUrl(payload: unknown): string | undefined {
  if (typeof payload === 'string') {
    const text = asString(payload)
    if (text && /^https?:\/\//i.test(text)) return text
    return undefined
  }

  const root = asRecord(payload)
  if (!root) return undefined

  if (root.success === false) {
    throw new Error(asString(root.message) || 'Unable to get file download URL')
  }

  return findHttpUrl(payload)
}

export async function getFileDownloadUrl(
  key: string,
  expiresIn: number = FILE_DOWNLOAD_URL_EXPIRES_IN,
  signal?: AbortSignal,
): Promise<string> {
  const payload = await apiClient<unknown>('/files/download-url', {
    method: 'POST',
    body: { key, expiresIn: expiresIn ?? FILE_DOWNLOAD_URL_EXPIRES_IN },
    signal,
  })

  const url = extractDownloadUrl(payload)

  if (!url) {
    throw new Error('Invalid download URL response')
  }

  return url
}
