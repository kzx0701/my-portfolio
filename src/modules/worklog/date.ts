const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** 本地日期转 YYYY-MM-DD；不能使用 toISOString，否则东八区凌晨会偏移一天。 */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDateKey(value: string): Date {
  const match = DATE_KEY_RE.exec(value)
  if (!match) return new Date()
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() + amount)
  return result
}

export function addDaysToKey(dateKey: string, amount: number): string {
  return toDateKey(addDays(fromDateKey(dateKey), amount))
}

/** 固定为周一开始、6 周共 42 天，保证月份切换时日历高度不跳动。 */
export function calendarRange(viewDate: Date): { start: string; end: string; days: Date[] } {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const startDate = addDays(first, -mondayOffset)
  const days = Array.from({ length: 42 }, (_, index) => addDays(startDate, index))
  return { start: toDateKey(days[0]), end: toDateKey(days[41]), days }
}

export function localDayIsoBounds(dateKey: string): { start: string; end: string } {
  const start = fromDateKey(dateKey)
  const end = addDays(start, 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

/** 短日期：10月9日 */
export function formatMonthDay(dateKey: string): string {
  const date = fromDateKey(dateKey)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function formatLongDate(dateKey: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(fromDateKey(dateKey))
}

export function formatWeekday(dateKey: string): string {
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(fromDateKey(dateKey))
}
