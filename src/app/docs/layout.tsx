import { DocsNav } from "./DocsNav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page" id="p-docs">
      <div className="wrap docs-layout-wrap">
        <DocsNav />
        <main className="docs-layout-main">
          {children}
        </main>
      </div>
    </div>
  );
}

