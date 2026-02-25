import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { getCurrencies, getTimeSeries } from "../api/frankfurter";

type Period = 7 | 30 | 90;

function isoDateUTC(d: Date) {
    // YYYY-MM-DD in UTC to avoid timezone off-by-one
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function daysAgoUTC(days: number) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d;
}

function shortDateLabel(iso: string) {
    // iso: YYYY-MM-DD
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(dt);
}

function formatRate(n: number) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(n);
}

export default function History() {
    const [base, setBase] = useState("USD");
    const [target, setTarget] = useState("MXN");
    const [period, setPeriod] = useState<Period>(30);

    const currenciesQ = useQuery({
        queryKey: ["currencies"],
        queryFn: getCurrencies,
        staleTime: 24 * 60 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const { startISO, endISO } = useMemo(() => {
        // Slight buffer: request period+2 to account for weekends/holidays
        const end = new Date(); // today (UTC formatted)
        const start = daysAgoUTC(period + 2);
        return { startISO: isoDateUTC(start), endISO: isoDateUTC(end) };
    }, [period]);

    const seriesQ = useQuery({
        queryKey: ["series", base, target, startISO, endISO],
        queryFn: () => getTimeSeries(startISO, endISO, base, target),
        enabled: Boolean(base && target && base !== target),
        staleTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const currencyOptions = useMemo(() => {
        const map = currenciesQ.data ?? {};
        return Object.entries(map)
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.code.localeCompare(b.code));
    }, [currenciesQ.data]);

    const chartData = useMemo(() => {
        const rates = seriesQ.data?.rates ?? {};
        // Frankfurter returns only dates it has values for (often weekdays)
        const points = Object.entries(rates)
            .map(([date, obj]) => ({
                date,
                label: shortDateLabel(date),
                rate: obj?.[target],
            }))
            .filter((p) => typeof p.rate === "number")
            .sort((a, b) => a.date.localeCompare(b.date));

        // Keep last N available points (because weekends might reduce count)
        return points.slice(-period);
    }, [seriesQ.data?.rates, target, period]);

    const stats = useMemo(() => {
        if (chartData.length === 0) return null;
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        let sum = 0;

        for (const p of chartData) {
            const v = p.rate as number;
            min = Math.min(min, v);
            max = Math.max(max, v);
            sum += v;
        }
        return { min, max, avg: sum / chartData.length, count: chartData.length };
    }, [chartData]);

    const onSwap = () => {
        setBase(target);
        setTarget(base);
    };

    return (
        <div className="card">
            <div className="cardHeader">
                <div>
                    <h2 className="title">Rate History</h2>
                    <p className="muted">
                        Historical reference rates for <strong>{base}</strong> → <strong>{target}</strong>
                    </p>
                </div>

                <div className="toolbar">
                    <div className="segmented" role="group" aria-label="Period">
                        <button
                            className={`btn btnSmall ${period === 7 ? "btnPrimary" : ""}`}
                            type="button"
                            onClick={() => setPeriod(7)}
                        >
                            7D
                        </button>
                        <button
                            className={`btn btnSmall ${period === 30 ? "btnPrimary" : ""}`}
                            type="button"
                            onClick={() => setPeriod(30)}
                        >
                            30D
                        </button>
                        <button
                            className={`btn btnSmall ${period === 90 ? "btnPrimary" : ""}`}
                            type="button"
                            onClick={() => setPeriod(90)}
                        >
                            90D
                        </button>
                    </div>

                    <button className="btn btnSmall" type="button" onClick={onSwap} disabled={currenciesQ.isLoading}>
                        Swap
                    </button>
                </div>
            </div>

            <div className="grid">
                <div className="field">
                    <label htmlFor="base">Base</label>
                    <select
                        id="base"
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
                    <label htmlFor="target">Target</label>
                    <select
                        id="target"
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

                <div className="field" style={{ gridColumn: "span 4" }}>
                    <label>Window</label>
                    <div className="resultBox" style={{ marginTop: 0 }}>
                        <div className="row">
                            <span className="muted">From</span>
                            <strong>{startISO}</strong>
                        </div>
                        <div className="row">
                            <span className="muted">To</span>
                            <strong>{endISO}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div className="result" aria-live="polite">
                {currenciesQ.isLoading && <p className="muted">Loading currencies…</p>}
                {currenciesQ.isError && (
                    <p className="error">Failed to load currencies: {(currenciesQ.error as Error).message}</p>
                )}

                {!currenciesQ.isLoading && !currenciesQ.isError && base === target && (
                    <p className="error">Choose two different currencies.</p>
                )}

                {!currenciesQ.isLoading && !currenciesQ.isError && base !== target && (
                    <>
                        {seriesQ.isLoading && <p className="muted">Fetching time series…</p>}
                        {seriesQ.isError && <p className="error">Series error: {(seriesQ.error as Error).message}</p>}

                        {!seriesQ.isLoading && !seriesQ.isError && chartData.length > 0 && (
                            <>
                                {stats && (
                                    <div className="statGrid">
                                        <div className="stat">
                                            <div className="muted">Min</div>
                                            <div className="statValue">{formatRate(stats.min)}</div>
                                        </div>
                                        <div className="stat">
                                            <div className="muted">Avg</div>
                                            <div className="statValue">{formatRate(stats.avg)}</div>
                                        </div>
                                        <div className="stat">
                                            <div className="muted">Max</div>
                                            <div className="statValue">{formatRate(stats.max)}</div>
                                        </div>
                                        <div className="stat">
                                            <div className="muted">Points</div>
                                            <div className="statValue">{stats.count}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="chartCard">
                                    <ResponsiveContainer width="100%" height={320}>
                                        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                                            <CartesianGrid stroke="rgba(16,24,16,.10)" strokeDasharray="4 4" />
                                            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                            <YAxis
                                                tick={{ fontSize: 12 }}
                                                domain={["auto", "auto"]}
                                                tickFormatter={(v) => formatRate(Number(v))}
                                            />
                                            <Tooltip
                                                formatter={(v: any) => [formatRate(Number(v)), `${base} → ${target}`]}
                                                labelFormatter={(label) => `Date: ${label}`}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="rate"
                                                stroke="var(--accent)"
                                                strokeWidth={2.5}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <p className="tiny muted">
                                    Note: Data points may skip weekends/holidays (reference-rate schedule).
                                </p>
                            </>
                        )}

                        {!seriesQ.isLoading && !seriesQ.isError && chartData.length === 0 && (
                            <p className="muted">No data for this selection.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}