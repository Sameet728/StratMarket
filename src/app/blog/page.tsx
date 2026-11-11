import Link from "next/link";
import type { Metadata } from "next";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { StratMarketLogo } from "@/components/StratMarketLogo";

export const metadata: Metadata = {
  title: "Quantitative Trading & Pine Script Blog — StratMarket by Elvaris Capital",
  description:
    "Official quantitative trading engineering and research blog by Elvaris Capital (elvariscapital.in). In-depth breakdowns of Pine Script v5 gold strategies, Python MT5 ensembles, Walk-Forward Optimization, and risk governance.",
  keywords: [
    "Quantitative Trading Blog",
    "Pine Script v5 Strategies",
    "Gold Trading Algorithm",
    "XAUUSD Algorithmic Trading",
    "Elvaris Capital Blog",
    "Walk Forward Optimization",
    "TradingView Webhook Execution",
    "Calmar Ratio Quantitative",
  ],
  alternates: {
    canonical: "https://stratmarket.elvariscapital.in/blog",
  },
  openGraph: {
    title: "Quantitative Trading & Pine Script Blog — StratMarket by Elvaris Capital",
    description:
      "Mathematical deep dives, Pine Script v5 strategy teardowns, Python MT5 ensembles, and institutional risk governance published by Elvaris Capital.",
    url: "https://stratmarket.elvariscapital.in/blog",
    siteName: "StratMarket by Elvaris Capital",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quantitative Trading & Pine Script Blog — StratMarket by Elvaris Capital",
    description:
      "Mathematical deep dives, Pine Script v5 strategy teardowns, Python MT5 ensembles, and institutional risk governance.",
  },
};

export default function BlogIndexPage() {
  const posts = BLOG_POSTS;
  const baseUrl = "https://stratmarket.elvariscapital.in";

  // Structured Data (JSON-LD) for SEO / AEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Quantitative Trading Engineering & Research Blog",
    description:
      "Official quantitative trading engineering and research publications by Elvaris Capital (elvariscapital.in).",
    url: `${baseUrl}/blog`,
    publisher: {
      "@type": "Organization",
      name: "Elvaris Capital",
      url: "https://elvariscapital.in",
      logo: `${baseUrl}/icon-192.png`,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${baseUrl}/blog/${post.slug}`,
        name: post.title,
        description: post.description,
      })),
    },
  };

  return (
    <div className="page" id="p-blog">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="b">
        <div className="wrap" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
          
          {/* Breadcrumbs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--mut)", marginBottom: 24 }}>
            <Link href="/" style={{ color: "var(--mut)", textDecoration: "none" }}>
              Home
            </Link>
            <span>/</span>
            <span style={{ color: "#ffffff" }}>Quantitative Blog</span>
          </div>

          {/* Hero Header */}
          <div style={{ marginBottom: 44 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: "rgba(163, 230, 53, 0.08)", border: "1px solid rgba(163, 230, 53, 0.25)", marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a3e635", boxShadow: "0 0 8px #a3e635" }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#a3e635", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono, monospace)" }}>
                Quantitative Research &amp; Engineering Desk
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.03em", margin: "0 0 14px", lineHeight: 1.15 }}>
              Quantitative Trading, Pine Script &amp; Systematics
            </h1>

            <p style={{ maxWidth: 740, color: "var(--mut)", fontSize: 16, lineHeight: 1.6, margin: 0 }}>
              Peer-reviewed technical breakdowns, mathematical strategy formulations, Pine Script v5 source architecture, and institutional risk governance engineered by{" "}
              <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#ffffff", textDecoration: "underline", textUnderlineOffset: 3 }}>
                Elvaris Capital (elvariscapital.in)
              </a>
              .
            </p>
          </div>

          {/* Featured Article Card */}
          {posts.length > 0 && (
            <div
              style={{
                background: "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)",
                border: "1px solid rgba(163, 230, 53, 0.3)",
                borderRadius: 16,
                padding: "28px",
                marginBottom: 48,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, background: "#a3e635", color: "#000000", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                Featured Deep Dive
              </div>

              <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 800, margin: "0 0 12px", color: "#ffffff", lineHeight: 1.25 }}>
                <Link href={`/blog/${posts[0].slug}`} style={{ color: "#ffffff", textDecoration: "none" }}>
                  {posts[0].title}
                </Link>
              </h2>

              <p style={{ color: "var(--mut)", fontSize: 14.5, lineHeight: 1.6, maxWidth: 840, margin: "0 0 20px" }}>
                {posts[0].description}
              </p>

              {/* Key Takeaways Highlight */}
              <div style={{ background: "rgba(0, 0, 0, 0.4)", borderRadius: 10, padding: "14px 18px", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: 20 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#a3e635", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  Key Architectural Insights:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#d4d4d8", fontSize: 13, lineHeight: 1.6 }}>
                  {posts[0].keyTakeaways.slice(0, 3).map((item, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, paddingTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5, color: "var(--mut)" }}>
                  <span>{posts[0].readTime}</span>
                  <span>•</span>
                  <span>{new Date(posts[0].publishDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", year: "numeric" })}</span>
                  <span>•</span>
                  <span style={{ color: "#a3e635" }}>{posts[0].category}</span>
                </div>

                <Link
                  href={`/blog/${posts[0].slug}`}
                  className="pill"
                  style={{ background: "#ffffff", color: "#000000", fontWeight: 700, fontSize: 13, padding: "8px 20px", textDecoration: "none", border: "none" }}
                >
                  Read Technical Breakdown →
                </Link>
              </div>
            </div>
          )}

          {/* Grid of Remaining Articles */}
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span>All Quantitative Articles &amp; Strategy Guides</span>
            <span style={{ fontSize: 12, color: "var(--mut)", fontWeight: 500 }}>({posts.length} published)</span>
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 24,
              marginBottom: 56,
            }}
          >
            {posts.slice(1).map((post) => (
              <article
                key={post.slug}
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "border-color 0.2s ease, transform 0.2s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#a3e635", background: "rgba(163, 230, 53, 0.08)", border: "1px solid rgba(163, 230, 53, 0.2)", padding: "3px 8px", borderRadius: 4 }}>
                      {post.category}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--mut)" }}>{post.readTime}</span>
                  </div>

                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.35, color: "#ffffff" }}>
                    <Link href={`/blog/${post.slug}`} style={{ color: "#ffffff", textDecoration: "none" }}>
                      {post.title}
                    </Link>
                  </h3>

                  <p style={{ color: "var(--mut)", fontSize: 13.5, lineHeight: 1.55, margin: "0 0 16px" }}>
                    {post.description}
                  </p>

                  {/* Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} style={{ fontSize: 10.5, color: "#a1a1aa", background: "rgba(255, 255, 255, 0.04)", padding: "2px 6px", borderRadius: 4 }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--mut)" }}>
                    {new Date(post.publishDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <Link href={`/blog/${post.slug}`} style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", textDecoration: "none" }}>
                    Read Guide →
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Strategy Marketplace Cross-Sell Banner */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 16,
              padding: "32px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <StratMarketLogo size={32} color="#a3e635" />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", margin: "0 0 8px" }}>
              Ready to Explore Verified Institutional Quant Strategies?
            </h3>
            <p style={{ maxWidth: 600, margin: "0 auto 20px", color: "var(--mut)", fontSize: 14.5, lineHeight: 1.6 }}>
              All 14 Pine Script and Python MT5 strategies researched by Elvaris Capital are accessible with 100% open research reports, tick-level backtests, and live interactive charting.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <Link href="/market" className="pill" style={{ background: "#ffffff", color: "#000000", fontWeight: 700, padding: "10px 24px", textDecoration: "none", border: "none" }}>
                Browse Strategy Marketplace →
              </Link>
              <Link href="/docs" className="pill g" style={{ padding: "10px 20px", textDecoration: "none", color: "#ffffff" }}>
                Read Technical Documentation
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

