"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ── Zod Schema ─────────────────────────────────────────────────────────────
const loanSchema = z.object({
  amount: z
    .number({ error: "Enter a valid amount" })
    .min(100, "Minimum loan amount is $100")
    .max(10000, "Maximum loan amount is $10,000"),
  duration: z.enum(["3", "6", "12", "24"] as const, {
    error: "Select a loan duration",
  }),
  purpose: z.enum(
    ["personal", "business", "education", "medical", "other"] as const,
    {
      error: "Select a loan purpose",
    },
  ),
  useNftCollateral: z.boolean(),
  agreeFees: z.boolean().refine((v) => v === true, {
    message: "You must acknowledge the loan terms",
  }),
});

type LoanFormData = z.infer<typeof loanSchema>;

// ── Constants ──────────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { value: "3", label: "3 months", rate: "5.2%" },
  { value: "6", label: "6 months", rate: "5.8%" },
  { value: "12", label: "12 months", rate: "6.2%" },
  { value: "24", label: "24 months", rate: "7.1%" },
];

const PURPOSE_OPTIONS = [
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
  { value: "education", label: "Education" },
  { value: "medical", label: "Medical" },
  { value: "other", label: "Other" },
];

const CREDIT_SCORE = 724;
const BORROWING_POWER = 4200;

// ── Helpers ────────────────────────────────────────────────────────────────
function getRate(duration: string) {
  return DURATION_OPTIONS.find((d) => d.value === duration)?.rate ?? "—";
}

function calcMonthly(amount: number, duration: string, rateStr: string) {
  const months = parseInt(duration);
  const rate = parseFloat(rateStr) / 100 / 12;
  if (!amount || !months || isNaN(rate)) return null;
  const monthly =
    (amount * rate * Math.pow(1 + rate, months)) /
    (Math.pow(1 + rate, months) - 1);
  return monthly.toFixed(2);
}

function calcTotal(amount: number, monthly: string | null, duration: string) {
  if (!monthly) return null;
  return (parseFloat(monthly) * parseInt(duration)).toFixed(2);
}

// ── Sub-components ─────────────────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="font-mono text-[0.6rem] tracking-wide text-red-400 mt-1.5 flex items-center gap-1">
      <span>✕</span> {message}
    </p>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.6rem] tracking-widest uppercase text-white/30 mb-3">
      {children}
    </p>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-white/10 rounded-full px-2.5 py-0.5 font-mono text-[0.58rem] tracking-widest uppercase text-white/35">
      {children}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function LoanRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<LoanFormData | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      useNftCollateral: true,
      agreeFees: false,
    },
  });

  const watchAmount = watch("amount");
  const watchDuration = watch("duration");
  const watchNft = watch("useNftCollateral");
  const watchAgreeFees = watch("agreeFees");

  const rate = watchDuration ? getRate(watchDuration) : null;
  const monthly =
    watchDuration && watchAmount
      ? calcMonthly(watchAmount, watchDuration, rate!)
      : null;
  const total =
    monthly && watchDuration
      ? calcTotal(watchAmount, monthly, watchDuration)
      : null;
  const overLimit = watchAmount > BORROWING_POWER;

  const onSubmit = async (data: LoanFormData) => {
    await new Promise((res) => setTimeout(res, 1200)); // simulate API
    setSubmittedData(data);
    setSubmitted(true);
  };

  // ── Success State ────────────────────────────────────────────────────────
  if (submitted && submittedData) {
    return (
      <div
        className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 60%)",
        }}
      >
        <div className="w-full max-w-md border border-emerald-500/25 bg-emerald-500/5 rounded-sm p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <span className="text-emerald-400 text-lg">✓</span>
          </div>
          <p className="font-mono text-[0.6rem] tracking-widest uppercase text-emerald-500/60 mb-3">
            Request submitted
          </p>
          <h2 className="font-sans font-semibold text-2xl tracking-tight text-white mb-2">
            Loan Under Review
          </h2>
          <p className="font-sans text-sm text-white/40 leading-relaxed mb-8">
            Your request for{" "}
            <span className="text-white">
              ${submittedData.amount.toLocaleString()}
            </span>{" "}
            over{" "}
            <span className="text-white">{submittedData.duration} months</span>{" "}
            has been submitted. You&apos;ll be notified once a lender funds your
            pool.
          </p>
          <div className="border-t border-white/8 pt-6 grid grid-cols-2 gap-4 text-left mb-8">
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25">
                Amount
              </p>
              <p className="font-sans font-semibold text-white">
                ${submittedData.amount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25">
                Duration
              </p>
              <p className="font-sans font-semibold text-white">
                {submittedData.duration} months
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25">
                Rate
              </p>
              <p className="font-sans font-semibold text-emerald-400">
                {getRate(submittedData.duration)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25">
                Collateral
              </p>
              <p className="font-sans font-semibold text-white">
                {submittedData.useNftCollateral ? "Remittance NFT" : "None"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="w-full font-sans text-sm border border-white/15 text-white/60 py-3 rounded-sm hover:border-white/35 hover:text-white transition-colors"
          >
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white px-6 py-12"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 70% 40% at 50% -5%, rgba(16,185,129,0.06) 0%, transparent 55%)",
      }}
    >
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-10">
          <p className="font-mono text-[0.6rem] tracking-widest uppercase text-white/30 mb-2">
            RemitLend · Borrow
          </p>
          <h1 className="font-sans font-semibold text-3xl md:text-4xl tracking-tight mb-3">
            Request a Loan
          </h1>
          <p className="font-sans text-sm text-white/40 leading-relaxed max-w-md">
            Your remittance history is your credit. Fill in the details below
            and get matched with a lender on the Stellar network.
          </p>
        </div>

        {/* Credit snapshot */}
        <div className="border border-white/8 bg-white/2 rounded-sm p-4 mb-8 flex flex-wrap gap-6 items-center justify-between">
          <div className="flex gap-6">
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25 mb-0.5">
                Credit Score
              </p>
              <p className="font-sans font-semibold text-lg text-emerald-400">
                {CREDIT_SCORE}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25 mb-0.5">
                Borrowing Power
              </p>
              <p className="font-sans font-semibold text-lg text-white">
                ${BORROWING_POWER.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25 mb-0.5">
                NFT Collateral
              </p>
              <p className="font-sans font-semibold text-sm text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Active
              </p>
            </div>
          </div>
          <Tag>Excellent Standing</Tag>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8"
          noValidate
        >
          {/* ── AMOUNT ──────────────────────────────────────────────────── */}
          <div className="border border-white/8 bg-white/2 rounded-sm p-6">
            <SectionLabel>01 — Loan Amount</SectionLabel>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-sans font-semibold text-white/30 text-lg pointer-events-none">
                $
              </span>
              <input
                type="number"
                placeholder="0"
                {...register("amount", { valueAsNumber: true })}
                className={`w-full bg-transparent border rounded-sm pl-9 pr-4 py-4 font-sans font-semibold text-2xl tracking-tight text-white placeholder-white/15 outline-none transition-colors ${
                  errors.amount
                    ? "border-red-500/50 focus:border-red-500"
                    : overLimit
                      ? "border-amber-500/40 focus:border-amber-500"
                      : "border-white/12 focus:border-white/35"
                }`}
              />
            </div>

            {/* Range hints */}
            <div className="flex justify-between mt-2">
              <span className="font-mono text-[0.58rem] text-white/25">
                Min $100
              </span>
              <span
                className={`font-mono text-[0.58rem] ${
                  overLimit ? "text-amber-400" : "text-white/25"
                }`}
              >
                Max ${BORROWING_POWER.toLocaleString()} (your limit)
              </span>
            </div>

            {overLimit && !errors.amount && (
              <p className="font-mono text-[0.6rem] tracking-wide text-amber-400 mt-1.5 flex items-center gap-1">
                <span>⚠</span> Exceeds your current borrowing power
              </p>
            )}
            <FieldError message={errors.amount?.message} />

            {/* Quick select amounts */}
            <div className="flex flex-wrap gap-2 mt-4">
              {[500, 1000, 2000, 3500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() =>
                    setValue("amount", amt, { shouldValidate: true })
                  }
                  className={`font-mono text-[0.62rem] tracking-widest px-3 py-1.5 border rounded-full transition-colors ${
                    watchAmount === amt
                      ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/8"
                      : "border-white/10 text-white/35 hover:border-white/25 hover:text-white/60"
                  }`}
                >
                  ${amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* ── DURATION ────────────────────────────────────────────────── */}
          <div className="border border-white/8 bg-white/2 rounded-sm p-6">
            <SectionLabel>02 — Loan Duration</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const selected = watchDuration === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`relative flex flex-col items-center gap-1 border rounded-sm py-4 px-3 cursor-pointer transition-colors ${
                      selected
                        ? "border-emerald-500/40 bg-emerald-500/8"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      {...register("duration")}
                      className="sr-only"
                    />
                    <span
                      className={`font-sans font-semibold text-sm ${
                        selected ? "text-white" : "text-white/50"
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span
                      className={`font-mono text-[0.6rem] tracking-widest ${
                        selected ? "text-emerald-400" : "text-white/25"
                      }`}
                    >
                      {opt.rate} APR
                    </span>
                    {selected && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </label>
                );
              })}
            </div>
            <FieldError message={errors.duration?.message} />
          </div>

          {/* ── PURPOSE ─────────────────────────────────────────────────── */}
          <div className="border border-white/8 bg-white/2 rounded-sm p-6">
            <SectionLabel>03 — Loan Purpose</SectionLabel>
            <div className="relative">
              <select
                {...register("purpose")}
                className={`w-full appearance-none bg-transparent border rounded-sm px-4 py-3.5 font-sans text-sm text-white/80 outline-none transition-colors cursor-pointer ${
                  errors.purpose
                    ? "border-red-500/50"
                    : "border-white/12 focus:border-white/35"
                }`}
              >
                <option value="" className="bg-[#0a0a0a] text-white/50">
                  Select purpose
                </option>
                {PURPOSE_OPTIONS.map((p) => (
                  <option
                    key={p.value}
                    value={p.value}
                    className="bg-[#111] text-white"
                  >
                    {p.label}
                  </option>
                ))}
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none text-xs">
                ↕
              </span>
            </div>
            <FieldError message={errors.purpose?.message} />
          </div>

          {/* ── COLLATERAL ──────────────────────────────────────────────── */}
          <div className="border border-white/8 bg-white/2 rounded-sm p-6">
            <SectionLabel>04 — Collateral</SectionLabel>

            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  {...register("useNftCollateral")}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 border rounded-sm flex items-center justify-center transition-colors ${
                    watchNft
                      ? "border-emerald-500 bg-emerald-500/20"
                      : "border-white/20 group-hover:border-white/40"
                  }`}
                  onClick={() => setValue("useNftCollateral", !watchNft)}
                >
                  {watchNft && (
                    <span className="text-emerald-400 text-xs">✓</span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <p className="font-sans text-sm font-semibold text-white mb-1">
                  Use Remittance NFT as collateral
                </p>
                <p className="font-sans text-xs text-white/40 leading-relaxed">
                  Your Remittance NFT (score: {CREDIT_SCORE}) acts as verifiable
                  on-chain proof of reliability. Using it as collateral unlocks
                  better rates and higher loan limits.
                </p>
                {watchNft && (
                  <div className="mt-3 flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/5 rounded-sm px-3 py-2 w-fit">
                    <span className="text-emerald-400 text-xs">✦</span>
                    <span className="font-mono text-[0.6rem] tracking-widest text-emerald-400">
                      NFT Collateral Active — Rate reduced by 0.5%
                    </span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* ── LOAN SUMMARY ────────────────────────────────────────────── */}
          {watchAmount > 0 && watchDuration && monthly && (
            <div className="border border-white/12 bg-white/1.5 rounded-sm p-6">
              <SectionLabel>Loan Summary</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25 mb-1">
                    Amount
                  </p>
                  <p className="font-sans font-semibold text-white">
                    ${watchAmount?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25 mb-1">
                    Interest Rate
                  </p>
                  <p className="font-sans font-semibold text-emerald-400">
                    {rate}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25 mb-1">
                    Monthly Payment
                  </p>
                  <p className="font-sans font-semibold text-white">
                    ${monthly}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25 mb-1">
                    Total Repayable
                  </p>
                  <p className="font-sans font-semibold text-white">${total}</p>
                </div>
              </div>
              <div className="mt-4 h-px bg-white/6" />
              <p className="font-mono text-[0.58rem] text-white/20 mt-3">
                Terms are locked on-chain at submission and cannot be altered by
                the lender.
              </p>
            </div>
          )}

          {/* ── ACKNOWLEDGEMENT ─────────────────────────────────────────── */}
          <div className="border border-white/8 bg-white/2 rounded-sm p-6">
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  {...register("agreeFees")}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 border rounded-sm flex items-center justify-center transition-colors ${
                    errors.agreeFees
                      ? "border-red-500/60"
                      : watch("agreeFees")
                        ? "border-emerald-500 bg-emerald-500/20"
                        : "border-white/20 group-hover:border-white/40"
                  }`}
                  onClick={() =>
                    setValue("agreeFees", !watchAgreeFees, {
                      shouldValidate: true,
                    })
                  }
                >
                  {watchAgreeFees && (
                    <span className="text-emerald-400 text-xs">✓</span>
                  )}
                </div>
              </div>
              <div>
                <p className="font-sans text-sm text-white/70 leading-relaxed">
                  I understand the loan terms, interest rates, and repayment
                  schedule. I acknowledge that failure to repay may impact my
                  Remittance NFT credit score on-chain.
                </p>
                <FieldError message={errors.agreeFees?.message} />
              </div>
            </label>
          </div>

          {/* ── SUBMIT ──────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full font-sans font-semibold text-sm bg-white text-black py-4 rounded-sm hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border border-black/30 border-t-black rounded-full animate-spin" />
                Submitting to Stellar...
              </>
            ) : (
              "Submit Loan Request →"
            )}
          </button>

          <p className="font-mono text-[0.58rem] text-center text-white/20 tracking-wide">
            Powered by Soroban smart contracts · All terms recorded on-chain
          </p>
        </form>
      </div>
    </div>
  );
}
