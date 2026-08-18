/**
 * AI 模型 API 余额查询引擎（浏览器直连，无需服务端代理）
 *
 * 原理：官方模型平台（DeepSeek / 智谱等）的余额接口使用「API Key」鉴权
 * （Authorization: Bearer <key>），与 WorkBuddy 的网页会话鉴权本质不同——
 * 实测这些接口响应头带 access-control-allow-origin（CORS 放行），浏览器可直接调用。
 * 中转站（One API/New API 系）亦提供 OpenAI 兼容的 /dashboard/billing/usage 接口，
 * 可通过自定义余额接口 URL 接入。
 */

export interface BalanceQueryResult {
  ok: boolean
  /** 解析出的余额（成功且可解析时非 null） */
  balance: number | null
  /** 失败原因（HTTP 状态 / 网络错误等） */
  error?: string
  /** 原始响应（截断，供排查） */
  raw?: string
}

/** 预设平台（apiBase 不含尾斜杠） */
export const BALANCE_PROVIDERS: Record<string, { label: string; apiBase: string; balancePath: string }> = {
  deepseek: {
    label: 'DeepSeek',
    apiBase: 'https://api.deepseek.com',
    balancePath: '/user/balance',
  },
  zhipu: {
    label: '智谱 GLM',
    apiBase: 'https://open.bigmodel.cn/api/paas/v4',
    balancePath: '/balance',
  },
  // 小米 MiMo：余额接口在控制台（platform.xiaomimimo.com/api/v1/balance），
  // 需登录 Cookie 鉴权（非 API Key）且无 CORS → 浏览器无法自动查询，balancePath 置空（手动维护余额）
  xiaomi: {
    label: '小米 MiMo',
    apiBase: 'https://api.xiaomimimo.com',
    balancePath: '',
  },
}

export const BALANCE_PROVIDER_OPTIONS = [
  ...Object.keys(BALANCE_PROVIDERS).map((key) => ({
    value: key,
    label: BALANCE_PROVIDERS[key].label,
  })),
  { value: 'custom', label: '自定义 / 中转站' },
]

/** 由平台预设生成余额查询 URL；custom 返回自定义 URL */
export function resolveBalanceUrl(provider: string, customUrl?: string | null): string {
  if (provider === 'custom' || provider === 'relay') return customUrl?.trim() || ''
  const p = BALANCE_PROVIDERS[provider]
  return p ? `${p.apiBase}${p.balancePath}` : customUrl?.trim() || ''
}

/** 由平台预设生成 API 地址；custom 返回自定义地址 */
export function resolveApiBase(provider: string, customBase?: string | null): string {
  if (provider === 'custom' || provider === 'relay') return customBase?.trim() || ''
  return BALANCE_PROVIDERS[provider]?.apiBase ?? customBase?.trim() ?? ''
}

/**
 * 从余额接口返回体中解析余额数值（兼容主流格式）：
 * - DeepSeek: { balance_infos: [{ currency, total_balance, granted_balance, topped_up_balance }] }
 * - 智谱 v4: { balance } 或 { data: [{ available_balance, actual_balance }] }
 * - 小米 MiMo: /v1/usage（结构未知，做宽容字段查找兜底）
 */
export function parseBalance(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>

  // DeepSeek：balance_infos 数组取第一条 total_balance
  if (Array.isArray(d.balance_infos) && d.balance_infos.length > 0) {
    const first = d.balance_infos[0] as Record<string, unknown>
    const v = Number(first?.total_balance)
    if (Number.isFinite(v)) return v
  }

  // 智谱：顶层 balance
  if (typeof d.balance === 'string' || typeof d.balance === 'number') {
    const v = Number(d.balance)
    if (Number.isFinite(v)) return v
  }

  // 智谱：data 数组取第一条 available_balance / actual_balance
  if (Array.isArray(d.data) && d.data.length > 0) {
    const first = d.data[0] as Record<string, unknown>
    const v = Number(first?.available_balance ?? first?.actual_balance)
    if (Number.isFinite(v)) return v
  }

  // 兜底：在对象中递归查找常见余额字段名（兼容小米等未知结构）
  return findBalanceValue(d)
}

/** 常见余额字段名（按优先级），递归查找第一个可解析为数字的 */
const BALANCE_KEYS = [
  'total_balance',
  'available_balance',
  'actual_balance',
  'balance',
  'remaining',
  'remaining_quota',
  'credit',
  'amount',
  'quota',
  'usage_balance',
]

function findBalanceValue(node: unknown, depth = 0): number | null {
  if (!node || typeof node !== 'object' || depth > 6) return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const v = findBalanceValue(item, depth + 1)
      if (v !== null) return v
    }
    return null
  }
  const obj = node as Record<string, unknown>
  for (const key of BALANCE_KEYS) {
    const raw = obj[key]
    if (raw === null || raw === undefined) continue
    if (typeof raw === 'string' || typeof raw === 'number') {
      const v = Number(raw)
      if (Number.isFinite(v)) return v
    }
  }
  for (const value of Object.values(obj)) {
    const v = findBalanceValue(value, depth + 1)
    if (v !== null) return v
  }
  return null
}

/** 查询余额（浏览器直连）；返回解析结果 */
export async function queryBalance(url: string, apiKey: string): Promise<BalanceQueryResult> {
  if (!url) return { ok: false, balance: null, error: '未配置余额查询接口' }
  if (!apiKey) return { ok: false, balance: null, error: '未配置 API Key' }
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    const text = await res.text()
    if (!res.ok) {
      return { ok: false, balance: null, error: `接口返回 HTTP ${res.status}`, raw: text.slice(0, 200) }
    }
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, balance: null, error: '返回内容不是合法 JSON', raw: text.slice(0, 200) }
    }
    const balance = parseBalance(data)
    if (balance === null) {
      return { ok: false, balance: null, error: '无法从返回中解析余额', raw: text.slice(0, 200) }
    }
    return { ok: true, balance, raw: text.slice(0, 200) }
  } catch (e: any) {
    const msg = e?.name === 'TimeoutError' ? '请求超时' : (e?.message ?? '查询失败')
    return { ok: false, balance: null, error: msg }
  }
}
