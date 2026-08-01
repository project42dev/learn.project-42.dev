import type { Metadata } from "next";
import { AdminDashboard } from "../components/AccountDashboard";

export const metadata: Metadata = {
  title: "Owner administration",
  description:
    "Protected Project 42 account approvals, domain policy, duplicate-account recovery, audit, and deletion controls.",
};

export default function AdminPage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero profile-hero">
        <p className="eyebrow">Protected owner route</p>
        <h1>Project 42 administration</h1>
        <p>
          Review registrations, enforce account states, manage approved-domain
          policy, inspect audit evidence, and complete eligible deletion
          requests. Learners reconcile their own duplicate accounts from their
          profile by proving control of both.
        </p>
      </header>
      <AdminDashboard />
    </main>
  );
}
