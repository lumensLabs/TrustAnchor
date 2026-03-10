"use client";

import { useState } from "react";

// ── Hardcoded loan data ────────────────────────────────────────────────────
const LOANS = [
  {
    id: "LN-0041",
    totalAmount: 1500,
    amountRepaid: 900,
    nextPaymentAmount: 134.22,
    nextPaymentDate: new Date(
      Date.now() + 8 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 8 days
    interestRate: "6.2%",
    duration: 12,
    monthsRemaining: 5,
    purpose: "personal",
    collateral: "nft" as const,
  },
  {
    id: "LN-0038",
    totalAmount: 800,
    amountRepaid: 200,
    nextPaymentAmount: 89.5,
    nextPaymentDate: new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 2 days
    interestRate: "5.8%",
    duration: 6,
    monthsRemaining: 2,
    purpose: "business",
    collateral: "nft" as const,
  },
  {
    id: "LN-0029",
    totalAmount: 3000,
    amountRepaid: 2800,
    nextPaymentAmount: 201.0,
    nextPaymentDate: new Date(
      Date.now() - 1 * 24 * 60 * 60 * 1000,
    ).toISOString(), // overdue
    interestRate: "7.1%",
    duration: 24,
    monthsRemaining: 1,
    purpose: "education",
    collateral: "none" as const,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function getDaysUntil(dateStr: string) {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function urgency(days: number) {
  if (days <= 3)
    return {
      color: "text-red-400",
      bg: "bg-red-500/8",
      border: "border-red-500/25",
      dot: "bg-red-500",
      bar: "#ef4444",
      label: "Urgent",
      btn: "bg-red-500 text-white hover:bg-red-400",
    };
  if (days <= 10)
    return {
      color: "text-amber-400",
      bg: "bg-amber-500/8",
      border: "border-amber-500/25",
      dot: "bg-amber-500",
      bar: "#f59e0b",
      label: "Due soon",
      btn: "bg-amber-500 text-black hover:bg-amber-400",
    };
  return {
    color: "text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/15",
    dot: "bg-emerald-500",
    bar: "#10b981",
    label: "On track",
    btn: "bg-white text-black hover:opacity-85",
  };
}

// ── Repay Modal ────────────────────────────────────────────────────────────
function RepayModal({
  loan,
  onClose,
  onConfirm,
}: {
  loan: (typeof LOANS)[0];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-[#0f0f0f] border border-white/12 rounded-sm p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-[0.58rem] tracking-widest uppercase text-white/30 mb-0.5">
              Confirm repayment
            </p>
            <p className="font-sans font-semibold text-white">{loan.id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 border border-white/10 rounded-sm flex items-center justify-center text-white/30 hover:text-white/60 transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        <div className="border border-white/8 bg-white/[0.02] rounded-sm p-4 mb-5 space-y-3">
          <div className="flex justify-between">
            <span className="font-mono text-[0.58rem] uppercase tracking-widest text-white/30">
              Payment due
            </span>
            <span className="font-sans text-sm font-semibold text-white">
              ${loan.nextPaymentAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[0.58rem] uppercase tracking-widest text-white/30">
              Balance after
            </span>
            <span className="font-sans text-sm text-white/60">
              $
              {(
                loan.totalAmount -
                loan.amountRepaid -
                loan.nextPaymentAmount
              ).toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-white/6" />
          <div className="flex justify-between">
            <span className="font-mono text-[0.58rem] uppercase tracking-widest text-white/30">
              Network
            </span>
            <span className="font-mono text-[0.58rem] text-white/50">
              Stellar Testnet
            </span>
          </div>
        </div>

        <p className="font-sans text-xs text-white/30 leading-relaxed mb-5">
          This triggers a Soroban smart contract transaction. Your Remittance
          NFT score will be updated on-chain upon confirmation.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 font-sans text-sm border border-white/12 text-white/50 py-3 rounded-sm hover:border-white/30 hover:text-white/80 transition-colors disabled:opacity-30"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 font-sans font-semibold text-sm bg-white text-black py-3 rounded-sm hover:opacity-85 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3 h-3 border border-black/20 border-t-black rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single Card ────────────────────────────────────────────────────────────
function LoanCard({ loan }: { loan: (typeof LOANS)[0] }) {
  const [showModal, setShowModal] = useState(false);
  const [paid, setPaid] = useState(false);

  const days = getDaysUntil(loan.nextPaymentDate);
  const u = urgency(days);
  const progress = (loan.amountRepaid / loan.totalAmount) * 100;
  const outstanding = loan.totalAmount - loan.amountRepaid;

  return (
    <>
      <div
        className={`relative border rounded-sm overflow-hidden ${u.border} ${u.bg}`}
      >
        {/* Top accent stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${u.bar} 40%, transparent)`,
          }}
        />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${u.dot} ${days <= 10 ? "animate-pulse" : ""}`}
                />
                <span className="font-mono text-[0.58rem] tracking-widest uppercase text-white/35">
                  {loan.id}
                </span>
              </div>
              <p className="font-sans font-semibold text-white capitalize">
                {loan.purpose} Loan
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`font-mono text-[0.58rem] tracking-widest uppercase px-2 py-0.5 rounded-full border ${u.color} ${u.border}`}
              >
                {u.label}
              </span>
              {loan.collateral === "nft" && (
                <span className="font-mono text-[0.55rem] tracking-widest uppercase text-emerald-400/60 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                  ✦ NFT
                </span>
              )}
            </div>
          </div>

          {/* Balance + next payment */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="border border-white/6 bg-black/20 rounded-sm p-3">
              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25 mb-1.5">
                Outstanding
              </p>
              <p className="font-sans font-semibold text-xl tracking-tight text-white">
                $
                {outstanding.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="font-mono text-[0.55rem] text-white/25 mt-0.5">
                of ${loan.totalAmount.toLocaleString()}
              </p>
            </div>
            <div
              className={`border rounded-sm p-3 ${days <= 3 ? "border-red-500/20 bg-red-500/5" : days <= 10 ? "border-amber-500/15 bg-amber-500/5" : "border-white/6 bg-black/20"}`}
            >
              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25 mb-1.5">
                Next Payment
              </p>
              <p
                className={`font-sans font-semibold text-xl tracking-tight ${u.color}`}
              >
                ${loan.nextPaymentAmount.toFixed(2)}
              </p>
              <p className="font-mono text-[0.55rem] text-white/25 mt-0.5">
                {formatDate(loan.nextPaymentDate)}
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div
            className={`flex items-center gap-2 border rounded-sm px-3 py-2 mb-5 ${u.border} ${u.bg}`}
          >
            <span
              className={`font-mono text-[0.58rem] tracking-widest ${u.color}`}
            >
              {days <= 0
                ? "⚠ Overdue"
                : days === 1
                  ? "⚡ Due tomorrow"
                  : `${days} days until next payment`}
            </span>
            <div className="flex-1" />
            <span className="font-mono text-[0.55rem] text-white/25">
              {loan.monthsRemaining}mo remaining
            </span>
          </div>

          {/* Progress */}
          <div className="mb-5">
            <div className="flex justify-between mb-1.5">
              <span className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25">
                Repayment Progress
              </span>
              <span className="font-mono text-[0.55rem] text-white/35">
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: u.bar }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[0.52rem] text-white/20">
                ${loan.amountRepaid.toLocaleString()} paid
              </span>
              <span className="font-mono text-[0.52rem] text-white/20">
                ${outstanding.toLocaleString()} left
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 pb-5 border-b border-white/6">
            {[
              { label: "Rate", value: loan.interestRate },
              { label: "Duration", value: `${loan.duration}mo` },
              {
                label: "Collateral",
                value: loan.collateral === "nft" ? "Remittance NFT" : "None",
              },
            ].map((m) => (
              <div key={m.label}>
                <p className="font-mono text-[0.52rem] uppercase tracking-widest text-white/20">
                  {m.label}
                </p>
                <p className="font-sans text-xs font-semibold text-white/70">
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {/* Repay button */}
          <div className="pt-4">
            {paid ? (
              <div className="flex items-center justify-center gap-2 py-3 border border-emerald-500/25 bg-emerald-500/8 rounded-sm">
                <span className="text-emerald-400 text-sm">✓</span>
                <span className="font-mono text-[0.62rem] tracking-widest uppercase text-emerald-400">
                  Payment submitted
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className={`w-full font-sans font-semibold text-sm py-3.5 rounded-sm transition-all ${u.btn}`}
              >
                {days <= 0 ? "⚠ Repay Now — Overdue" : "Repay →"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <RepayModal
          loan={loan}
          onClose={() => setShowModal(false)}
          onConfirm={() => {
            setShowModal(false);
            setPaid(true);
          }}
        />
      )}
    </>
  );
}

// ── Default Export ─────────────────────────────────────────────────────────
export default function ActiveLoanCard() {
  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white px-6 py-12"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 70% 40% at 50% -5%, rgba(16,185,129,0.05) 0%, transparent 55%)",
      }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="font-mono text-[0.6rem] tracking-widest uppercase text-white/30 mb-2">
            RemitLend · Active Loans
          </p>
          <h1 className="font-sans font-semibold text-2xl tracking-tight">
            Your Loans
          </h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LOANS.map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}
        </div>
      </div>
    </div>
  );
}
