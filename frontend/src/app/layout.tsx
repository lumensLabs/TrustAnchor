import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/app/components/providers/QueryProvider";
import { WalletProvider } from "@/app/contexts/WalletContext";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { AppShell } from "@/app/components/layout/AppShell";

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RemitLend - Borderless P2P Lending & Remittance",
  description:
    "Global peer-to-peer lending and instant remittances powered by blockchain technology. Send money and grow your wealth across borders.",
  keywords: [
    "P2P Lending",
    "Remittance",
    "Blockchain",
    "DeFi",
    "Global Payments",
    "Borderless Finance",
  ],
  authors: [{ name: "RemitLend Team" }],
  openGraph: {
    title: "RemitLend - Borderless P2P Lending & Remittance",
    description:
      "Global peer-to-peer lending and instant remittances powered by blockchain technology. Send money and grow your wealth across borders.",
    url: "https://remitlend.com",
    siteName: "RemitLend",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RemitLend - Borderless P2P Lending",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RemitLend - Borderless P2P Lending & Remittance",
    description:
      "Global peer-to-peer lending and instant remittances powered by blockchain technology. Send money and grow your wealth across borders.",
    images: ["/og-image.png"],
    creator: "@remitlend",
  },
  metadataBase: new URL("https://remitlend.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${headingFont.variable} ${bodyFont.variable} antialiased`}
      >
        <QueryProvider>
          <WalletProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
