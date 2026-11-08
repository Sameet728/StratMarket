import { Suspense } from "react";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TopProgressBar } from "@/components/TopProgressBar";
import { HeaderNav } from "@/components/HeaderNav";
import { DockNav } from "@/components/DockNav";
import { Footer } from "@/components/Footer";
import { PageTransitionWipe } from "@/components/PageTransitionWipe";
import { SpotlightCursor } from "@/components/SpotlightCursor";

export const metadata: Metadata = {
  metadataBase: new URL("https://stratmarket.elvariscapital.in"),
  title: {
    default: "StratMarket by Elvaris Capital — Quantitative Trading Strategy Marketplace",
    template: "%s | StratMarket by Elvaris Capital (elvariscapital.in)",
  },
  description:
    "StratMarket is an institutional algorithmic trading strategy marketplace by Elvaris Capital (https://elvariscapital.in). Discover, backtest, and stream verified quantitative Pine Script and Python MT5 strategies with real-time signals and sovereign risk controls.",
  keywords: [
    "StratMarket",
    "Elvaris Capital",
    "elvariscapital.in",
    "quantitative trading",
    "algorithmic trading marketplace",
    "Pine Script trading strategies",
    "Python MT5 trading bot",
    "institutional quant research",
    "XAUUSD algorithmic trading",
    "low drawdown trading strategies",
    "real-time trade signals",
    "systematic trading models",
  ],
  authors: [{ name: "Elvaris Capital", url: "https://elvariscapital.in" }],
  creator: "Elvaris Capital",
  publisher: "Elvaris Capital (https://elvariscapital.in)",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://stratmarket.elvariscapital.in",
    siteName: "StratMarket by Elvaris Capital",
    title: "StratMarket by Elvaris Capital — Quantitative Trading Strategy Marketplace",
    description:
      "A product by Elvaris Capital (parent org: elvariscapital.in). Access institutional algorithmic strategies, tick-level research reports, live interactive charts, and automated broker execution.",
  },
  twitter: {
    card: "summary_large_image",
    title: "StratMarket by Elvaris Capital",
    description:
      "Institutional quantitative trading strategy marketplace by Elvaris Capital (https://elvariscapital.in).",
    creator: "@ElvarisCapital",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
  },
};

const jsonLdData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://elvariscapital.in/#organization",
      name: "Elvaris Capital",
      url: "https://elvariscapital.in",
      logo: "https://stratmarket.elvariscapital.in/logo.png",
      sameAs: ["https://elvariscapital.in"],
      description:
        "Elvaris Capital is an institutional quantitative research and financial technology firm developing proprietary systematic trading algorithms, risk governance frameworks, and automated execution engines.",
    },
    {
      "@type": "FinancialProduct",
      "@id": "https://stratmarket.elvariscapital.in/#product",
      name: "StratMarket",
      url: "https://stratmarket.elvariscapital.in",
      description:
        "StratMarket is an institutional algorithmic trading strategy marketplace developed and operated by Elvaris Capital.",
      brand: {
        "@type": "Brand",
        name: "Elvaris Capital",
        url: "https://elvariscapital.in",
      },
      parentOrganization: {
        "@id": "https://elvariscapital.in/#organization",
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://stratmarket.elvariscapital.in/#website",
      url: "https://stratmarket.elvariscapital.in",
      name: "StratMarket by Elvaris Capital",
      publisher: {
        "@id": "https://elvariscapital.in/#organization",
      },
    },
  ],
};

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body className={`${sansFont.className} antialiased`}>
        <SpotlightCursor />
        <div className="fx" aria-hidden="true">
          <i className="a1" />
          <i className="a2" />
        </div>
        <TopProgressBar />
        <Suspense fallback={null}>
          <HeaderNav />
        </Suspense>
        <main>{children}</main>
        <Footer />
        <Suspense fallback={null}>
          <DockNav />
        </Suspense>
      </body>
    </html>
  );
}
