import { describe, expect, it } from 'vitest'
import { normalizeExternalUrl } from './external-url'

describe('normalizeExternalUrl', () => {
  it('接受 http 与 https', () => {
    expect(normalizeExternalUrl('https://example.com/path')).toBe('https://example.com/path')
    expect(normalizeExternalUrl('http://example.com')).toBe('http://example.com/')
  })

  it('拒绝可执行或非法协议', () => {
    expect(normalizeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeExternalUrl('data:text/html,test')).toBeNull()
    expect(normalizeExternalUrl('not-a-url')).toBeNull()
  })
})
