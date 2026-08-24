import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('theme', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.style.colorScheme = ''
  })

  it('在应用挂载前恢复暗色主题', async () => {
    localStorage.setItem('theme', 'dark')
    const { initializeTheme } = await import('./theme')
    initializeTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('切换主题并持久化', async () => {
    localStorage.setItem('theme', 'light')
    const { initializeTheme, useTheme } = await import('./theme')
    initializeTheme()
    useTheme().toggleTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
