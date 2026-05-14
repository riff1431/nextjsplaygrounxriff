/**
 * Global currency store — syncs with CurrencyContext but can be imported
 * as a plain module anywhere (no hook required).
 *
 * Usage:
 *   import { cs, fp } from "@/utils/currency";
 *   // cs()   → "৳" (current symbol)
 *   // fp(10) → "৳10"
 */

type Listener = () => void;

let _symbol = "€";
let _code = "EUR";
let _name = "Euro";
const _listeners: Listener[] = [];

/** Called by CurrencyContext to keep this in sync */
export function _setCurrency(symbol: string, code: string, name: string) {
    _symbol = symbol;
    _code = code;
    _name = name;
    _listeners.forEach(fn => fn());
}

/** Subscribe to changes (for React components that use this directly) */
export function subscribeCurrency(fn: Listener) {
    _listeners.push(fn);
    return () => {
        const idx = _listeners.indexOf(fn);
        if (idx >= 0) _listeners.splice(idx, 1);
    };
}

/** Get currency symbol — e.g. "€", "$", "৳" */
export function cs(): string {
    return _symbol;
}

/** Get currency code — e.g. "EUR", "USD", "BDT" */
export function cc(): string {
    return _code;
}

/** Format price with currency symbol — fp(10) → "€10" */
export function fp(amount: number | string, decimals = 0): string {
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(n)) return `${_symbol}0`;
    const noDecimalCurrencies = ["JPY", "KRW"];
    const d = noDecimalCurrencies.includes(_code) ? 0 : decimals;
    return `${_symbol}${n.toFixed(d)}`;
}
