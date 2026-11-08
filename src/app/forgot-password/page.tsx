"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ForgotPasswordRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = new URLSearchParams();
    q.set("mode", "forgot");
    const code = searchParams.get("code");
    const email = searchParams.get("email");
    if (code) q.set("code", code);
    if (email) q.set("email", email);

    router.replace(`/signin?${q.toString()}`);
  }, [router, searchParams]);

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "grid", placeItems: "center" }}>
      <div className="chart-spinner" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#000", display: "grid", placeItems: "center" }}>
          <div className="chart-spinner" />
        </div>
      }
    >
      <ForgotPasswordRedirectContent />
    </Suspense>
  );
}
