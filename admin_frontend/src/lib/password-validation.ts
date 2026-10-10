export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export function validatePassword(value: string): string | null {
  if (!value) return 'Password is required.'
  if (value.length < 8) return 'Password must be at least 8 characters.'
  if (!PASSWORD_REGEX.test(value)) {
    return 'Password must include an uppercase letter, a lowercase letter, a number, and a special character.'
  }
  return null
}
