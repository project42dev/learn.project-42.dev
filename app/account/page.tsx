import type { Metadata } from "next";
import Link from "next/link";
import { AccountDashboard } from "../components/AccountDashboard";

export const metadata: Metadata = {
  title: "My account",
  description: "Project 42 sign-in, approval status, and owner administration.",
};

export default function AccountPage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero profile-hero">
        <p className="eyebrow">Account and access</p>
        <h1>One identity. Your learning record.</h1>
        <p>
          Sign in through a configured identity provider, see approval status, and
          keep progress available across browsers and devices.
        </p>
        <div className="policy-link-row" aria-label="Account policies">
          <Link className="text-link" href="/learner-data">
            Learner data and controls
          </Link>
          <a
            className="text-link"
            href="https://project-42.dev/legal-transparency"
          >
            Legal &amp; Transparency
          </a>
        </div>
      </header>
      <AccountDashboard />
    </main>
  );
}
