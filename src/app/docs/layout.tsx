import { DocsNav } from "./DocsNav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page" id="p-docs" style={{ paddingTop: "80px", minHeight: "100vh" }}>
      <div
        className="wrap"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          minHeight: "calc(100vh - 120px)",
        }}
      >
        <DocsNav />
        <main
          style={{
            flex: 1,
            padding: "36px 48px 100px",
            maxWidth: "920px",
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

