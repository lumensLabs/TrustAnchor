import type { ReactNode } from "react";
import Link from "next/link";
import { WalletButton } from "@/app/components/WalletButton";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
            TrustAnchor
          </Link>
          <nav className="hidden items-center gap-5 text-sm sm:flex">
            <Link href="/" className="text-foreground/80 transition hover:text-foreground">
              Home
            </Link>
            <Link href="/dashboard" className="text-foreground/80 transition hover:text-foreground">
              Dashboard
            </Link>
            <a
              href="https://developers.stellar.org/"
              target="_blank"
              rel="noreferrer"
              className="text-foreground/80 transition hover:text-foreground"
            >
              Stellar Docs
            </a>
          </nav>
          <WalletButton />
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/70 bg-surface-muted/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-foreground/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Built with Next.js App Router, Tailwind CSS, and Soroban wallet flows.</p>
          <p>TrustAnchor (c) 2026</p>
        </div>
      </footer>
    </div>
  );
}
