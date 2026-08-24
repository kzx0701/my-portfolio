import { readonly, ref } from 'vue'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const darkMode = ref(false)
let initialized = false

function applyTheme(theme: Theme) {
  darkMode.value = theme === 'dark'
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', darkMode.value)
    document.documentElement.style.colorScheme = theme
  }
}

export function initializeTheme() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  const saved = window.localStorage.getItem(STORAGE_KEY)
  const theme: Theme =
    saved === 'dark' || saved === 'light'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
  applyTheme(theme)
}

export function useTheme() {
  function toggleTheme() {
    const next: Theme = darkMode.value ? 'light' : 'dark'
    applyTheme(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return { darkMode: readonly(darkMode), toggleTheme }
}
