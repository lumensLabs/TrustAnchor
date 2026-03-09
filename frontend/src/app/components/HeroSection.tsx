import Link from "next/link";

// ── Value prop data ────────────────────────────────────────────────────────
const BORROWER_PROPS = [
  {
    title: "Credit from Remittances",
    description:
      "Your monthly cross-border transfers are your credit history. We turn them into a real score lenders trust.",
  },
  {
    title: "Fair, Transparent Rates",
    description:
      "No predatory fees. Loan terms are set on-chain, fully visible, and can't be changed after you sign.",
  },
  {
    title: "Self-Custody Wallets",
    description:
      "Your assets stay yours. Connect your Freighter wallet and keep full control at every step.",
  },
];

const LENDER_PROPS = [
  {
    title: "Transparent Yield",
    description:
      "Earn interest by funding audited borrowing pools on the Stellar network. See exactly where your liquidity goes.",
  },
  {
    title: "On-Chain Risk Data",
    description:
      "Every borrower's Remittance NFT is a verifiable, on-chain proof of reliability — no black-box scores.",
  },
  {
    title: "Decentralised Pools",
    description:
      "Soroban smart contracts handle everything. No intermediary holds funds. No hidden counterparty risk.",
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-(--foreground)/15 rounded-full px-3 py-1 font-mono text-[0.68rem] tracking-widest uppercase text-(--foreground)/50">
      {children}
    </span>
  );
}

function Dot() {
  return (
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-sans font-semibold text-2xl tracking-tight text-foreground">
        {value}
      </span>
      <span className="font-mono text-[0.65rem] tracking-widest uppercase text-(--foreground)/40">
        {label}
      </span>
    </div>
  );
}

function PropCard({
  title,
  description,
  index,
}: {
  title: string;
  description: string;
  index: number;
}) {
  return (
    <div className="group flex flex-col gap-3 border-t border-(--foreground)/10 pt-6 hover:border-(--foreground)/30 transition-colors duration-300">
      <span className="font-mono text-[0.65rem] tracking-widest text-(--foreground)/30">
        0{index + 1}
      </span>
      <p className="font-sans font-semibold text-[0.95rem] text-foreground">
        {title}
      </p>
      <p className="font-sans text-[0.875rem] leading-relaxed text-(--foreground)/50">
        {description}
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function HeroSection() {
  return (
    <div className="bg-background text-foreground">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 md:px-12 pt-24 pb-20 md:pt-32 md:pb-28">
        {/* Eyebrow badges */}
        <div className="animate-fade-up flex flex-wrap gap-2 mb-10">
          <Badge>
            <Dot />
            Live on Stellar Testnet
          </Badge>
          <Badge>Soroban Smart Contracts</Badge>
          <Badge>Remittance NFTs</Badge>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up animation-delay-100 font-sans font-semibold text-[clamp(2.6rem,6vw,5.5rem)] leading-[1.06] tracking-tight max-w-4xl mb-6">
          Your remittances
          <br />
          <span className="text-(--foreground)/35">are your</span> credit
          history.
        </h1>

        {/* Sub-copy */}
        <p className="animate-fade-up animation-delay-200 font-sans text-[clamp(1rem,1.5vw,1.15rem)] leading-relaxed text-(--foreground)/55 max-w-[52ch] mb-10">
          RemitLend turns monthly cross-border transfers into a verifiable
          credit score — giving migrant workers access to fair loans and giving
          lenders transparent, on-chain yield.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up animation-delay-300 flex flex-wrap gap-3 mb-16">
          <Link
            href="/borrow"
            className="font-sans font-semibold text-sm bg-foreground text-background px-7 py-3.5 rounded-sm hover:opacity-80 transition-opacity"
          >
            Get a loan
          </Link>
          <Link
            href="/lend"
            className="font-sans text-sm border border-(--foreground)/20 text-(--foreground)/70 px-7 py-3.5 rounded-sm hover:border-(--foreground)/50 hover:text-foreground transition-colors"
          >
            Start lending →
          </Link>
        </div>

        {/* Stats */}
        <div className="animate-fade-up animation-delay-400">
          <div className="h-px bg-(--foreground)/8 mb-8" />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-8 max-w-lg">
            <StatPill value="0%" label="Predatory fees" />
            <StatPill value="NFT" label="Collateral proof" />
            <StatPill value="Stellar" label="Network" />
          </div>
        </div>
      </section>

      {/* ── VALUE PROP ────────────────────────────────────────────────────── */}
      <section className="border-t border-(--foreground)/8">
        <div className="mx-auto max-w-6xl px-6 md:px-12 py-20 md:py-28">
          {/* Section label */}
          <p className="font-mono text-[0.68rem] tracking-widest uppercase text-(--foreground)/35 mb-14">
            Built for both sides of the transfer
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
            {/* Borrowers column */}
            <div>
              <div className="flex items-center gap-2 mb-8">
                <span className="font-mono text-[0.68rem] tracking-widest uppercase text-(--foreground)/35">
                  For Borrowers
                </span>
                <div className="flex-1 h-px bg-(--foreground)/8" />
              </div>
              <h2 className="font-sans font-semibold text-[clamp(1.4rem,2.5vw,2rem)] tracking-tight mb-10 leading-snug">
                Prove reliability.
                <br />
                <span className="text-(--foreground)/35">Access capital.</span>
              </h2>
              <div className="flex flex-col gap-8">
                {BORROWER_PROPS.map((prop, i) => (
                  <PropCard key={prop.title} {...prop} index={i} />
                ))}
              </div>
            </div>

            {/* Lenders column */}
            <div>
              <div className="flex items-center gap-2 mb-8">
                <span className="font-mono text-[0.68rem] tracking-widest uppercase text-(--foreground)/35">
                  For Lenders
                </span>
                <div className="flex-1 h-px bg-(--foreground)/8" />
              </div>
              <h2 className="font-sans font-semibold text-[clamp(1.4rem,2.5vw,2rem)] tracking-tight mb-10 leading-snug">
                Real yield.
                <br />
                <span className="text-(--foreground)/35">Verifiable risk.</span>
              </h2>
              <div className="flex flex-col gap-8">
                {LENDER_PROPS.map((prop, i) => (
                  <PropCard key={prop.title} {...prop} index={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
