import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.112.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function firstNamedKey(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const values = Object.values(JSON.parse(raw))
    return typeof values[0] === 'string' ? values[0] : null
  } catch {
    return null
  }
}

function resolveEndpoint(endpointUrl: string | null, baseUrl: string | null): string {
  const explicit = endpointUrl?.trim().replace(/\/+$/, '')
  const base = baseUrl?.trim().replace(/\/+$/, '')
  const endpoint =
    explicit ||
    (base
      ? /\/chat\/completions$/i.test(base)
        ? base
        : /\/v\d+$/i.test(base)
          ? `${base}/chat/completions`
          : `${base}/v1/chat/completions`
      : '')

  if (!endpoint) throw new Error('未配置 Chat API 地址')
  const url = new URL(endpoint)
  if (url.protocol !== 'https:') throw new Error('Chat API 地址必须使用 HTTPS')
  const hostname = url.hostname.toLowerCase()
  const blockedHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  if (blockedHost) throw new Error('Chat API 地址不能指向本地或私有网络')
  return url.toString()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const publishableKey =
      firstNamedKey(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')) ??
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
      Deno.env.get('SUPABASE_ANON_KEY') ??
      ''
    const secretKey =
      firstNamedKey(Deno.env.get('SUPABASE_SECRET_KEYS')) ??
      Deno.env.get('SUPABASE_SECRET_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      ''
    const authorization = req.headers.get('Authorization') ?? ''

    if (!supabaseUrl || !publishableKey || !secretKey || !authorization) {
      return jsonResponse({ error: '服务配置或登录状态无效' }, 401)
    }

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return jsonResponse({ error: '登录状态已失效' }, 401)

    const payload = await req.json()
    const modelId = typeof payload?.modelId === 'string' ? payload.modelId : ''
    const messages = Array.isArray(payload?.messages) ? payload.messages : []
    if (!modelId || messages.length === 0 || messages.length > 100) {
      return jsonResponse({ error: '对话参数无效' }, 400)
    }
    if (
      !messages.every((message: unknown) => {
        if (!message || typeof message !== 'object') return false
        const value = message as { role?: unknown; content?: unknown }
        return (
          ['user', 'assistant', 'system'].includes(String(value.role)) &&
          typeof value.content === 'string' &&
          value.content.length <= 100_000
        )
      })
    ) {
      return jsonResponse({ error: '消息格式无效或内容过长' }, 400)
    }

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: model, error: modelError } = await admin
      .from('ai_chat_models')
      .select('id, user_id, service_id, secret_id, model_id, protocol, auth_type, endpoint_url, enabled')
      .eq('id', modelId)
      .eq('user_id', userData.user.id)
      .eq('enabled', true)
      .single()
    if (modelError || !model) return jsonResponse({ error: '对话模型不存在或不可用' }, 404)
    if (model.protocol !== 'openai_compatible') return jsonResponse({ error: '暂不支持该对话协议' }, 400)
    if (!model.secret_id) return jsonResponse({ error: '当前模型未绑定密钥' }, 400)

    const [{ data: service }, { data: secret }] = await Promise.all([
      admin
        .from('ai_services')
        .select('id, user_id, base_url, service_type')
        .eq('id', model.service_id)
        .eq('user_id', userData.user.id)
        .single(),
      admin
        .from('ai_secrets')
        .select('id, user_id, service_id, key_value')
        .eq('id', model.secret_id)
        .eq('user_id', userData.user.id)
        .single(),
    ])
    if (!service || !secret?.key_value || secret.service_id !== model.service_id) {
      return jsonResponse({ error: '模型关联的工具或密钥无效' }, 400)
    }

    const endpoint = resolveEndpoint(model.endpoint_url, service.base_url)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const authType = model.auth_type || (service.service_type === 'xiaomi' ? 'api_key' : 'bearer')
    if (authType === 'api_key') headers['api-key'] = secret.key_value
    else headers.Authorization = `Bearer ${secret.key_value}`

    const providerResponse = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: model.model_id, messages, stream: true }),
      signal: req.signal,
    })
    if (!providerResponse.ok || !providerResponse.body) {
      const detail = (await providerResponse.text()).slice(0, 500)
      return jsonResponse(
        {
          error: `模型服务请求失败（${providerResponse.status}）`,
          detail,
        },
        502,
      )
    }

    return new Response(providerResponse.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': providerResponse.headers.get('Content-Type') || 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 代理请求失败'
    return jsonResponse({ error: message }, 500)
  }
})
