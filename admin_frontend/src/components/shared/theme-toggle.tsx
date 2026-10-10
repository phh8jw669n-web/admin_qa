import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative border border-input bg-background"
      disabled={!mounted}
    >
      {/* Dark mode → show sun (switch to light). Light mode → show moon (switch to dark). */}
      <Sun
        className={`h-4 w-4 transition-all ${isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all ${isDark ? '-rotate-90 scale-0' : 'rotate-0 scale-100'}`}
      />
    </Button>
  )
}
