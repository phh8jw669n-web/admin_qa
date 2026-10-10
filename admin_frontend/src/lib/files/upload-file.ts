import type { AxiosProgressEvent } from 'axios'

import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'

export const QUESTION_IMAGE_FOLDER = 'questions'
export const MAX_EDITOR_IMAGE_BYTES = 8 * 1024 * 1024

export type UploadedFile = {
  key: string
  url: string
}

type UploadFileOptions = {
  folderType?: string
  filename?: string
  signal?: AbortSignal
  onUploadProgress?: (event: AxiosProgressEvent) => void
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function findKey(value: unknown, depth = 0): string | undefined {
  if (depth > 6) return undefined

  if (typeof value === 'string' && value.trim() && !/^https?:\/\//i.test(value.trim())) {
    return depth === 0 ? undefined : value.trim()
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const key = findKey(item, depth + 1)
      if (key) return key
    }
    return undefined
  }

  const record = asRecord(value)
  if (!record) return undefined

  const keyNames = [
    'key',
    'Key',
    'fileKey',
    'objectKey',
    's3Key',
    'storageKey',
    'filePath',
    'path',
  ]

  for (const name of keyNames) {
    const key = asString(record[name])
    if (key) return key
  }

  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== 'object') continue
    const key = findKey(nested, depth + 1)
    if (key) return key
  }

  return undefined
}

function extractKey(payload: unknown): string | undefined {
  const root = asRecord(payload)
  if (root?.success === false) return undefined

  const fromTree = findKey(payload)
  if (fromTree) return fromTree

  const data = asString(root?.data)
  if (data && !/^https?:\/\//i.test(data)) return data

  return undefined
}

export async function uploadFile(file: File, options: UploadFileOptions = {}): Promise<UploadedFile> {
  if (useMockApi) {
    return {
      key: `mock/${file.name}`,
      url: URL.createObjectURL(file),
    }
  }

  const body = new FormData()
  body.append('file', file)
  body.append('folderType', options.folderType ?? QUESTION_IMAGE_FOLDER)
  body.append('filename', options.filename ?? file.name)

  const payload = await apiClient<unknown>('/files/upload', {
    method: 'POST',
    body,
    signal: options.signal,
    onUploadProgress: options.onUploadProgress,
  })

  const root = asRecord(payload)
  if (root?.success === false) {
    throw new Error(asString(root.message) || 'Unable to upload file')
  }

  const key = extractKey(payload)
  if (!key) {
    throw new Error('File upload did not return a key')
  }

  return { key, url: '' }
}

export async function uploadEditorImage(
  file: File,
  options: Omit<UploadFileOptions, 'folderType'> = {},
): Promise<UploadedFile> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file')
  }

  if (file.size > MAX_EDITOR_IMAGE_BYTES) {
    throw new Error('Image is larger than 8 MB')
  }

  return uploadFile(file, { ...options, folderType: QUESTION_IMAGE_FOLDER })
}
