import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrencies, getLatestRate } from "../api/frankfurter";
import { loadWatchlist, saveWatchlist, type WatchPair } from "../utils/storage";

function formatRate(n: number) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(n);
}

export default function Watchlist() {
    const qc = useQueryClient();

    const currenciesQ = useQuery({
        queryKey: ["currencies"],
        queryFn: getCurrencies,
        staleTime: 24 * 60 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const currencyOptions = useMemo(() => {
        const map = currenciesQ.data ?? {};
        return Object.entries(map)
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.code.localeCompare(b.code));
    }, [currenciesQ.data]);

    const [pairs, setPairs] = useState<WatchPair[]>(() => loadWatchlist());
    const [base, setBase] = useState("USD");
    const [target, setTarget] = useState("MXN");
    const [msg, setMsg] = useState<string | null>(null);

    // persist whenever pairs change
    useEffect(() => {
        saveWatchlist(pairs);
    }, [pairs]);

    const rateQueries = useQueries({
        queries: pairs.map((p) => ({
            queryKey: ["latest", p.base, p.target],
            queryFn: () => getLatestRate(p.base, p.target),
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            enabled: Boolean(p.base && p.target && p.base !== p.target),
        })),
    });

    const onAdd = () => {
        setMsg(null);
        const b = base.toUpperCase();
        const t = target.toUpperCase();

        if (!b || !t) return setMsg("Please select both currencies.");
        if (b === t) return setMsg("Choose two different currencies.");

        const key = `${b}-${t}`;
        const exists = pairs.some((p) => `${p.base}-${p.target}` === key);
        if (exists) return setMsg("That pair is already in your watchlist.");

        setPairs((prev) => [{ base: b, target: t }, ...prev]);
    };

    const onRemove = (p: WatchPair) => {
        setPairs((prev) => prev.filter((x) => !(x.base === p.base && x.target === p.target)));
    };

    const onRefreshAll = async () => {
        setMsg(null);
        await qc.invalidateQueries({ queryKey: ["latest"] });
    };

    return (
        <div className="card">
            <div className="cardHeader">
                <div>
                    <h2 className="title">Watchlist</h2>
                    <p className="muted"></p>
                </div>

                <button className="btn btnSmall" type="button" onClick={onRefreshAll} disabled={!pairs.length}>
                    Refresh all
                </button>
            </div>

            <div className="watchAdd">
                <div className="field">
                    <label htmlFor="wlBase">Base</label>
                    <select
                        id="wlBase"
                        value={base}
                        onChange={(e) => setBase(e.target.value)}
                        disabled={currenciesQ.isLoading}
                    >
                        {currencyOptions.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.code} — {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="field">
                    <label htmlFor="wlTarget">Target</label>
                    <select
                        id="wlTarget"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        disabled={currenciesQ.isLoading}
                    >
                        {currencyOptions.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.code} — {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="watchAddActions">
                    <button className="btn btnPrimary" type="button" onClick={onAdd} disabled={currenciesQ.isLoading}>
                        Add pair
                    </button>
                    {msg && <div className="error" style={{ marginTop: 8 }}>{msg}</div>}
                </div>
            </div>

            <div className="result" aria-live="polite">
                {currenciesQ.isLoading && <p className="muted">Loading currencies…</p>}
                {currenciesQ.isError && (
                    <p className="error">Failed to load currencies: {(currenciesQ.error as Error).message}</p>
                )}

                {!currenciesQ.isLoading && !currenciesQ.isError && pairs.length === 0 && (
                    <p className="muted">No pairs yet. Add one above.</p>
                )}

                {!currenciesQ.isLoading && !currenciesQ.isError && pairs.length > 0 && (
                    <div className="watchGrid">
                        {pairs.map((p, idx) => {
                            const q = rateQueries[idx];
                            const rate = q.data?.rates?.[p.target];
                            const date = q.data?.date;

                            return (
                                <div key={`${p.base}-${p.target}`} className="watchItem">
                                    <div className="watchTop">
                                        <div>
                                            <div className="watchPair">
                                                {p.base} <span className="muted">→</span> {p.target}
                                            </div>
                                            <div className="muted watchSub">
                                                1 {p.base} = {rate ? formatRate(rate) : "—"} {p.target}
                                            </div>
                                        </div>

                                        <button className="btn btnSmall" type="button" onClick={() => onRemove(p)}>
                                            Remove
                                        </button>
                                    </div>

                                    <div className="watchBody">
                                        {q.isLoading && <p className="muted">Fetching rate…</p>}
                                        {q.isError && <p className="error">Rate error: {(q.error as Error).message}</p>}

                                        {!q.isLoading && !q.isError && rate && (
                                            <>
                                                <div className="rateBig">{formatRate(rate)}</div>
                                                {date && <div className="tiny muted">Last update: {date}</div>}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}