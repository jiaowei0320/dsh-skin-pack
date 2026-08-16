/**
 * Smoke test: run host + client halves against fake Cordis ctxs in Node.
 *
 * Host: verifies the /api/dsh-account/balance route is registered and that
 * the handler proxies DeepSeek's /user/balance (mocked fetch) into the
 * normalized payload.
 * Client: verifies skin + settings-row + composer-dock registrations, and the
 * pure fetchAccountBalance() logic (mocked fetch).
 *
 * Run: node scripts/smoke-client.mjs   (after `pnpm run build`; the client
 * half is re-built into .smoke/ by this script).
 */
import { build } from 'esbuild'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SMOKE_DIR = join(ROOT, '.smoke')
const OUT = join(SMOKE_DIR, 'client.cjs')

rmSync(SMOKE_DIR, { recursive: true, force: true })
mkdirSync(SMOKE_DIR, { recursive: true })

// Plain-CJS copy (no __ModuleLoader__ wrapper) so node can import it.
await build({
  entryPoints: { client: join(ROOT, 'src/client/index.tsx') },
  outdir: SMOKE_DIR,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'es2022',
  external: ['react', 'react/jsx-runtime'],
  outExtension: { '.js': '.cjs' },
  logLevel: 'silent',
})

const client = await import(OUT)
const host = await import(join(ROOT, 'lib/index.js'))

let failed = 0
function check(name, cond) {
  console.log(`${cond ? '  ✓' : '  ✗ FAIL'} ${name}`)
  if (!cond) failed += 1
}

console.log('— host: balance + tokens routes —')
{
  const captured = []
  const ctx = {
    webServer: {
      register(route) {
        captured.push(route)
        return () => {}
      },
    },
    get: () => undefined,
    effect(fn) {
      const disposer = fn()
      if (typeof disposer === 'function') disposer()
    },
  }

  process.env.DEEPSEEK_API_KEY = 'test-key'
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      is_available: true,
      balance_infos: [
        { currency: 'CNY', total_balance: '110.00', granted_balance: '10.00', topped_up_balance: '100.00' },
      ],
    }),
  })

  host.apply(ctx)
  check('balance route registered',
    captured.some(r => r.kind === 'exact' && r.path === '/api/dsh-account/balance'))
  check('tokens route registered',
    captured.some(r => r.kind === 'exact' && r.path === '/api/dsh-account/tokens7d'))

  const balanceRoute = captured.find(r => r.path === '/api/dsh-account/balance')
  const tokensRoute = captured.find(r => r.path === '/api/dsh-account/tokens7d')

  const res = { status: 0, headers: null, body: '' }
  res.writeHead = (status, headers) => { res.status = status; res.headers = headers }
  res.end = (body) => { res.body = body }
  await balanceRoute.handler({}, res)
  const payload = JSON.parse(res.body)
  check('balance HTTP 200', res.status === 200)
  check('toppedUp normalized from topped_up_balance', payload.toppedUp === '100.00')
  check('total normalized from total_balance', payload.total === '110.00')
  check('currency carried through', payload.currency === 'CNY')

  // no key → explicit error payload
  delete process.env.DEEPSEEK_API_KEY
  const res2 = { status: 0, headers: null, body: '' }
  res2.writeHead = (status, headers) => { res2.status = status; res2.headers = headers }
  res2.end = (body) => { res2.body = body }
  await balanceRoute.handler({}, res2)
  const payload2 = JSON.parse(res2.body)
  check('no-key → 502 with error', res2.status === 502 && payload2.ok === false && typeof payload2.error === 'string')
  globalThis.fetch = realFetch

  // tokens7d: no persistence service → explicit error (badge hides)
  const res3 = { status: 0, headers: null, body: '' }
  res3.writeHead = (status, headers) => { res3.status = status; res3.headers = headers }
  res3.end = (body) => { res3.body = body }
  await tokensRoute.handler({}, res3)
  const payload3 = JSON.parse(res3.body)
  check('tokens7d without persistence → 502 with error',
    res3.status === 502 && payload3.ok === false && typeof payload3.error === 'string')

  // tokens7d with a mocked persistence seam: folds only the 7-day window.
  const now = Date.now()
  const within = now - 3 * 24 * 60 * 60 * 1_000
  const old = now - 10 * 24 * 60 * 60 * 1_000
  const log = (time, usage) => JSON.stringify({ type: 'assistant/message', time, data: { usage } })
  const ctx2 = {
    ...ctx,
    get: (key) => key === 'sessionPersistence' ? {
      listSnapshots: async () => [
        { header: { id: 'a' }, revision: 'r1' },
        { header: { id: 'b' }, revision: 'r2' },
      ],
      readRaw: async (id) => ({
        content: [
          log(within, { inputTokens: 1_000_000, outputTokens: 500_000, cacheReadTokens: 200_000, cacheWriteTokens: 50_000 }),
          log(old, { inputTokens: 9_999_999, outputTokens: 9_999_999 }),
        ].join('\n'),
      }),
    } : undefined,
  }
  // Re-run apply with the persistence mock so the route closure sees it.
  // Simpler: build a fresh fake ctx where get() returns the mock, then call
  // the captured handler is bound to the first ctx. Instead we exercise the
  // pure logic through a second apply on ctx2 and capture its own routes.
  const captured2 = []
  const webServer2 = {
    register(route) { captured2.push(route); return () => {} },
  }
  host.apply({ ...ctx2, webServer: webServer2 })
  const res4 = { status: 0, headers: null, body: '' }
  res4.writeHead = (status, headers) => { res4.status = status; res4.headers = headers }
  res4.end = (body) => { res4.body = body }
  const t2 = captured2.find(r => r.path === '/api/dsh-account/tokens7d')
  await t2.handler({}, res4)
  const payload4 = JSON.parse(res4.body)
  // Two sessions, each folding the in-window 1.75M (the 10-day-old line is
  // excluded by the window) → 3.5M total.
  check('tokens7d folds in-window usage', payload4.ok === true && payload4.tokens === 3_500_000)
  check('tokens7d reports source sessions', payload4.source === 'sessions')
}

console.log('— client: balance badge pure logic —')
{
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, currency: 'CNY', total: '110.00', granted: '10.00', toppedUp: '100.00' }),
  })
  const state = await client.fetchAccountBalance()
  check('ok state with toppedUp', state.kind === 'ok' && state.toppedUp === '100.00')
  globalThis.fetch = async () => { throw new Error('network down') }
  const failedState = await client.fetchAccountBalance()
  check('fetch failure → error state', failedState.kind === 'error')
}

console.log('— client: tokens7d pure logic —')
{
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, tokens: 1_750_000 }),
  })
  const ok = await client.fetchTokens7d()
  check('ok state with tokens', ok.kind === 'ok' && ok.tokens === 1_750_000)
  globalThis.fetch = async () => ({ ok: false, status: 502, json: async () => ({ ok: false }) })
  const err = await client.fetchTokens7d()
  check('http failure → error state', err.kind === 'error')
}

console.log('— client: registrations —')
{
  const listeners = new Map()
  const themeListeners = new Set()
  const themes = [
    { id: 'light', colorScheme: 'light', tokens: {} },
    { id: 'dark', colorScheme: 'dark', tokens: {} },
  ]
  let preference = 'system'
  let revision = 0
  const snapshot = () => ({ preference, themes: [...themes], active: themes[0], revision })
  const emit = () => {
    revision += 1
    for (const cb of [...themeListeners]) cb(snapshot())
  }
  const theme = {
    getTheme: snapshot,
    setTheme(id) {
      if (!themes.some(t => t.id === id)) throw new Error(`theme "${id}" is not registered`)
      if (preference === id) return
      preference = id
      emit()
    },
    register(def) {
      if (themes.some(t => t.id === def.id)) throw new Error(`theme "${def.id}" is already registered`)
      themes.push(def)
      emit()
      return () => {
        const i = themes.findIndex(t => t.id === def.id)
        if (i >= 0) themes.splice(i, 1)
        emit()
      }
    },
    overrideTokens() { return () => {} },
  }
  const slotFactories = []
  const registrations = []
  const slots = {
    inject(name, factory) {
      slotFactories.push({ name, factory })
      return () => {}
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  }
  const effectDisposers = []
  const ctx = {
    theme,
    slots,
    on(event, cb) {
      if (event === 'theme/change') {
        themeListeners.add(cb)
        return () => themeListeners.delete(cb)
      }
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(cb)
      return () => listeners.get(event).delete(cb)
    },
    effect(fn) {
      const disposer = fn()
      if (typeof disposer === 'function') effectDisposers.push(disposer)
    },
  }
  let stored = 'cyberpunk'
  globalThis.localStorage = {
    getItem: () => stored,
    setItem: (_k, v) => { stored = v },
    removeItem: () => { stored = null },
  }

  client.apply(ctx)
  check('four skins registered', themes.length === 6)
  check('persisted selection restored', preference === 'cyberpunk')
  check('settings row registered', slotFactories.some(f => f.name === 'settings.general.item'))
  check('sidebar footer action registered', slotFactories.some(f => f.name === 'sidebar.footer.action'))

  const footerFactory = slotFactories.find(f => f.name === 'sidebar.footer.action')
  footerFactory.factory()
  const footerReg = registrations.find(r => r.options.id === 'balance')
  check('footer entry id=balance order=10', footerReg !== undefined && footerReg.options.order === 10)

  const settingsFactory = slotFactories.find(f => f.name === 'settings.general.item')
  settingsFactory.factory()
  const face = registrations.find(r => r.options.id === 'skin-pack').options.inject()
  face.setSkin('neon-pulse')
  check('setSkin switches + persists', preference === 'neon-pulse' && stored === 'neon-pulse')
  theme.setTheme('light')
  check('built-in pick clears storage', stored === null)

  for (const d of effectDisposers) d()
  check('unload disposes skin registrations', themes.length === 2)
}

if (failed > 0) {
  console.log(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nall smoke checks passed')
