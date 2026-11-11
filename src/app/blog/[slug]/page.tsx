import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { BLOG_POSTS, getBlogPostBySlug } from "@/lib/blog/posts";
import { StratMarketLogo } from "@/components/StratMarketLogo";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Article Not Found — StratMarket",
    };
  }

  const baseUrl = "https://stratmarket.elvariscapital.in";
  const url = `${baseUrl}/blog/${post.slug}`;

  return {
    title: `${post.metaTitle} | StratMarket by Elvaris Capital`,
    description: post.description,
    keywords: post.tags,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.metaTitle,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.publishDate,
      authors: [post.author],
      tags: post.tags,
      siteName: "StratMarket by Elvaris Capital",
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const baseUrl = "https://stratmarket.elvariscapital.in";
  const url = `${baseUrl}/blog/${post.slug}`;

  // Structured Data 1: BlogPosting Schema
  const blogPostingLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url,
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    author: {
      "@type": "Organization",
      name: "Elvaris Capital Quantitative Research Team",
      url: "https://elvariscapital.in",
    },
    publisher: {
      "@type": "Organization",
      name: "Elvaris Capital",
      url: "https://elvariscapital.in",
      logo: `${baseUrl}/icon-192.png`,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: post.tags.join(", "),
    articleSection: post.category,
  };

  // Structured Data 2: FAQPage Schema (for Google search rich snippet accordion)
  const faqPageLd =
    post.faq && post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  // Structured Data 3: BreadcrumbList Schema
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${baseUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: url,
      },
    ],
  };

  return (
    <div className="page" id="p-blog-post">
      {/* Inject Rich Structured Data for Search Engines & LLMs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingLd) }}
      />
      {faqPageLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <article className="b">
        <div className="wrap" style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>
          
          {/* Breadcrumbs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--mut)", marginBottom: 24, flexWrap: "wrap" }}>
            <Link href="/" style={{ color: "var(--mut)", textDecoration: "none" }}>
              Home
            </Link>
            <span>/</span>
            <Link href="/blog" style={{ color: "var(--mut)", textDecoration: "none" }}>
              Blog
            </Link>
            <span>/</span>
            <span style={{ color: "#ffffff", maxWidth: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {post.title}
            </span>
          </div>

          {/* Header Metadata Lockup */}
          <header style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#a3e635",
                  background: "rgba(163, 230, 53, 0.08)",
                  border: "1px solid rgba(163, 230, 53, 0.25)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {post.category}
              </span>
              <span style={{ fontSize: 13, color: "var(--mut)" }}>{post.readTime}</span>
              <span style={{ color: "var(--mut)" }}>•</span>
              <span style={{ fontSize: 13, color: "var(--mut)" }}>
                Published {new Date(post.publishDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "#ffffff", lineHeight: 1.2, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
              {post.title}
            </h1>

            <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#d4d4d8", margin: "0 0 24px" }}>
              {post.description}
            </p>

            {/* Author Attribution */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "#18181b",
                  border: "1px solid rgba(163, 230, 53, 0.3)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <StratMarketLogo size={18} color="#a3e635" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#ffffff" }}>
                  {post.author}
                </div>
                <div style={{ fontSize: 12, color: "var(--mut)" }}>
                  {post.authorRole}
                </div>
              </div>
            </div>
          </header>

          {/* Key Architectural Takeaways Box (GEO / Featured Snippet Hook) */}
          <div
            style={{
              background: "linear-gradient(180deg, rgba(163, 230, 53, 0.06) 0%, rgba(163, 230, 53, 0.01) 100%)",
              border: "1px solid rgba(163, 230, 53, 0.25)",
              borderRadius: 14,
              padding: "22px 24px",
              marginBottom: 40,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#a3e635", boxShadow: "0 0 8px #a3e635" }} />
              <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a3e635", margin: 0 }}>
                Executive Quantitative Summary &amp; Key Findings
              </h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#e4e4e7", fontSize: 14, lineHeight: 1.65 }}>
              {post.keyTakeaways.map((takeaway, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {takeaway}
                </li>
              ))}
            </ul>
          </div>

          {/* Related Strategy Live Chart Callout (If linked to a strategy) */}
          {post.relatedStrategyId && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
                padding: "18px 22px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                borderRadius: 12,
                marginBottom: 40,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a3e635", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Verified Systematic Model
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>
                  Explore {post.relatedStrategyId} on Live Interactive Chart
                </div>
                <div style={{ fontSize: 13, color: "var(--mut)" }}>
                  Stream real-time 15m Vela candlestick feed with Long/Short execution boxes.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link
                  href={`/chart/${post.relatedStrategyId}`}
                  className="pill"
                  style={{ background: "#ffffff", color: "#000000", fontWeight: 700, fontSize: 13, padding: "8px 18px", textDecoration: "none", border: "none" }}
                >
                  Open Live Chart →
                </Link>
                {post.relatedStrategySlug && (
                  <Link
                    href={`/strategies/${post.relatedStrategySlug}`}
                    className="pill g"
                    style={{ fontSize: 13, padding: "8px 16px", textDecoration: "none", color: "#ffffff" }}
                  >
                    View Backtest Metrics
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Main Article Content Body */}
          <div
            className="blog-content-body"
            style={{
              fontSize: 15.5,
              lineHeight: 1.75,
              color: "#e4e4e7",
              marginBottom: 48,
            }}
          >
            {post.content.split("\n\n").map((block, idx) => {
              const trimmed = block.trim();
              if (trimmed.startsWith("## ")) {
                return (
                  <h2
                    key={idx}
                    style={{
                      fontSize: "clamp(20px, 2.5vw, 26px)",
                      fontWeight: 800,
                      color: "#ffffff",
                      letterSpacing: "-0.02em",
                      margin: "36px 0 16px",
                      paddingBottom: 8,
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {trimmed.replace("## ", "")}
                  </h2>
                );
              }
              if (trimmed.startsWith("### ")) {
                return (
                  <h3
                    key={idx}
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#ffffff",
                      margin: "24px 0 12px",
                    }}
                  >
                    {trimmed.replace("### ", "")}
                  </h3>
                );
              }
              if (trimmed.startsWith("```")) {
                const codeContent = trimmed.replace(/^```[a-z]*\n?/, "").replace(/```$/, "");
                return (
                  <pre
                    key={idx}
                    style={{
                      background: "#09090b",
                      border: "1px solid #27272a",
                      borderRadius: 10,
                      padding: "16px 20px",
                      overflowX: "auto",
                      fontSize: 13,
                      fontFamily: "var(--font-mono, monospace)",
                      color: "#a3e635",
                      lineHeight: 1.6,
                      margin: "20px 0",
                    }}
                  >
                    <code>{codeContent}</code>
                  </pre>
                );
              }
              if (trimmed.startsWith("|")) {
                const rows = trimmed.split("\n").filter((r) => !r.includes(":---") && !r.includes("---"));
                return (
                  <div key={idx} style={{ overflowX: "auto", margin: "24px 0" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                      <tbody>
                        {rows.map((row, rIdx) => {
                          const cols = row.split("|").filter((c) => c.trim().length > 0);
                          const isHeader = rIdx === 0;
                          return (
                            <tr
                              key={rIdx}
                              style={{
                                background: isHeader ? "rgba(255, 255, 255, 0.05)" : "transparent",
                                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                              }}
                            >
                              {cols.map((col, cIdx) => (
                                <td
                                  key={cIdx}
                                  style={{
                                    padding: "10px 14px",
                                    fontWeight: isHeader ? 700 : 400,
                                    color: isHeader ? "#ffffff" : "#d4d4d8",
                                  }}
                                >
                                  {col.trim().replace(/\*\*/g, "")}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
                const items = trimmed.split("\n").map((line) => line.replace(/^[-*]\s+/, ""));
                return (
                  <ul key={idx} style={{ margin: "16px 0", paddingLeft: 22, lineHeight: 1.7 }}>
                    {items.map((item, iIdx) => (
                      <li key={iIdx} style={{ marginBottom: 6 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} style={{ margin: "0 0 16px" }}>
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* FAQ Accordion Section (Google Rich Snippets) */}
          {post.faq && post.faq.length > 0 && (
            <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", marginBottom: 20 }}>
                Frequently Asked Quantitative Questions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {post.faq.map((item, fIdx) => (
                  <div
                    key={fIdx}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 10,
                      padding: "18px 20px",
                    }}
                  >
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", margin: "0 0 8px" }}>
                      {item.question}
                    </h4>
                    <p style={{ fontSize: 14, color: "var(--mut)", lineHeight: 1.6, margin: 0 }}>
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Research Lab Footer Signature */}
          <div
            style={{
              marginTop: 56,
              padding: "28px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <StratMarketLogo size={16} color="#ffffff" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>StratMarket Research Desk</span>
                <span style={{ fontSize: 11, color: "#a3e635", border: "1px solid rgba(163, 230, 53, 0.3)", padding: "1px 6px", borderRadius: 4 }}>
                  by Elvaris Capital
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--mut)", maxWidth: 520, lineHeight: 1.5 }}>
                Questions regarding algorithmic parameters, institutional licensing, or custom MT5 IPC integrations can be directed to the Elvaris Capital quantitative desk.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/market" className="pill sm" style={{ background: "#ffffff", color: "#000000", fontWeight: 700, textDecoration: "none", border: "none" }}>
                Explore Strategies
              </Link>
              <Link href="/blog" className="pill g sm" style={{ textDecoration: "none", color: "#ffffff" }}>
                ← Back to Blog
              </Link>
            </div>
          </div>

        </div>
      </article>
    </div>
  );
}

