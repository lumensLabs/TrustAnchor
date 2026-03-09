"use client";

import { useState } from "react";
import Link from "next/link";

// ── Mock Data ──────────────────────────────────────────────────────────────
const USER = {
  name: "Amara Osei",
  wallet: "GDQP...7XKT",
  since: "Jan 2023",
  country: "GH → UK",
};

const CREDIT_SCORE = 724;
const CREDIT_MAX = 1000;
const CREDIT_CHANGE = +18;

const STATS = [
  {
    label: "Borrowing Power",
    value: "$4,200",
    sub: "Available now",
    accent: true,
  },
  { label: "Active Loans", value: "2", sub: "1 due in 12 days", accent: false },
  { label: "Total Repaid", value: "$8,650", sub: "Lifetime", accent: false },
  {
    label: "Remittances",
    value: "34",
    sub: "Verified transfers",
    accent: false,
  },
];

const ACTIVE_LOANS = [
  {
    id: "LN-0041",
    amount: 1500,
    repaid: 900,
    rate: "6.2%",
    nextDue: "Mar 21, 2026",
    daysLeft: 12,
    status: "on-track",
  },
  {
    id: "LN-0038",
    amount: 800,
    repaid: 200,
    rate: "5.8%",
    nextDue: "Apr 04, 2026",
    daysLeft: 26,
    status: "on-track",
  },
];

const REMITTANCES = [
  {
    date: "Feb 28",
    amount: "$320",
    from: "London, UK",
    to: "Accra, GH",
    status: "verified",
  },
  {
    date: "Jan 31",
    amount: "$320",
    from: "London, UK",
    to: "Accra, GH",
    status: "verified",
  },
  {
    date: "Dec 30",
    amount: "$290",
    from: "London, UK",
    to: "Accra, GH",
    status: "verified",
  },
  {
    date: "Nov 28",
    amount: "$310",
    from: "London, UK",
    to: "Accra, GH",
    status: "verified",
  },
];

const SCORE_HISTORY = [58, 62, 61, 65, 67, 66, 70, 69, 72, 71, 73, 72.4];

// ── Helpers ────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 700) return "#10b981"; // emerald
  if (score >= 500) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

function scoreLabel(score: number) {
  if (score >= 700) return "Excellent";
  if (score >= 600) return "Good";
  if (score >= 500) return "Fair";
  return "Poor";
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Dot({ color = "bg-emerald-500" }: { color?: string }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-white/10 rounded-full px-3 py-0.5 font-mono text-[0.62rem] tracking-widest uppercase text-white/40">
      {children}
    </span>
  );
}

function ScoreArc({ score }: { score: number }) {
  const pct = score / CREDIT_MAX;
  const r = 72;
  const circ = Math.PI * r; // half circle
  const dash = pct * circ;
  const gap = circ - dash;
  const color = scoreColor(score);

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width="180"
        height="100"
        viewBox="0 0 180 100"
        className="overflow-visible"
      >
        {/* Track */}
        <path
          d="M 14 90 A 76 76 0 0 1 166 90"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d="M 14 90 A 76 76 0 0 1 166 90"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const angle = Math.PI * t;
          const x = 90 - 76 * Math.cos(angle);
          const y = 90 - 76 * Math.sin(angle);
          return (
            <circle key={t} cx={x} cy={y} r="2" fill="rgba(255,255,255,0.15)" />
          );
        })}
      </svg>
      {/* Score number */}
      <div className="absolute bottom-0 flex flex-col items-center">
        <span
          className="font-sans font-semibold text-[2.8rem] leading-none tracking-tight"
          style={{ color }}
        >
          {score}
        </span>
        <span className="font-mono text-[0.6rem] tracking-widest uppercase text-white/35 mt-1">
          {scoreLabel(score)} · /{CREDIT_MAX}
        </span>
      </div>
    </div>
  );
}

function MiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 120;
  const h = 36;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const area = `0,${h} ${polyline} ${w},${h}`;

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#chartGrad)" />
      <polyline
        points={polyline}
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Last dot */}
      {(() => {
        const last = pts[pts.length - 1].split(",");
        return <circle cx={last[0]} cy={last[1]} r="3" fill="#10b981" />;
      })()}
    </svg>
  );
}

function LoanBar({ repaid, total }: { repaid: number; total: number }) {
  const pct = (repaid / total) * 100;
  return (
    <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const [activeTab, setActiveTab] = useState<"loans" | "remittances">("loans");

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.07) 0%, transparent 60%)",
      }}
    >
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="border-b border-white/6 px-6 md:px-12 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-sans font-semibold text-sm tracking-tight">
            Remit<span className="text-emerald-500">Lend</span>
          </span>
          <div className="hidden md:flex items-center gap-5">
            {["Dashboard", "Borrow", "Repay", "History"].map((item) => (
              <button
                key={item}
                className={`font-mono text-[0.65rem] tracking-widest uppercase transition-colors ${
                  item === "Dashboard"
                    ? "text-white"
                    : "text-white/35 hover:text-white/60"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tag>
            <Dot />
            Testnet
          </Tag>
          <div className="flex items-center gap-2 border border-white/10 rounded-full px-3 py-1.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <span className="text-[0.5rem] text-emerald-400 font-bold">
                AO
              </span>
            </div>
            <span className="font-mono text-[0.62rem] text-white/50 tracking-wider">
              {USER.wallet}
            </span>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 md:px-12 py-10 space-y-8">
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[0.62rem] tracking-widest uppercase text-white/30 mb-1">
              Welcome back
            </p>
            <h1 className="font-sans font-semibold text-2xl md:text-3xl tracking-tight">
              {USER.name}
            </h1>
            <p className="font-mono text-[0.62rem] tracking-widest text-white/30 mt-1">
              {USER.country} · Member since {USER.since}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/borrow"
              className="font-sans font-semibold text-xs bg-white text-black px-5 py-2.5 rounded-sm hover:opacity-80 transition-opacity"
            >
              + New Loan
            </Link>
            <button className="font-sans text-xs border border-white/15 text-white/60 px-5 py-2.5 rounded-sm hover:border-white/35 hover:text-white transition-colors">
              Send Remittance
            </button>
          </div>
        </div>

        {/* ── TOP STATS ROW ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map((s, i) => (
            <div
              key={i}
              className={`relative border rounded-sm p-5 transition-colors group ${
                s.accent
                  ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/8"
                  : "border-white/8 bg-white/2 hover:bg-white/4"
              }`}
            >
              <p className="font-mono text-[0.6rem] tracking-widest uppercase text-white/30 mb-2">
                {s.label}
              </p>
              <p
                className={`font-sans font-semibold text-2xl tracking-tight ${
                  s.accent ? "text-emerald-400" : "text-white"
                }`}
              >
                {s.value}
              </p>
              <p className="font-mono text-[0.6rem] text-white/30 mt-1">
                {s.sub}
              </p>
              {s.accent && (
                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* ── MIDDLE ROW: Score + Chart + NFT ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Credit Score */}
          <div className="border border-white/8 bg-white/2 rounded-sm p-6 flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
              <p className="font-mono text-[0.6rem] tracking-widest uppercase text-white/30">
                Credit Score
              </p>
              <span className="font-mono text-[0.6rem] text-emerald-400">
                +{CREDIT_CHANGE} this month
              </span>
            </div>
            <ScoreArc score={CREDIT_SCORE} />
            <div className="w-full grid grid-cols-3 gap-2 pt-2 border-t border-white/6">
              {[
                { label: "Poor", range: "0–499" },
                { label: "Fair", range: "500–699" },
                { label: "Excellent", range: "700+" },
              ].map((tier) => (
                <div
                  key={tier.label}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="font-mono text-[0.55rem] text-white/25 uppercase tracking-widest">
                    {tier.label}
                  </span>
                  <span className="font-mono text-[0.55rem] text-white/20">
                    {tier.range}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Score History Chart */}
          <div className="border border-white/8 bg-white/2 rounded-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[0.6rem] tracking-widest uppercase text-white/30">
                Score History
              </p>
              <span className="font-mono text-[0.6rem] text-white/25">
                12 months
              </span>
            </div>
            <div className="flex-1 flex items-end">
              <div className="w-full">
                <svg viewBox="0 0 280 80" className="w-full overflow-visible">
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const data = SCORE_HISTORY;
                    const max = Math.max(...data);
                    const min = Math.min(...data) - 2;
                    const W = 280;
                    const H = 70;
                    const pts = data.map((v, i) => ({
                      x: (i / (data.length - 1)) * W,
                      y: H - ((v - min) / (max - min)) * H,
                    }));
                    const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
                    const area = `0,${H} ${line} ${W},${H}`;
                    return (
                      <>
                        <polygon points={area} fill="url(#areaGrad)" />
                        <polyline
                          points={line}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        {pts.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={i === pts.length - 1 ? "3.5" : "2"}
                            fill={
                              i === pts.length - 1
                                ? "#10b981"
                                : "rgba(16,185,129,0.4)"
                            }
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
                <div className="flex justify-between mt-2">
                  {[
                    "M",
                    "A",
                    "M",
                    "J",
                    "J",
                    "A",
                    "S",
                    "O",
                    "N",
                    "D",
                    "J",
                    "F",
                  ].map((m, i) => (
                    <span
                      key={i}
                      className="font-mono text-[0.5rem] text-white/20"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-white/6 pt-3 flex items-center justify-between">
              <span className="font-mono text-[0.6rem] text-white/30">
                Started at 580
              </span>
              <span className="font-mono text-[0.6rem] text-emerald-400">
                ↑ {CREDIT_SCORE - 580} pts total
              </span>
            </div>
          </div>

          {/* Remittance NFT */}
          <div className="border border-white/8 bg-white/2 rounded-sm p-6 flex flex-col gap-4 relative overflow-hidden">
            {/* Background texture */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 8px)",
              }}
            />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-[0.6rem] tracking-widest uppercase text-white/30">
                  Remittance NFT
                </p>
                <Tag>
                  <Dot />
                  On-chain
                </Tag>
              </div>

              {/* NFT Card */}
              <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-sm p-4 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-sans font-semibold text-sm text-emerald-300">
                      #RN-{USER.wallet.replace("...", "").slice(-4)}
                    </p>
                    <p className="font-mono text-[0.6rem] text-white/30 mt-0.5">
                      Proof of Reliability
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <span className="text-emerald-400 text-xs">✦</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="font-mono text-[0.55rem] text-white/25 uppercase tracking-widest">
                      Score
                    </p>
                    <p className="font-sans font-semibold text-sm text-emerald-400">
                      {CREDIT_SCORE}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[0.55rem] text-white/25 uppercase tracking-widest">
                      Transfers
                    </p>
                    <p className="font-sans font-semibold text-sm text-white">
                      34
                    </p>
                  </div>
                </div>
              </div>

              <p className="font-sans text-[0.78rem] text-white/40 leading-relaxed">
                Your NFT is your credit identity — fully on-chain and verifiable
                by any lender on the Stellar network.
              </p>
            </div>
          </div>
        </div>

        {/* ── BOTTOM: Loans + Remittances ─────────────────────────────────── */}
        <div className="border border-white/8 bg-white/2 rounded-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/8">
            {(["loans", "remittances"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-mono text-[0.62rem] tracking-widest uppercase transition-colors ${
                  activeTab === tab
                    ? "text-white border-b border-white -mb-px"
                    : "text-white/30 hover:text-white/55"
                }`}
              >
                {tab === "loans"
                  ? `Active Loans (${ACTIVE_LOANS.length})`
                  : "Remittance History"}
              </button>
            ))}
          </div>

          {/* Loans Tab */}
          {activeTab === "loans" && (
            <div className="divide-y divide-white/6">
              {ACTIVE_LOANS.map((loan) => (
                <div
                  key={loan.id}
                  className="px-6 py-5 hhover:bg-white/2 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* ID + status */}
                    <div className="flex items-center gap-3 sm:w-28">
                      <Dot color="bg-emerald-500" />
                      <span className="font-mono text-[0.65rem] tracking-widest text-white/50">
                        {loan.id}
                      </span>
                    </div>

                    {/* Amount + progress */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-sans font-semibold text-sm">
                          ${loan.amount.toLocaleString()}
                        </span>
                        <span className="font-mono text-[0.6rem] text-white/35">
                          ${loan.repaid} repaid
                        </span>
                      </div>
                      <LoanBar repaid={loan.repaid} total={loan.amount} />
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-6 sm:gap-8">
                      <div>
                        <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25">
                          Rate
                        </p>
                        <p className="font-sans text-sm font-semibold text-white">
                          {loan.rate}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25">
                          Next due
                        </p>
                        <p className="font-sans text-xs text-white/70">
                          {loan.nextDue}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/25">
                          Days left
                        </p>
                        <p
                          className={`font-sans font-semibold text-sm ${
                            loan.daysLeft <= 14
                              ? "text-amber-400"
                              : "text-white"
                          }`}
                        >
                          {loan.daysLeft}d
                        </p>
                      </div>
                      <button className="font-sans text-xs border border-white/12 text-white/50 px-4 py-1.5 rounded-sm hover:border-white/30 hover:text-white transition-colors whitespace-nowrap">
                        Repay →
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary footer */}
              <div className="px-6 py-4 bg-white/1 flex flex-wrap gap-6">
                <div>
                  <span className="font-mono text-[0.58rem] uppercase tracking-widest text-white/25">
                    Total outstanding
                  </span>
                  <span className="font-sans font-semibold text-sm text-white ml-3">
                    $
                    {ACTIVE_LOANS.reduce(
                      (a, l) => a + (l.amount - l.repaid),
                      0,
                    ).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[0.58rem] uppercase tracking-widest text-white/25">
                    Avg rate
                  </span>
                  <span className="font-sans font-semibold text-sm text-white ml-3">
                    6.0%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Remittances Tab */}
          {activeTab === "remittances" && (
            <div className="divide-y divide-white/6">
              {REMITTANCES.map((r, i) => (
                <div
                  key={i}
                  className="px-6 py-4 flex items-center justify-between hover:bg-white/2 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/4 border border-white/8 flex items-center justify-center">
                      <span className="text-white/30 text-xs">→</span>
                    </div>
                    <div>
                      <p className="font-sans text-sm text-white/80">
                        {r.from} <span className="text-white/30 mx-1">→</span>
                        {r.to}
                      </p>
                      <p className="font-mono text-[0.58rem] text-white/30 mt-0.5">
                        {r.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-sans font-semibold text-sm">
                      {r.amount}
                    </span>
                    <Tag>
                      <Dot />
                      {r.status}
                    </Tag>
                  </div>
                </div>
              ))}
              <div className="px-6 py-4 bg-white/[0.01]">
                <button className="font-mono text-[0.62rem] tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors">
                  View all transfers →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER NOTE ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-4">
          <p className="font-mono text-[0.58rem] text-white/20 tracking-wider">
            All data is verifiable on the Stellar testnet
          </p>
          <p className="font-mono text-[0.58rem] text-white/20 tracking-wider">
            Last synced: just now
          </p>
        </div>
      </div>
    </div>
  );
}
