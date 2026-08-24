import { describe, expect, it, vi } from 'vitest'
import { createRequestDeduper } from './request-deduper'

describe('createRequestDeduper', () => {
  it('复用同一个进行中请求', async () => {
    let resolveRequest!: (value: number) => void
    const task = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveRequest = resolve
        }),
    )
    const deduper = createRequestDeduper<number>()

    const first = deduper.run(task)
    const second = deduper.run(task)
    expect(task).toHaveBeenCalledTimes(1)

    resolveRequest(42)
    await expect(first).resolves.toBe(42)
    await expect(second).resolves.toBe(42)
  })

  it('force 会启动新请求', async () => {
    const task = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    const deduper = createRequestDeduper<number>()

    await expect(deduper.run(task)).resolves.toBe(1)
    await expect(deduper.run(task, true)).resolves.toBe(2)
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('进行中时 force 也复用当前请求，避免旧响应覆盖刷新结果', async () => {
    let resolveRequest!: (value: number) => void
    const task = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveRequest = resolve
        }),
    )
    const deduper = createRequestDeduper<number>()

    const first = deduper.run(task)
    const forced = deduper.run(task, true)
    expect(task).toHaveBeenCalledTimes(1)
    resolveRequest(7)
    await expect(Promise.all([first, forced])).resolves.toEqual([7, 7])
  })

  it('clear 后允许新用户立即发起自己的请求', async () => {
    const resolvers: Array<(value: number) => void> = []
    const task = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          resolvers.push(resolve)
        }),
    )
    const deduper = createRequestDeduper<number>()

    const previousUserRequest = deduper.run(task)
    deduper.clear()
    const nextUserRequest = deduper.run(task)
    expect(task).toHaveBeenCalledTimes(2)

    resolvers[0](1)
    resolvers[1](2)
    await expect(previousUserRequest).resolves.toBe(1)
    await expect(nextUserRequest).resolves.toBe(2)
  })
})
