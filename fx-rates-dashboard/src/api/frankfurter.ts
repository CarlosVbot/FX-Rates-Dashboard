const BASE_URL = "https://api.frankfurter.dev/v1";

export type CurrenciesMap = Record<string, string>;

export async function getCurrencies(): Promise<CurrenciesMap> {
    const r = await fetch(`${BASE_URL}/currencies`);
    if (!r.ok) throw new Error("Failed to load currencies");
    return r.json();
}

export async function getLatestRate(base: string, symbol: string) {
    const r = await fetch(
        `${BASE_URL}/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbol)}`
    );
    if (!r.ok) throw new Error("Failed to load latest rate");
    return (await r.json()) as {
        base: string;
        date: string;
        rates: Record<string, number>;
    };
}

export async function getTimeSeries(start: string, end: string, base: string, symbol: string) {
    const r = await fetch(
        `${BASE_URL}/${start}..${end}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbol)}`
    );
    if (!r.ok) throw new Error("Failed to load time series");
    return (await r.json()) as {
        base: string;
        start_date: string;
        end_date: string;
        rates: Record<string, Record<string, number>>;
    };
}