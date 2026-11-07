"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ChartRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const target =
      searchParams.get("strategy") ||
      searchParams.get("id") ||
      searchParams.get("s") ||
      "PS-01";
    router.replace(`/chart/${encodeURIComponent(target)}`);
  }, [router, searchParams]);

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "grid", placeItems: "center" }}>
      <div className="chart-spinner" />
    </div>
  );
}

export default function ChartRootPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#000", display: "grid", placeItems: "center" }}>
          <div className="chart-spinner" />
        </div>
      }
    >
      <ChartRedirectContent />
    </Suspense>
  );
}
