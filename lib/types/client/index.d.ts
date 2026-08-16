import type { Context } from '@deepseek-ai/cordis';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** One selectable skin: a theme definition plus a display label. */
export interface SkinDefinition {
    /** Registered theme id (the setTheme argument). */
    id: string;
    /** Base palette this skin builds on. */
    colorScheme: 'light' | 'dark';
    /** Alias-layer token overrides applied over the base palette. */
    tokens: Record<string, string>;
    /** Picker label (product copy is Chinese). */
    label: string;
}
/** Business face injected into the picker row. */
export interface SkinRowInjected {
    /** The selectable skins, in registration order. */
    skins: readonly SkinDefinition[];
    /** Snapshot of the current preference (a skin id or a built-in). */
    current: () => string;
    /** Subscribe to theme changes; returns an unsubscribe. */
    subscribe: (callback: () => void) => () => void;
    /** Switch the active skin (and persist the choice). */
    setSkin: (id: string) => void;
}
export type SkinRowProps = PropsRuntime<'settings.general.item'> & InjectFace<SkinRowInjected>;
export declare const name = "dsh-skin-pack";
export declare const inject: string[];
/** Display state of the balance badge (mirror of the host /balance payload). */
export interface BalanceState {
    kind: 'loading' | 'ok' | 'error';
    currency?: string;
    total?: string;
    granted?: string;
    toppedUp?: string;
}
/**
 * Fetch and normalize the balance from the plugin's host route. Pure enough to
 * test in node (the fetcher is injectable).
 * @param fetcher - fetch implementation (defaults to the browser global).
 * @returns the display state; `error` on any failure.
 */
export declare function fetchAccountBalance(fetcher?: typeof fetch): Promise<BalanceState>;
/** Display state of the 7-day token usage (mirror of the host route). */
export interface Tokens7dState {
    kind: 'loading' | 'ok' | 'error';
    /** Summed tokens over the trailing 7-day window. */
    tokens?: number;
}
/**
 * Fetch and normalize the 7-day token usage from the plugin's host route.
 * @param fetcher - fetch implementation (defaults to the browser global).
 * @returns the display state; `error` on any failure (including a missing
 * persistence service — the row then silently hides).
 */
export declare function fetchTokens7d(fetcher?: typeof fetch): Promise<Tokens7dState>;
export declare function apply(ctx: Context): void;
