import { ref } from 'vue'

export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

export type ToastType = ToastItem['type']

/** 全局 toast 列表（单例） */
export const toasts = ref<ToastItem[]>([])

let seed = 0

/** 弹出一条 toast，默认 3s 后自动消失 */
export function toast(message: string, type: ToastType = 'info', duration = 3000) {
  const id = ++seed
  toasts.value.push({ id, message, type })
  window.setTimeout(() => dismissToast(id), duration)
}

/** 手动关闭指定 toast */
export function dismissToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}
