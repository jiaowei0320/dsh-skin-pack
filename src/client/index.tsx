/**
 * dsh-skin-pack — browser half.
 *
 * Registers three cyberpunk-flavored skins into the built-in theme registry
 * (ctx.theme from @deepseek-ai/dsh-client-ui-theme), restores the persisted
 * selection, and renders a picker row in Settings → General via the
 * `settings.general.item` slot.
 *
 * Design notes:
 * - Skins are third-party ThemeDefinitions: alias-layer overrides on top of
 *   the built-in light/dark base palettes. The presenter in ui-layout applies
 *   them — this plugin never touches the DOM.
 * - The built-in preference schema only persists `light`/`dark`/`system`, so
 *   a third-party skin id is NOT written to the Host settings store. The
 *   picker therefore persists its own selection in localStorage, and clears
 *   it whenever the user returns to a built-in theme so a stale skin never
 *   resurrects on reload.
 * - Cross-plugin collaboration goes through cordis services only: all
 *   @deepseek-ai imports below are type-only and erased at build time.
 */
import { useEffect, useSyncExternalStore, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only seeds pulling the Context/Events/SlotMap augmentations into the
// program: ctx.theme, 'theme/change', 'settings.general.item', and
// 'conversation.composer.dock'.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-general/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'

const STORAGE_KEY = 'dsh-skin-pack.active'

/** One selectable skin: a theme definition plus a display label. */
export interface SkinDefinition {
  /** Registered theme id (the setTheme argument). */
  id: string
  /** Base palette this skin builds on. */
  colorScheme: 'light' | 'dark'
  /** Alias-layer token overrides applied over the base palette. */
  tokens: Record<string, string>
  /** Picker label (product copy is Chinese). */
  label: string
}

const SKINS: readonly SkinDefinition[] = [
  {
    id: 'cyberpunk',
    label: '赛博朋克紫',
    colorScheme: 'dark',
    tokens: {
      '--dsw-alias-bg-base': '#0d0618',
      '--dsw-alias-bg-layer-1': '#17102a',
      '--dsw-alias-bg-layer-2': '#1f1636',
      '--dsw-alias-bg-overlay': '#251a3d',
      '--dsw-alias-border-l1': '#3a2a5c',
      '--dsw-alias-border-l2': '#543a8a',
      '--dsw-alias-brand-primary': '#b44dff',
      '--dsw-alias-label-primary': '#f2ecff',
      '--dsw-alias-label-secondary': '#b3a3d6',
      '--dsw-alias-label-tertiary': '#8a78ad',
      '--dsw-alias-state-error-primary': '#ff4d6d',
      '--dsw-alias-state-success-primary': '#2ee6a8',
      '--dsw-alias-state-warn-primary': '#ffb84d',
      '--dsw-alias-interactive-bg-hover': 'rgba(180, 77, 255, 0.12)',
      '--dsw-alias-button-primary-fill': '#b44dff',
      '--dsw-alias-button-primary-hover': '#c96aff',
      '--dsw-specific-sidebar-fill': '#120a20',
    },
  },
  {
    id: 'neon-pulse',
    label: '霓虹脉冲',
    colorScheme: 'dark',
    tokens: {
      '--dsw-alias-bg-base': '#04121c',
      '--dsw-alias-bg-layer-1': '#0a1e2e',
      '--dsw-alias-bg-layer-2': '#0e2940',
      '--dsw-alias-bg-overlay': '#122f47',
      '--dsw-alias-border-l1': '#16405c',
      '--dsw-alias-border-l2': '#1f5a80',
      '--dsw-alias-brand-primary': '#00e5ff',
      '--dsw-alias-label-primary': '#e6fbff',
      '--dsw-alias-label-secondary': '#8fb8c9',
      '--dsw-alias-label-tertiary': '#6d94a8',
      '--dsw-alias-state-error-primary': '#ff5d73',
      '--dsw-alias-state-success-primary': '#37f2c3',
      '--dsw-alias-state-warn-primary': '#ffc04d',
      '--dsw-alias-interactive-bg-hover': 'rgba(0, 229, 255, 0.12)',
      '--dsw-alias-button-primary-fill': '#00e5ff',
      '--dsw-alias-button-primary-hover': '#33ecff',
      '--dsw-specific-sidebar-fill': '#071620',
    },
  },
  {
    id: 'miami-sunset',
    label: '迈阿密日落',
    colorScheme: 'light',
    tokens: {
      '--dsw-alias-bg-base': '#fff5f2',
      '--dsw-alias-bg-layer-1': '#ffeae3',
      '--dsw-alias-bg-layer-2': '#ffddd1',
      '--dsw-alias-bg-overlay': '#ffd6c8',
      '--dsw-alias-border-l1': '#ffc4b4',
      '--dsw-alias-border-l2': '#ffa890',
      '--dsw-alias-brand-primary': '#ff2e93',
      '--dsw-alias-label-primary': '#3c2430',
      '--dsw-alias-label-secondary': '#8a6876',
      '--dsw-alias-label-tertiary': '#b08fa0',
      '--dsw-alias-state-error-primary': '#e63946',
      '--dsw-alias-state-success-primary': '#00b894',
      '--dsw-alias-state-warn-primary': '#f77f00',
      '--dsw-alias-interactive-bg-hover': 'rgba(255, 46, 147, 0.10)',
      '--dsw-alias-button-primary-fill': '#ff2e93',
      '--dsw-alias-button-primary-hover': '#ff4aa2',
      '--dsw-specific-sidebar-fill': '#ffede6',
    },
  },
  {
    // 天空蓝 — 深色侧边栏/底部 + 天蓝聊天区 + 白色内容卡片。
    // Color-matched from the reference screenshot (20260816-192251.jpeg):
    // deep navy chrome, sky-blue #85d5fa chat area, white surfaces.
    // Note: DSH paints the chat column with --dsw-alias-bg-base and the
    // sidebar with --dsw-specific-sidebar-fill, so sky-blue chat + dark
    // sidebar is achievable; the reference's gradient/sky gradient cannot be
    // expressed as theme tokens (DSH has no gradient background token).
    id: 'sky-blue',
    label: '天空蓝',
    colorScheme: 'dark',
    tokens: {
      // 聊天区 = 天蓝（bg-base 同时驱动浮层，用略深的天蓝保持层次）
      '--dsw-alias-bg-base': '#85d5fa',
      '--dsw-alias-bg-layer-1': '#9adefb',
      '--dsw-alias-bg-layer-2': '#70caf6',
      '--dsw-alias-bg-overlay': '#a8e2fc',
      '--dsw-alias-bg-skeleton': 'rgba(255, 255, 255, 0.4)',
      // 深色侧边栏 / 导航 / 底部框架
      '--dsw-specific-sidebar-fill': '#0c1e33',
      '--dsw-specific-sidebar-nav-item-active': 'rgba(133, 213, 250, 0.16)',
      '--dsw-specific-sidebar-nav-item-hover': 'rgba(133, 213, 250, 0.10)',
      '--dsw-specific-sidebar-nav-item-active-accent': 'rgba(133, 213, 250, 0.24)',
      '--dsw-alias-bg-module-platform': '#0e2238',
      // 边框：天蓝底上用白/浅蓝
      '--dsw-alias-border-l1': 'rgba(255, 255, 255, 0.45)',
      '--dsw-alias-border-l2': 'rgba(255, 255, 255, 0.55)',
      '--dsw-alias-border-l3': 'rgba(255, 255, 255, 0.65)',
      '--dsw-alias-border-l4': 'rgba(255, 255, 255, 0.75)',
      '--dsw-alias-border-l2-darkmode-thin': 'rgba(255, 255, 255, 0.55)',
      // 品牌：深蓝（导航/主按钮，参考图 #156bd0）
      '--dsw-alias-brand-primary': '#156bd0',
      '--dsw-alias-brand-text': '#eaf7ff',
      '--dsw-alias-brand-primary-invert': '#eaf7ff',
      '--dsw-alias-button-primary-fill': '#156bd0',
      '--dsw-alias-button-primary-hover': '#1d7ae6',
      '--dsw-alias-button-primary-dimmed': 'rgba(21, 107, 208, 0.30)',
      '--dsw-alias-button-info-fill': '#156bd0',
      '--dsw-alias-button-info-hover': '#1d7ae6',
      // 文字：天蓝底上用深蓝黑
      '--dsw-alias-label-primary': '#0c2a45',
      '--dsw-alias-label-primary-foreground': '#ffffff',
      '--dsw-alias-label-primary-inverted': '#ffffff',
      '--dsw-alias-label-primary-dimmed': '#123a55',
      '--dsw-alias-label-primary-bluish': '#0d4a78',
      '--dsw-alias-label-secondary': '#1d5a85',
      '--dsw-alias-label-tertiary': '#3a6f9c',
      '--dsw-alias-label-caption': '#2f668f',
      '--dsw-alias-label-dimmed': '#4a7fa8',
      // 交互反馈（天蓝底）
      '--dsw-alias-interactive-bg-hover': 'rgba(255, 255, 255, 0.35)',
      '--dsw-alias-interactive-bg-active': 'rgba(255, 255, 255, 0.45)',
      '--dsw-alias-interactive-bg-hover-accent': 'rgba(255, 255, 255, 0.5)',
      '--dsw-alias-interactive-bg-hover-solid': 'rgba(255, 255, 255, 0.4)',
      // 状态色（天空蓝里保持可辨识）
      '--dsw-alias-state-error-primary': '#d64545',
      '--dsw-alias-state-success-primary': '#0f9d6e',
      '--dsw-alias-state-warn-primary': '#d98a1f',
      '--dsw-alias-state-warn-secondary': 'rgba(217, 138, 31, 0.18)',
      '--dsw-alias-state-warn-tertiary': 'rgba(217, 138, 31, 0.10)',
      '--dsw-alias-state-error-secondary': 'rgba(214, 69, 69, 0.18)',
      '--dsw-alias-state-success-secondary': 'rgba(15, 157, 110, 0.18)',
      '--dsw-alias-state-success-tertiary': 'rgba(15, 157, 110, 0.10)',
      '--dsw-alias-state-business-primary': '#156bd0',
      '--dsw-alias-state-business-tertiary': 'rgba(21, 107, 208, 0.12)',
      // 白色内容面（消息气泡 / 输入框 / 菜单）
      '--dsw-specific-bubble': '#ffffff',
      '--dsw-specific-bubble-highlight': '#f0f8ff',
      '--dsw-specific-input-major': '#ffffff',
      '--dsw-specific-menu': '#ffffff',
      '--dsw-specific-selector': 'rgba(255, 255, 255, 0.6)',
      '--dsw-specific-tip': 'rgba(255, 255, 255, 0.7)',
      // 工具条按钮（透明底 → 天蓝悬浮）
      '--dsw-alias-button-tool-bar-fill': 'rgba(255, 255, 255, 0.5)',
      '--dsw-alias-button-tool-bar-hover': 'rgba(255, 255, 255, 0.65)',
      '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(255, 255, 255, 0.35)',
      '--dsw-alias-button-floating-fill': '#ffffff',
      '--dsw-alias-button-floating-hover': '#eef8ff',
      '--dsw-alias-button-elevated-fill': '#ffffff',
      '--dsw-alias-button-contrast-fill': '#0d4a78',
      // Markdown / 代码块（白底内容区内）
      '--dsw-alias-markdown-code-block': '#f4f8fc',
      '--dsw-alias-markdown-code-block-banner': '#e8f1f9',
      '--dsw-alias-markdown-inline-code': 'rgba(21, 107, 208, 0.10)',
      '--dsw-alias-markdown-tag': 'rgba(21, 107, 208, 0.10)',
      '--dsw-alias-markdown-citation': 'rgba(21, 107, 208, 0.08)',
      '--dsw-alias-markdown-placeholder': 'rgba(21, 107, 208, 0.06)',
      // 滚动条
      '--dsw-alias-scrollbar-bg-l1': 'rgba(255, 255, 255, 0.4)',
      '--dsw-alias-scrollbar-bg-l2': 'rgba(255, 255, 255, 0.5)',
      '--dsw-alias-scrollbar-hover-l1': 'rgba(255, 255, 255, 0.6)',
      '--dsw-alias-scrollbar-hover-l2': 'rgba(255, 255, 255, 0.7)',
    },
  },
]

function readStored(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function writeStored(id: string): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, id)
  } catch {
    // Non-browser runs (tests) have no localStorage; persistence is best-effort.
  }
}

function clearStored(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY)
  } catch {
    // best-effort, see above
  }
}

/** Business face injected into the picker row. */
export interface SkinRowInjected {
  /** The selectable skins, in registration order. */
  skins: readonly SkinDefinition[]
  /** Snapshot of the current preference (a skin id or a built-in). */
  current: () => string
  /** Subscribe to theme changes; returns an unsubscribe. */
  subscribe: (callback: () => void) => () => void
  /** Switch the active skin (and persist the choice). */
  setSkin: (id: string) => void
}

export type SkinRowProps = PropsRuntime<'settings.general.item'> & InjectFace<SkinRowInjected>

/** Picker row rendered into Settings → General. */
function SkinRow({ skins, current, subscribe, setSkin }: SkinRowProps): React.JSX.Element {
  const active = useSyncExternalStore(subscribe, current)
  return (
    <div style={{ padding: '8px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>皮肤（dsh-skin-pack）</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {skins.map(skin => {
          const selected = active === skin.id
          return (
            <button
              key={skin.id}
              type="button"
              onClick={() => { setSkin(skin.id) }}
              style={{
                border: `1px solid ${selected ? skin.tokens['--dsw-alias-brand-primary'] ?? '#888' : 'var(--dsw-alias-border-l2)'}`,
                background: selected ? skin.tokens['--dsw-alias-bg-layer-2'] : 'var(--dsw-alias-bg-layer-1)',
                color: 'var(--dsw-alias-label-primary)',
                borderRadius: 6,
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {skin.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const name = 'dsh-skin-pack'
export const inject = ['theme', 'slots']

// ── account balance badge ────────────────────────────────────────────────────

/** Display state of the balance badge (mirror of the host /balance payload). */
export interface BalanceState {
  kind: 'loading' | 'ok' | 'error'
  currency?: string
  total?: string
  granted?: string
  toppedUp?: string
}

/**
 * Fetch and normalize the balance from the plugin's host route. Pure enough to
 * test in node (the fetcher is injectable).
 * @param fetcher - fetch implementation (defaults to the browser global).
 * @returns the display state; `error` on any failure.
 */
export async function fetchAccountBalance(
  fetcher: typeof fetch = fetch,
): Promise<BalanceState> {
  try {
    const res = await fetcher('/api/dsh-account/balance', { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return { kind: 'error' }
    const data = await res.json() as {
      ok?: boolean
      currency?: string
      total?: string
      granted?: string
      toppedUp?: string
    }
    if (data.ok !== true || data.total === undefined) return { kind: 'error' }
    return {
      kind: 'ok',
      currency: data.currency,
      total: data.total,
      granted: data.granted,
      toppedUp: data.toppedUp,
    }
  } catch {
    return { kind: 'error' }
  }
}

/** Currency → symbol for compact display; falls back to the ISO code. */
function currencySymbol(currency: string | undefined): string {
  return currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : (currency ?? '')
}

/** Display state of the 7-day token usage (mirror of the host route). */
export interface Tokens7dState {
  kind: 'loading' | 'ok' | 'error'
  /** Summed tokens over the trailing 7-day window. */
  tokens?: number
}

/**
 * Fetch and normalize the 7-day token usage from the plugin's host route.
 * @param fetcher - fetch implementation (defaults to the browser global).
 * @returns the display state; `error` on any failure (including a missing
 * persistence service — the row then silently hides).
 */
export async function fetchTokens7d(
  fetcher: typeof fetch = fetch,
): Promise<Tokens7dState> {
  try {
    const res = await fetcher('/api/dsh-account/tokens7d', { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return { kind: 'error' }
    const data = await res.json() as { ok?: boolean; tokens?: number }
    if (data.ok !== true || typeof data.tokens !== 'number') return { kind: 'error' }
    return { kind: 'ok', tokens: data.tokens }
  } catch {
    return { kind: 'error' }
  }
}

/** Compact token count: 1.23 M / 456 K / 890. */
function formatTokensM(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)} M`
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)} K`
  return String(tokens)
}

/** Balance row mounted at the sidebar foot (sidebar.footer.action), so the
 * account balance is always visible without touching the conversation area.
 * Wide: a compact 充值余额 row like the Settings trigger; rail (collapsed):
 * a lone currency symbol button. Line-height carries a unit — a bare number
 * would render as a multiple of font-size and blow up the row height. */
function BalanceBadge({ wide }: PropsRuntime<'sidebar.footer.action'>): React.JSX.Element | null {
  const [state, setState] = useState<BalanceState>({ kind: 'loading' })
  const [tokens, setTokens] = useState<Tokens7dState>({ kind: 'loading' })
  useEffect(() => {
    let alive = true
    const load = async (): Promise<void> => {
      const [next, nextTokens] = await Promise.all([fetchAccountBalance(), fetchTokens7d()])
      if (alive) {
        setState(next)
        setTokens(nextTokens)
      }
    }
    void load()
    const timer = setInterval(() => { void load() }, 60_000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])
  // Quiet failure: no balance row at all beats a broken-looking one.
  if (state.kind !== 'ok') return null
  const symbol = currencySymbol(state.currency)
  const toppedUp = state.toppedUp ?? state.total ?? '--'
  const breakdown = `总余额 ${symbol}${state.total} · 充值 ${symbol}${state.toppedUp ?? '0'} · 赠送 ${symbol}${state.granted ?? '0'}`
  const label = `充值余额 ${symbol}${toppedUp}`
  const tokensLabel = tokens.kind === 'ok' && tokens.tokens !== undefined
    ? `近7天 ${formatTokensM(tokens.tokens)}`
    : null
  if (!wide) {
    // Rail: a circular icon button mirroring the other rail controls; the
    // breakdown rides the native title tooltip.
    return (
      <button
        type="button"
        title={[label, breakdown, tokensLabel].filter(Boolean).join(' — ')}
        aria-label={label}
        style={{
          width: 36,
          height: 36,
          margin: '8px 0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          cursor: 'default',
          fontSize: 14,
          lineHeight: '18px',
          color: 'var(--dsw-alias-label-tertiary)',
        }}
      >
        {symbol}
      </button>
    )
  }
  return (
    <div
      title={[breakdown, tokensLabel].filter(Boolean).join(' · ')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: 'calc(100% + 8px)',
        height: 34,
        margin: '4px -4px 4px',
        padding: '6px 2px 6px 10px',
        boxSizing: 'border-box',
        fontSize: 13,
        lineHeight: '20px',
        color: 'var(--dsw-alias-label-tertiary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <span>{label}</span>
      {tokensLabel !== null && (
        <span style={{ color: 'var(--dsw-alias-label-secondary)' }}>{tokensLabel}</span>
      )}
    </div>
  )
}

export function apply(ctx: Context): void {
  // 1. Register the skins. ThemeRuntime.register is a plain disposer — hang it
  //    on the fiber so unload removes every skin.
  const disposers = SKINS.map(skin =>
    ctx.theme.register({ id: skin.id, colorScheme: skin.colorScheme, tokens: skin.tokens }))
  ctx.effect(() => () => {
    for (const dispose of disposers) dispose()
  }, 'dsh-skin-pack: theme registrations')

  // 2. Restore the persisted selection (no-op when unknown or unset).
  const saved = readStored()
  if (saved !== null && ctx.theme.getTheme().themes.some(t => t.id === saved)) {
    ctx.theme.setTheme(saved)
  }

  // 3. Keep storage consistent with the live preference: returning to a
  //    built-in theme clears the stale skin id so it cannot resurrect.
  ctx.on('theme/change', snapshot => {
    if (!SKINS.some(s => s.id === snapshot.preference)) clearStored()
  })

  // 4. Picker row in Settings → General (list slot; lowest order renders
  //    first — appearance is 10, so 20 sits after it).
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'skin-pack',
    order: 20,
    inject: (): SkinRowInjected => ({
      skins: SKINS,
      current: () => ctx.theme.getTheme().preference,
      subscribe: callback => ctx.on('theme/change', () => callback()),
      setSkin: (id) => {
        ctx.theme.setTheme(id)
        writeStored(id)
      },
    }),
  }, SkinRow))

  // 5. Balance badge at the sidebar foot (sidebar.footer.action): the
  //    account balance stays visible in every conversation without touching
  //    the composer or the stats line. Purely additive — no product changes.
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'balance',
    order: 10,
  }, BalanceBadge))
}
