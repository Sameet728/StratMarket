import { redirect } from "next/navigation";

export default async function ChartRootPage({
  searchParams,
}: {
  searchParams: Promise<{ strategy?: string; id?: string; s?: string }>;
}) {
  const params = await searchParams;
  const target = params?.strategy || params?.id || params?.s || "PS-01";
  redirect(`/chart/${encodeURIComponent(target)}`);
}

