import {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  ALLOWED_UPLOAD_EXTENSIONS,
} from '../constants/upload.constants';

const ALLOWED_CONTENT_TYPE_SET = new Set<string>(ALLOWED_UPLOAD_CONTENT_TYPES);
const ALLOWED_EXTENSION_SET = new Set<string>(ALLOWED_UPLOAD_EXTENSIONS);

export function normalizeUploadContentType(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.split(';')[0]?.trim().toLowerCase();
}

export function isAllowedUploadContentType(contentType: string): boolean {
  const normalized = normalizeUploadContentType(contentType);

  return (
    typeof normalized === 'string' && ALLOWED_CONTENT_TYPE_SET.has(normalized)
  );
}

export function isAllowedUploadFileName(fileName: string): boolean {
  const trimmed = fileName.trim();
  const separator = trimmed.lastIndexOf('.');

  if (separator <= 0 || separator === trimmed.length - 1) {
    return false;
  }

  const extension = trimmed.slice(separator + 1).toLowerCase();

  return ALLOWED_EXTENSION_SET.has(extension);
}
