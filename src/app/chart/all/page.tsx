import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AllStrategiesChart } from "@/components/chart/AllStrategiesChart";
import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: "All Strategies — Combined Live Chart | StratMarket by Elvaris Capital",
  description:
    "View all PS-01, PS-02, and PS-03 trade executions overlaid on a single XAUUSD 15m chart. Color-coded trade boxes with hover strategy identification. Live institutional chart by Elvaris Capital.",
};

export default async function AllStrategiesChartPage() {
  await connection();

  const user = await getSession();
  if (!user) {
    redirect("/signin?redirect=/chart/all");
  }

  return (
    <div className="chart-page-fullscreen">
      <AllStrategiesChart
        initialUser={{ id: user.id, name: user.name, email: user.email }}
      />
    </div>
  );
}

