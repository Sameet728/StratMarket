import Link from "next/link";

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(10, 10, 12, 0.95)", padding: "48px 0 36px" }}>
      <div className="wrap" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        
        {/* Top 4-Column Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "36px",
            marginBottom: "40px",
          }}
        >
          {/* Column 1: Brand & Parent Org Lockup */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.02em", color: "#fff" }}>
                StratMarket
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#e2b342",
                  background: "rgba(226, 179, 66, 0.1)",
                  border: "1px solid rgba(226, 179, 66, 0.3)",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                by Elvaris Capital
              </span>
            </div>
            <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#9ca3af", margin: "0 0 14px" }}>
              An institutional quantitative trading strategy marketplace engineered and operated by{" "}
              <a
                href="https://elvariscapital.in"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#e2b342", textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                Elvaris Capital (elvariscapital.in)
              </a>
              .
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6b7280" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              <span>Parent Organization: </span>
              <a
                href="https://elvariscapital.in"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#d1d5db", fontWeight: 500 }}
              >
                elvariscapital.in ↗
              </a>
            </div>
          </div>

          {/* Column 2: Platform Navigation */}
          <div>
            <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#e5e7eb", marginBottom: "14px", fontWeight: 600 }}>
              Trading Platform
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <li>
                <Link href="/market" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  Strategy Marketplace
                </Link>
              </li>
              <li>
                <Link href="/chart" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  Live Interactive Charts
                </Link>
              </li>
              <li>
                <Link href="/research" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  Hypothesis & Research
                </Link>
              </li>
              <li>
                <Link href="/how" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/signin" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  Trader Sign In (Free)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Quantitative Documentation */}
          <div>
            <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#e5e7eb", marginBottom: "14px", fontWeight: 600 }}>
              Quantitative Docs
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <li>
                <Link href="/docs" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  Documentation Hub
                </Link>
              </li>
              <li>
                <Link href="/docs/quantitative-methodology" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  Research Methodology
                </Link>
              </li>
              <li>
                <Link href="/docs/algorithmic-strategies" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  Strategy Catalog (PS &amp; PY)
                </Link>
              </li>
              <li>
                <Link href="/docs/risk-management" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  Sovereign Risk Governance
                </Link>
              </li>
              <li>
                <Link href="/docs/broker-integration" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  Broker Integration &amp; APIs
                </Link>
              </li>
              <li>
                <Link href="/docs/faq" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  Quantitative FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Parent Org & AI Bot Ingestion */}
          <div>
            <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#e5e7eb", marginBottom: "14px", fontWeight: 600 }}>
              Parent Organization
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <li>
                <a
                  href="https://elvariscapital.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#e2b342", fontWeight: 500, textDecoration: "none" }}
                >
                  Elvaris Capital Official Portal ↗
                </a>
              </li>
              <li>
                <Link href="/docs/elvaris-capital" style={{ color: "#9ca3af", textDecoration: "none" }}>
                  About Elvaris Capital
                </Link>
              </li>
              <li>
                <a
                  href="/llms.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#9ca3af", textDecoration: "none" }}
                >
                  AI Bot Ingestion (llms.txt) ↗
                </a>
              </li>
              <li>
                <a
                  href="/llms-full.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#9ca3af", textDecoration: "none" }}
                >
                  Full AI Knowledge Base ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimers & Copyright */}
        <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "24px" }}>
          <p style={{ fontSize: "12px", lineHeight: "1.6", color: "#6b7280", margin: "0 0 12px" }}>
            <strong>Risk Disclosure:</strong> StratMarket is a proprietary quantitative strategy platform developed and operated by Elvaris Capital (parent organization:{" "}
            <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#9ca3af", textDecoration: "underline" }}>
              https://elvariscapital.in
            </a>
            ). Trading forex, contracts for difference (CFDs), equities, indices, and cryptocurrencies involves significant financial risk and is not suitable for all investors. Past performance, backtested results, and simulated signals do not guarantee future returns. No financial or investment advisory advice is provided.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", fontSize: "12px", color: "#6b7280" }}>
            <span>
              © 2026 Elvaris Capital (
              <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#9ca3af" }}>
                elvariscapital.in
              </a>
              ). All rights reserved. StratMarket™ is a trademark of Elvaris Capital.
            </span>
            <div style={{ display: "flex", gap: "16px" }}>
              <Link href="/docs/faq" style={{ color: "#9ca3af" }}>
                FAQ
              </Link>
              <Link href="/docs/elvaris-capital" style={{ color: "#9ca3af" }}>
                About Parent Org
              </Link>
              <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#e2b342" }}>
                elvariscapital.in ↗
              </a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
