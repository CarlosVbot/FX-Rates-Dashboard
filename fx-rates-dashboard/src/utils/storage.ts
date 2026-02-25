export type WatchPair = { base: string; target: string };

const KEY = "fx_watchlist_v1";

function isPair(x: any): x is WatchPair {
    return x && typeof x.base === "string" && typeof x.target === "string";
}

export function loadWatchlist(): WatchPair[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [{ base: "USD", target: "MXN" }];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [{ base: "USD", target: "MXN" }];

        const pairs = parsed.filter(isPair).map((p) => ({
            base: p.base.toUpperCase(),
            target: p.target.toUpperCase(),
        }));

        const uniq = new Map<string, WatchPair>();
        for (const p of pairs) {
            if (!p.base || !p.target || p.base === p.target) continue;
            uniq.set(`${p.base}-${p.target}`, p);
        }
        const list = Array.from(uniq.values());
        return list.length ? list : [{ base: "USD", target: "MXN" }];
    } catch {
        return [{ base: "USD", target: "MXN" }];
    }
}

export function saveWatchlist(pairs: WatchPair[]) {
    try {
        localStorage.setItem(KEY, JSON.stringify(pairs));
    } catch {

    }
}