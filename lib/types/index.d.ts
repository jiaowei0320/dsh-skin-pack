import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-skin-pack";
export declare const inject: string[];
/** Normalized balance payload served to the browser (JSON-safe). */
export interface BalancePayload {
    ok: boolean;
    available?: boolean;
    currency?: string;
    total?: string;
    granted?: string;
    toppedUp?: string;
    error?: string;
}
/** Normalized 7-day token-usage payload (JSON-safe). */
export interface Tokens7dPayload {
    ok: boolean;
    /** Summed tokens over the trailing 7-day window. */
    tokens?: number;
    /** Source of the figure: 'sessions' when folded from local session logs. */
    source?: 'sessions';
    error?: string;
}
export declare function apply(ctx: Context): void;
