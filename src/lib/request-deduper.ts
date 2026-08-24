export interface RequestDeduper<T> {
  run(task: () => Promise<T>, force?: boolean): Promise<T>
  clear(): void
}

/** 复用同一资源的进行中请求；强制刷新只绕过数据缓存，不制造并发网络请求。 */
export function createRequestDeduper<T>(): RequestDeduper<T> {
  let inFlight: Promise<T> | null = null

  return {
    clear() {
      inFlight = null
    },
    async run(task, _force = false) {
      if (inFlight) return inFlight
      const request = task()
      inFlight = request
      try {
        return await request
      } finally {
        if (inFlight === request) inFlight = null
      }
    },
  }
}
