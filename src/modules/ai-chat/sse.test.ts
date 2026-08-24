import { describe, expect, it } from 'vitest'
import { consumeOpenAiSse } from './sse'

describe('consumeOpenAiSse', () => {
  it('保留跨 chunk 的 JSON 并在下一段完整解析', () => {
    const first = consumeOpenAiSse('', 'data: {"choices":[{"delta":{"content":"你')
    expect(first.contents).toEqual([])
    expect(first.buffer).not.toBe('')

    const second = consumeOpenAiSse(first.buffer, '好"}}]}\n\n')
    expect(second.contents).toEqual(['你好'])
    expect(second.buffer).toBe('')
  })

  it('识别 DONE 并忽略非 data 行', () => {
    const result = consumeOpenAiSse('', 'event: ping\ndata: [DONE]\n')
    expect(result.done).toBe(true)
    expect(result.contents).toEqual([])
  })

  it('一次返回多个 token', () => {
    const result = consumeOpenAiSse(
      '',
      'data: {"choices":[{"delta":{"content":"A"}}]}\ndata: {"choices":[{"delta":{"content":"B"}}]}\n',
    )
    expect(result.contents).toEqual(['A', 'B'])
  })
})
