import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing & Plans — StratMarket by Elvaris Capital",
  description: "StratMarket quantitative strategies are currently open access for all registered traders.",
};

export default function PricingPage() {
  redirect("/market");
}
