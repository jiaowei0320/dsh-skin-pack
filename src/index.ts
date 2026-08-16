/**
 * dsh-skin-pack — host half.
 *
 * Three roles:
 * 1. The plugin row must resolve a real module for the Cordis Loader; the
 *    browser work (skins) is served as lib/client.js via the `dsh.client`
 *    declaration.
 * 2. A tiny account endpoint for the browser badge: GET
 *    /api/dsh-account/balance proxies DeepSeek's `GET /user/balance` using the
 *    managed API key, so the key never reaches the browser. Same key source
 *    and base-URL handling as @deepseek-ai/dsh-llm-deepseek.
 * 3. GET /api/dsh-account/tokens7d folds the last 7 days of token usage out
 *    of the persisted session logs (the same assistant/message `usage` the
 *    token meter reads), so no extra DeepSeek dashboard token is needed.
 */
import type { ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { credentialRef } from '@deepseek-ai/dsh-credentials'

const DEFAULT_API_KEY_ENV = 'DEEPSEEK_API_KEY'
const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const BASE_URL_ENV = 'DEEPSEEK_BASE_URL'
const CACHE_TTL_MS = 30_000
/** The 7-day window for the token-usage fold. */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1_000

export const name = 'dsh-skin-pack'
export const inject = ['webServer']

/** Normalized balance payload served to the browser (JSON-safe). */
export interface BalancePayload {
  ok: boolean
  available?: boolean
  currency?: string
  total?: string
  granted?: string
  toppedUp?: string
  error?: string
}

/** Normalized 7-day token-usage payload (JSON-safe). */
export interface Tokens7dPayload {
  ok: boolean
  /** Summed tokens over the trailing 7-day window. */
  tokens?: number
  /** Source of the figure: 'sessions' when folded from local session logs. */
  source?: 'sessions'
  error?: string
}

/** The usage record carried by persisted assistant/message events. */
interface TokenUsageRecord {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

/** Raw DeepSeek /user/balance response shape. */
interface DeepSeekBalanceResponse {
  is_available?: boolean
  balance_infos?: Array<{
    currency?: string
    total_balance?: string
    granted_balance?: string
    topped_up_balance?: string
  }>
}

/** Module-level short-TTL cache keyed by API key (no secrets on the wire). */
const cache = new Map<string, { fetchedAt: number; payload: BalancePayload }>()

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/dsh-account/balance',
    handler: async (_req, res) => {
      const payload = await loadBalance(ctx)
      writeJson(res, payload.ok ? 200 : 502, payload)
    },
  }), 'dsh-skin-pack: account balance route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/dsh-account/tokens7d',
    handler: async (_req, res) => {
      const payload = await loadTokens7d(ctx)
      writeJson(res, payload.ok ? 200 : 502, payload)
    },
  }), 'dsh-skin-pack: 7-day token route')
  console.log('[dsh-skin-pack] host half loaded (skins run in the browser)')
}

/** Resolve the API key exactly like the DeepSeek LLM adapter: managed
 * credentials first, then the launch environment. */
async function resolveApiKey(ctx: Context): Promise<string | null> {
  const ref = credentialRef(DEFAULT_API_KEY_ENV)
  try {
    const credentials = ctx.get('credentials')
    if (credentials !== undefined) {
      const hit = await credentials.resolve(ref)
      if (hit !== undefined && hit.value.length > 0) return hit.value
    }
  } catch {
    // fall through to the environment
  }
  const ambient = process.env[DEFAULT_API_KEY_ENV]
  return ambient !== undefined && ambient.length > 0 ? ambient : null
}

async function loadBalance(ctx: Context): Promise<BalancePayload> {
  const apiKey = await resolveApiKey(ctx)
  if (apiKey === null) {
    return { ok: false, error: `no-api-key: set ${DEFAULT_API_KEY_ENV} or store it through the credentials service` }
  }
  const cached = cache.get(apiKey)
  if (cached !== undefined && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.payload
  const payload = await fetchBalance(apiKey)
  cache.set(apiKey, { fetchedAt: Date.now(), payload })
  return payload
}

async function fetchBalance(apiKey: string): Promise<BalancePayload> {
  const base = process.env[BASE_URL_ENV] ?? DEFAULT_BASE_URL
  let response: Response
  try {
    response = await fetch(`${base}/user/balance`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5_000),
    })
  } catch (error) {
    return { ok: false, error: `balance request failed: ${String(error)}` }
  }
  if (!response.ok) return { ok: false, error: `balance HTTP ${response.status}` }
  let body: DeepSeekBalanceResponse
  try {
    body = await response.json() as DeepSeekBalanceResponse
  } catch {
    return { ok: false, error: 'balance response was not JSON' }
  }
  const info = body.balance_infos?.[0]
  if (info === undefined) return { ok: false, error: 'balance response missing balance_infos' }
  return {
    ok: true,
    available: body.is_available ?? true,
    currency: info.currency,
    total: info.total_balance,
    granted: info.granted_balance,
    toppedUp: info.topped_up_balance,
  }
}

/**
 * Fold the last 7 days of token usage out of persisted session logs.
 *
 * Reads every materialized session through the `sessionPersistence` seam and
 * sums the `assistant/message` usage records whose event time falls inside the
 * trailing 7-day window. This is the same durable log the token meter reads,
 * so the figure matches the GUI's own accounting without any extra DeepSeek
 * dashboard credential. Failures degrade to `{ ok: false }` — the badge hides
 * rather than breaking the sidebar.
 *
 * Result is cached per session by the log's revision, so repeated calls only
 * re-parse logs that actually changed.
 */
async function loadTokens7d(ctx: Context): Promise<Tokens7dPayload> {
  const persistence = ctx.get('sessionPersistence')
  if (persistence === undefined) {
    return { ok: false, error: 'no session persistence service' }
  }
  const backend = persistence as {
    listSnapshots?: () => Promise<Array<{ header: { id: string }; revision: unknown }>>
    readRaw?: (id: string) => Promise<{ content?: string } | undefined>
  }
  // Call as METHODS, never detached: both are class methods whose bodies use
  // `this` (listSnapshots → listArtifacts; readRaw → ensureRootEncoding).
  if (typeof backend.listSnapshots !== 'function' || typeof backend.readRaw !== 'function') {
    return { ok: false, error: 'session persistence lacks list/readRaw' }
  }
  const cutoff = Date.now() - SEVEN_DAYS_MS
  let snapshots: Array<{ header: { id: string }; revision: unknown }>
  try {
    snapshots = await backend.listSnapshots()
  } catch (error) {
    return { ok: false, error: `list failed: ${String(error)}` }
  }
  let tokens = 0
  for (const snapshot of snapshots) {
    const id = snapshot.header.id
    const revision = snapshot.revision
    const cached = tokenCache.get(id)
    if (cached !== undefined && cached.revision === revision) {
      tokens += cached.tokens
      continue
    }
    let content: string | undefined
    try {
      const raw = await backend.readRaw(id)
      content = raw?.content
    } catch {
      // one unreadable session must not fail the whole fold
    }
    if (content === undefined) continue
    const total = foldSessionTokens(content, cutoff)
    tokenCache.set(id, { revision, tokens: total })
    tokens += total
  }
  return { ok: true, tokens, source: 'sessions' }
}

/** Per-session fold cache: id -> { revision, summed tokens }. */
const tokenCache = new Map<string, { revision: unknown; tokens: number }>()

/** Sum the assistant/message usage records on or after `cutoff` in one log. */
function foldSessionTokens(content: string, cutoff: number): number {
  let total = 0
  for (const line of content.split('\n')) {
    if (line === '') continue
    let event: { type?: string; time?: number; data?: { usage?: TokenUsageRecord } }
    try {
      event = JSON.parse(line) as typeof event
    } catch {
      continue
    }
    if (event?.type !== 'assistant/message') continue
    if (typeof event.time !== 'number' || event.time < cutoff) continue
    const usage = event.data?.usage
    if (usage === undefined) continue
    total += finite(usage.inputTokens) + finite(usage.outputTokens)
      + finite(usage.cacheReadTokens) + finite(usage.cacheWriteTokens)
  }
  return total
}

/** Coerce a possibly-absent number to a finite number, or 0. */
function finite(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function writeJson(res: ServerResponse, status: number, payload: BalancePayload | Tokens7dPayload): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}
