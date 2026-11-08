"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const DOCS_PAGES = [
  {
    category: "Overview",
    items: [
      { href: "/docs", title: "Documentation Hub", badge: "Start" },
      { href: "/docs/elvaris-capital", title: "About Elvaris Capital", badge: "Parent Org" },
      { href: "/docs/faq", title: "Quantitative FAQ", badge: "Popular" },
    ],
  },
  {
    category: "Quantitative Science",
    items: [
      { href: "/docs/quantitative-methodology", title: "Research Methodology", badge: null },
      { href: "/docs/algorithmic-strategies", title: "Strategy Catalog (PS & PY)", badge: "14 Models" },
      { href: "/docs/risk-management", title: "Sovereign Risk Governance", badge: null },
    ],
  },
  {
    category: "Execution & Engineering",
    items: [
      { href: "/docs/signals-and-execution", title: "Signals & VPS Architecture", badge: "Sub-50ms" },
      { href: "/docs/broker-integration", title: "Broker Integration & Webhooks", badge: "APIs" },
    ],
  },
  {
    category: "AI & Crawlers",
    items: [
      { href: "/llms.txt", title: "LLM Ingestion Feed (llms.txt)", badge: "AI Bot" },
      { href: "/llms-full.txt", title: "Full AI Knowledge Base", badge: "Raw" },
    ],
  },
];

export function DocsNav() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "280px",
        flexShrink: 0,
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "32px 24px 80px",
      }}
    >
      <div style={{ marginBottom: "28px" }}>
        <span
          style={{
            fontSize: "10.5px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#ffffff",
            fontWeight: 700,
            display: "block",
            marginBottom: "6px",
          }}
        >
          Quantitative Library
        </span>
        <h3 style={{ fontSize: "18px", margin: 0, fontWeight: 700, color: "#fff" }}>
          Documentation
        </h3>
        <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0", lineHeight: "1.5" }}>
          By <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#ffffff", textDecoration: "underline" }}>Elvaris Capital</a>
        </p>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {DOCS_PAGES.map((sec, idx) => (
          <div key={idx}>
            <span
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#6b7280",
                fontWeight: 600,
                display: "block",
                marginBottom: "8px",
              }}
            >
              {sec.category}
            </span>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
              {sec.items.map((item, i) => {
                const isActive = pathname === item.href;
                const isExternal = item.href.startsWith("http") || item.href.endsWith(".txt");
                return (
                  <li key={i}>
                    {isExternal ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 10px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          textDecoration: "none",
                          color: "#9ca3af",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{item.title}</span>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: "rgba(255, 255, 255, 0.05)",
                              color: "#9ca3af",
                            }}
                          >
                            {item.badge} ↗
                          </span>
                        )}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 10px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          textDecoration: "none",
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? "#fff" : "#9ca3af",
                          background: isActive ? "rgba(255, 255, 255, 0.07)" : "transparent",
                          border: isActive ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid transparent",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{item.title}</span>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: isActive ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
                              color: isActive ? "#ffffff" : "#9ca3af",
                              fontWeight: 500,
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        style={{
          marginTop: "36px",
          padding: "16px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <span style={{ fontSize: "11px", color: "#ffffff", fontWeight: 600, display: "block", marginBottom: "4px" }}>
          Parent Organization
        </span>
        <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 10px", lineHeight: "1.4" }}>
          StratMarket is engineered by Elvaris Capital.
        </p>
        <a
          href="https://elvariscapital.in"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "12px",
            color: "#ffffff",
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>elvariscapital.in</span>
          <span>↗</span>
        </a>
      </div>
    </aside>
  );
}

