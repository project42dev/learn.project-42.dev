import type { Metadata } from "next";
import { AdminDashboard } from "../components/AccountDashboard";

export const metadata: Metadata = {
  title: "Owner administration — Accounts",
  description:
    "Protected Project 42 account approvals, domain policy, duplicate-account recovery, audit, and deletion controls.",
};

export default function AdminPage() {
  return (
    <main className="page-shell shell" style={{ paddingTop: "24px" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 4px 0", color: "#f8fafc" }}>Accounts &amp; Registrations</h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>Review learner registration queue, approve pending accounts, and manage user states.</p>
        </div>
      </div>
      <AdminDashboard />
    </main>
  );
}
