export type TenantConfig = {
  terminology: {
    candidate: string
    group: string
    course: string
  }
  theme: {
    primary: string
    secondary: string
    logo: string
  }
}

export const defaultTenantConfig: TenantConfig = {
  terminology: {
    candidate: 'Candidate',
    group: 'Group',
    course: 'Course',
  },
  theme: {
    primary: '#0D9488',
    secondary: '#0f172a',
    logo: '',
  },
}

function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace('#', '')
  if (value.length === 3) {
    return [...value].map((char) => Number.parseInt(char + char, 16)) as [number, number, number]
  }
  if (value.length === 6) {
    return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) as [
      number,
      number,
      number,
    ]
  }
  return null
}

function contrastForeground(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#ffffff'
  const [r, g, b] = rgb.map((channel) => channel / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.55 ? '#0f172a' : '#ffffff'
}

export function applyTenantTheme(config: TenantConfig) {
  const primary = config.theme.primary?.trim() || defaultTenantConfig.theme.primary
  const secondary = config.theme.secondary?.trim() || defaultTenantConfig.theme.secondary

  document.documentElement.style.setProperty('--primary', primary)
  document.documentElement.style.setProperty('--primary-foreground', contrastForeground(primary))
  document.documentElement.style.setProperty('--ring', primary)
  document.documentElement.style.setProperty('--secondary', secondary)
  document.documentElement.style.setProperty(
    '--secondary-foreground',
    contrastForeground(secondary),
  )
}

export function resetTenantTheme() {
  document.documentElement.style.removeProperty('--primary')
  document.documentElement.style.removeProperty('--primary-foreground')
  document.documentElement.style.removeProperty('--ring')
  document.documentElement.style.removeProperty('--secondary')
  document.documentElement.style.removeProperty('--secondary-foreground')
}
