import type { Metadata } from "next";
import { AdminDashboard } from "../components/AccountDashboard";

export const metadata: Metadata = {
  title: "Project 42 administration — Owner administration",
  description:
    "Review registrations, enforce account states, manage approved-domain policy, and complete eligible deletion requests.",
};

export default function AdminPage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero profile-hero">
        <p className="eyebrow">Owner administration</p>
        <h1>Project 42 administration</h1>
        <p>
          Review learner registration queue, approve pending accounts, manage
          exact-domain policy, and process deletion requests.
        </p>
      </header>
      <AdminDashboard view="accounts" />
    </main>
  );
}
