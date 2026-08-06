import type { Metadata } from "next";
import Link from "next/link";
import { ProfileDashboard } from "../components/ProfileDashboard";

export const metadata: Metadata = {
  title: "My progress",
  description: "Your Project 42 learning progress, scores, badges, and transcript.",
};

export default function ProfilePage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero profile-hero">
        <p className="eyebrow">My progress</p>
        <h1>Your work, made visible.</h1>
        <p>
          Track completed modules, knowledge-check scores, and badges in your
          approved account across browsers and devices.
        </p>
        <div className="policy-link-row" aria-label="Progress policies">
          <Link className="text-link" href="/learner-data">
            How Project 42 protects learner data
          </Link>
          <a
            className="text-link"
            href="https://project-42.dev/legal-transparency"
          >
            Service and legal expectations
          </a>
        </div>
      </header>
      <ProfileDashboard />
    </main>
  );
}
