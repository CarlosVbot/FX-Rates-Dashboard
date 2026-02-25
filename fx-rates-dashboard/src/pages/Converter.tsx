import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getCurrencies, getLatestRate } from "../api/frankfurter";

const FormSchema = z
    .object({
        amount: z.number().positive("Amount must be > 0").finite(),
        base: z.string().min(3),
        target: z.string().min(3),
    })
    .refine((v) => v.base !== v.target, {
        path: ["target"],
        message: "Choose a different currency",
    });

type FormValues = z.infer<typeof FormSchema>;

function formatMoney(value: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 6,
        }).format(value);
    } catch {
        return `${value.toFixed(6)} ${currency}`;
    }
}

export default function Converter() {
    const {
        register,
        watch,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: { amount: 100, base: "USD", target: "MXN" },
        mode: "onChange",
    });

    const amount = watch("amount");
    const base = watch("base");
    const target = watch("target");

    const currenciesQ = useQuery({
        queryKey: ["currencies"],
        queryFn: getCurrencies,
        staleTime: 24 * 60 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const rateQ = useQuery({
        queryKey: ["latest", base, target],
        queryFn: () => getLatestRate(base, target),
        enabled: Boolean(base && target && base !== target),
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const currencyOptions = useMemo(() => {
        const map = currenciesQ.data ?? {};
        return Object.entries(map)
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.code.localeCompare(b.code));
    }, [currenciesQ.data]);

    const rate = rateQ.data?.rates?.[target];
    const received = rate ? amount * rate : undefined;

    const onSwap = () => {
        const { base: b, target: t } = getValues();
        setValue("base", t, { shouldValidate: true });
        setValue("target", b, { shouldValidate: true });
    };

    return (
        <div className="card">
            <div className="cardHeader">
                <div>
                    <h2 className="title">Currency Converter</h2>
                    <p className="muted">
                    </p>
                </div>

                <button type="button" className="btn btnPrimary" onClick={onSwap} disabled={currenciesQ.isLoading}>
                    Swap
                </button>
            </div>

            <div className="grid">
                <div className="field">
                    <label htmlFor="amount">Amount</label>
                    <input
                        id="amount"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="100"
                        {...register("amount", { valueAsNumber: true })}
                    />
                    {errors.amount?.message && <div className="error">{errors.amount.message}</div>}
                </div>

                <div className="field">
                    <label htmlFor="base">From</label>
                    <select id="base" {...register("base")} disabled={currenciesQ.isLoading}>
                        {currencyOptions.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.code} — {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="field">
                    <label htmlFor="target">To</label>
                    <select id="target" {...register("target")} disabled={currenciesQ.isLoading}>
                        {currencyOptions.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.code} — {c.name}
                            </option>
                        ))}
                    </select>
                    {errors.target?.message && <div className="error">{errors.target.message}</div>}
                </div>
            </div>

            <div className="result" aria-live="polite">
                {currenciesQ.isLoading && <p className="muted">Loading currencies…</p>}
                {currenciesQ.isError && (
                    <p className="error">Failed to load currencies: {(currenciesQ.error as Error).message}</p>
                )}

                {!currenciesQ.isLoading && !currenciesQ.isError && (
                    <>
                        {rateQ.isLoading && <p className="muted">Fetching latest rate…</p>}
                        {rateQ.isError && (
                            <p className="error">Rate error: {(rateQ.error as Error).message}</p>
                        )}

                        {rate && typeof received === "number" && (
                            <div className="resultBox">
                                <div className="row">
                                    <span className="muted">Rate</span>
                                    <strong>
                                        1 {base} = {rate.toFixed(6)} {target}
                                    </strong>
                                </div>
                                <div className="row">
                                    <span className="muted">You send</span>
                                    <strong>{formatMoney(amount, base)}</strong>
                                </div>
                                <div className="row">
                                    <span className="muted">They receive</span>
                                    <strong>{formatMoney(received, target)}</strong>
                                </div>
                                {rateQ.data?.date && (
                                    <p className="tiny muted">Last update: {rateQ.data.date}</p>
                                )}
                            </div>
                        )}

                        {!rateQ.isLoading && !rateQ.isError && !rate && (
                            <p className="muted">Select two different currencies.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}