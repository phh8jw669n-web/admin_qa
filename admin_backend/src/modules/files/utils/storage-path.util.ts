export const INVALID_STORAGE_PATH_MESSAGE = 'Invalid file path';

export function isSafeStoragePath(value: string): boolean {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

  if (!normalized) {
    return false;
  }

  return normalized.split('/').every(
    (segment) =>
      segment.length > 0 && segment !== '.' && segment !== '..',
  );
}
