import { describe, expect, it } from 'vitest'
import {
  addDaysToKey,
  calendarRange,
  fromDateKey,
  localDayIsoBounds,
  toDateKey,
} from './date'

describe('worklog date helpers', () => {
  it('uses local calendar dates instead of UTC date slices', () => {
    const date = new Date(2026, 7, 25, 0, 30)
    expect(toDateKey(date)).toBe('2026-08-25')
    expect(toDateKey(fromDateKey('2026-08-25'))).toBe('2026-08-25')
  })

  it('builds a stable Monday-first six-week calendar range', () => {
    const range = calendarRange(new Date(2026, 7, 1))
    expect(range.start).toBe('2026-07-27')
    expect(range.end).toBe('2026-09-06')
    expect(range.days).toHaveLength(42)
  })

  it('handles local day boundaries and date arithmetic', () => {
    expect(addDaysToKey('2026-08-25', -6)).toBe('2026-08-19')
    const bounds = localDayIsoBounds('2026-08-25')
    expect(new Date(bounds.end).getTime() - new Date(bounds.start).getTime()).toBe(24 * 60 * 60 * 1000)
  })
})
