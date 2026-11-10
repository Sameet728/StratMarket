import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { StrategyReportView } from "@/components/StrategyReportView";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export const instant = false;

export async function generateStaticParams() {
  const strategies = await db.getStrategies({ includeDrafts: true });
  return strategies.map((s) => ({
    slug: s.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const strategy = await db.getStrategyBySlug(slug);

  if (!strategy) {
    return {
      title: "Strategy Not Found — StratMarket by Elvaris Capital",
    };
  }

  return {
    title: `${strategy.name} (${strategy.id}) Performance Report — StratMarket by Elvaris Capital (elvariscapital.in)`,
    description: `${strategy.description} Researched by Elvaris Capital (https://elvariscapital.in). Audited institutional metrics: Net Return +${strategy.metrics.netReturn}%, Max Drawdown ${strategy.metrics.maxDrawdown}%, Profit Factor ${strategy.metrics.profitFactor}, Sharpe Ratio ${strategy.metrics.sharpeRatio}.`,
    openGraph: {
      title: `${strategy.name} (${strategy.id}) — StratMarket by Elvaris Capital`,
      description: `${strategy.description} Audited institutional metrics by Elvaris Capital (elvariscapital.in).`,
    },
  };
}

export default async function StrategyReportPage({ params }: Props) {
  const { slug } = await params;
  const strategy = await db.getStrategyBySlug(slug);

  if (!strategy) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${strategy.name} (${strategy.id}) Quantitative Performance Report`,
    description: strategy.description,
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

  return (
    <div className="page" id="p-strategy-report" style={{ minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StrategyReportView strategy={strategy} />
    </div>
  );
}
