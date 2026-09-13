import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const themeKey = 'taskflow-theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getPreferredTheme(): Theme {
  const stored = localStorage.getItem(themeKey)
  if (stored === 'light' || stored === 'dark') return stored
  return media().matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getPreferredTheme)

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])

  useEffect(() => {
    if (localStorage.getItem(themeKey)) return
    const query = media()
    const listener = (event: MediaQueryListEvent) => setThemeState(event.matches ? 'dark' : 'light')
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(themeKey, next)
    setThemeState(next)
  }

  return { theme, toggleTheme }
}
