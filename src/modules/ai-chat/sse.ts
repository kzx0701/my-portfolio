export interface SseChunkResult {
  buffer: string
  contents: string[]
  done: boolean
}

/**
 * 消费 OpenAI-compatible SSE 文本；保留跨网络分片的残行，避免 JSON 被截断后丢字。
 */
export function consumeOpenAiSse(previousBuffer: string, chunk: string): SseChunkResult {
  const lines = `${previousBuffer}${chunk}`.split('\n')
  const buffer = lines.pop() ?? ''
  const contents: string[] = []
  let done = false

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '').trim()
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (data === '[DONE]') {
      done = true
      break
    }
    try {
      const content = JSON.parse(data).choices?.[0]?.delta?.content
      if (typeof content === 'string') contents.push(content)
    } catch {
      // 单个格式异常的完整事件不影响后续流；跨分片内容会留在 buffer 中。
    }
  }

  return { buffer, contents, done }
}
