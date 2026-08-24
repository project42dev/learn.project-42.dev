import type { Metadata } from "next";
import { AdminDashboard } from "../components/AccountDashboard";

export const metadata: Metadata = {
  title: "Accounts & Registrations — Owner administration",
  description:
    "Protected Project 42 account approvals, domain policy, duplicate-account recovery, audit, and deletion controls.",
};

export default function AdminPage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero profile-hero">
        <p className="eyebrow">Protected owner administration</p>
        <h1>Accounts &amp; Registrations</h1>
        <p>
          Review registrations, enforce account states, manage approved-domain
          policy, inspect audit evidence, and complete eligible deletion
          requests.
        </p>
      </header>
      <AdminDashboard />
    </main>
  );
}
