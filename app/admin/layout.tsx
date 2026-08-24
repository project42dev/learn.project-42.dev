export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-portal-root" style={{ minHeight: "100vh", background: "var(--background, #070b12)" }}>
      {children}
    </div>
  );
}
