import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project 42 Administration",
  description: "Administrative console and user management for Project 42",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-portal-root" data-theme="admin-control" data-layout="admin-dashboard">
      {children}
    </div>
  );
}
