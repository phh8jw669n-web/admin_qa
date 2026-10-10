export function parseCommaSeparated(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function trimLowercase(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function containsNullCharacter(
  value: unknown,
  seen = new WeakSet<object>(),
): boolean {
  if (typeof value === 'string') {
    return value.includes('\0');
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.some((item) => containsNullCharacter(item, seen));
  }

  return Object.values(value).some((item) => containsNullCharacter(item, seen));
}

