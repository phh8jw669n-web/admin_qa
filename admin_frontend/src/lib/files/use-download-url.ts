import { useQuery } from '@tanstack/react-query'

import { FILE_DOWNLOAD_URL_EXPIRES_IN, getFileDownloadUrl } from '@/lib/files/get-download-url'

const STALE_TIME_MS = 12 * 60 * 60 * 1000

export function fileDownloadUrlQueryKey(key: string, expiresIn?: number) {
  return ['file-download-url', key, expiresIn ?? FILE_DOWNLOAD_URL_EXPIRES_IN] as const
}

export function useFileDownloadUrl(
  key: string | null | undefined,
  expiresIn: number = FILE_DOWNLOAD_URL_EXPIRES_IN,
) {
  return useQuery({
    queryKey: fileDownloadUrlQueryKey(key ?? '', expiresIn),
    queryFn: () => getFileDownloadUrl(key!, expiresIn),
    enabled: Boolean(key),
    staleTime: STALE_TIME_MS,
    gcTime: STALE_TIME_MS,
  })
}
