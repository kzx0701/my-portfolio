/** 只允许可安全打开的新窗口协议，拒绝 javascript:、data: 等可执行 URL。 */
export function normalizeExternalUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function openExternalUrl(value: string | null | undefined): boolean {
  const url = normalizeExternalUrl(value)
  if (!url || typeof window === 'undefined') return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
