import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Elvaris Capital — Parent Organization & Quantitative Firm",
  description:
    "Learn about Elvaris Capital (elvariscapital.in), the institutional quantitative research organization behind StratMarket, our research lab, and data provenance standards.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "About Elvaris Capital — Parent Organization & Quantitative Strategy Firm",
  description:
    "Corporate background, quantitative research philosophy, and institutional infrastructure of Elvaris Capital (elvariscapital.in), parent organization of StratMarket.",
  author: {
    "@type": "Organization",
    name: "Elvaris Capital",
    url: "https://elvariscapital.in",
  },
  publisher: {
    "@type": "Organization",
    name: "Elvaris Capital",
    url: "https://elvariscapital.in",
  },
};

export default function AboutElvarisCapitalPage() {
  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280", marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
        <span>/</span>
        <Link href="/docs" style={{ color: "#9ca3af", textDecoration: "none" }}>Documentation</Link>
        <span>/</span>
        <span style={{ color: "#e5e7eb" }}>About Elvaris Capital</span>
      </div>

      <span
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#e2b342",
          fontWeight: 700,
          display: "inline-block",
          marginBottom: "8px",
        }}
      >
        Corporate Overview &amp; Parent Organization
      </span>

      <h1 style={{ fontSize: "clamp(28px, 4.5vw, 40px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.2 }}>
        About Elvaris Capital (elvariscapital.in)
      </h1>

      <p style={{ fontSize: "17px", lineHeight: "1.7", color: "#d1d5db", margin: "0 0 32px" }}>
        <strong>Elvaris Capital</strong> is an institutional quantitative research and financial technology firm operating at the intersection of mathematical finance, automated execution engineering, and machine learning. Elvaris Capital is the parent organization, research laboratory, and operating firm behind <strong>StratMarket</strong>.
      </p>

      {/* Official Parent Org Highlight Card */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(226, 179, 66, 0.08) 0%, rgba(20, 20, 25, 0.6) 100%)",
          border: "1px solid rgba(226, 179, 66, 0.25)",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "40px",
        }}
      >
        <h3 style={{ fontSize: "17px", color: "#fff", margin: "0 0 10px" }}>
          Official Entity Details
        </h3>
        <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", color: "#9ca3af" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <td style={{ padding: "8px 0", color: "#d1d5db", fontWeight: 600 }}>Parent Organization:</td>
              <td style={{ padding: "8px 0" }}>Elvaris Capital</td>
            </tr>
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <td style={{ padding: "8px 0", color: "#d1d5db", fontWeight: 600 }}>Official Corporate Portal:</td>
              <td style={{ padding: "8px 0" }}>
                <a
                  href="https://elvariscapital.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#e2b342", textDecoration: "underline" }}
                >
                  https://elvariscapital.in ↗
                </a>
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <td style={{ padding: "8px 0", color: "#d1d5db", fontWeight: 600 }}>Flagship Product:</td>
              <td style={{ padding: "8px 0" }}>StratMarket (Algorithmic Strategy Marketplace)</td>
            </tr>
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <td style={{ padding: "8px 0", color: "#d1d5db", fontWeight: 600 }}>Specialization:</td>
              <td style={{ padding: "8px 0" }}>Quantitative Alpha Research, Statistical Arbitrage, High-Fidelity Signal Relays</td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#d1d5db", fontWeight: 600 }}>Execution Infrastructure:</td>
              <td style={{ padding: "8px 0" }}>24/7 Dedicated Cloud VPS Clusters in Frankfurt &amp; London</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", color: "#fff", margin: "0 0 16px" }}>
          Why Elvaris Capital Built StratMarket
        </h2>
        <p style={{ fontSize: "15px", lineHeight: "1.7", color: "#9ca3af", margin: "0 0 16px" }}>
          The retail and prop trading industry is saturated with unverified trading robots, deceptive marketing, and curve-fitted backtests that collapse when deployed with live broker spreads and slippage.
        </p>
        <p style={{ fontSize: "15px", lineHeight: "1.7", color: "#9ca3af", margin: "0 0 16px" }}>
          Elvaris Capital founded StratMarket to democratize institutional-grade quantitative discipline. By releasing verified algorithmic strategies with full transparent provenance, unauthenticated research reports, and 100% open-access live chart tools, traders can evaluate strategies with the same mathematical scrutiny employed by hedge fund allocators.
        </p>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", color: "#fff", margin: "0 0 16px" }}>
          The Elvaris Capital Quant Lab Philosophy
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#e5e7eb", margin: "0 0 8px" }}>1. Absolute Mathematical Transparency</h3>
            <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              No black-box obscurity. Every listed strategy clearly delineates its governing economic hypothesis, Sharpe ratio, Calmar ratio, win rate, and max drawdown.
            </p>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#e5e7eb", margin: "0 0 8px" }}>2. Realistic Friction Modeling</h3>
            <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              All backtests incorporate institutional commissions ($2.50 per standard lot) and 1.0+ pip slippage drag, ensuring performance metrics survive live market execution.
            </p>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#e5e7eb", margin: "0 0 8px" }}>3. Sovereign Risk Governance</h3>
            <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Server-enforced drawdown circuit breakers and dynamic volatility bracket stops prevent catastrophic tail-risk events.
            </p>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#e5e7eb", margin: "0 0 8px" }}>4. Continuous VPS Infrastructure</h3>
            <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Strategies execute continuously on dedicated 24/7 VPS servers, dispatching real-time signals via webhooks in sub-50 milliseconds.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation Footer */}
      <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <Link href="/docs" className="pill g sm">
          ← Back to Docs Hub
        </Link>
        <Link href="/docs/quantitative-methodology" className="pill sm">
          Next: Research Methodology →
        </Link>
      </div>
    </article>
  );
}
