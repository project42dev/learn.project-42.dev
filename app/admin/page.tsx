import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminDashboard } from "../components/AccountDashboard";
import { ADMIN_DOMAIN, LEARN_DOMAIN } from "../lib/subdomainLinks";

const TARGET = `https://${ADMIN_DOMAIN}/admin/`;

export const metadata: Metadata = {
  title: "Owner administration",
  description:
    "Protected Project 42 account approvals, domain policy, duplicate-account recovery, audit, and deletion controls.",
};

async function currentHost(): Promise<string> {
  try {
    return (await headers()).get("host") ?? LEARN_DOMAIN;
  } catch {
    return LEARN_DOMAIN;
  }
}

export default async function AdminPage() {
  // learn.project-42.dev no longer owns this route once admin.project-42.dev
  // is live (AB#6227) - redirect only real learn.project-42.dev production
  // traffic here. Local dev/test servers, CI, and the filtered export built
  // for admin.project-42.dev itself all see the real dashboard - keying off
  // "is this the owning domain" instead would also redirect every local dev
  // server and Playwright run (host 127.0.0.1), and would make
  // admin.project-42.dev/admin redirect to itself.
  if ((await currentHost()) === LEARN_DOMAIN) {
    return (
      <main className="page-shell shell">
        <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
        <link rel="canonical" href={TARGET} />
        <header className="page-hero profile-hero">
          <p className="eyebrow">Protected owner route</p>
          <h1>Owner administration has a new home.</h1>
          <p>
            Review registrations, domain policy, audit evidence, and deletion
            requests at <a href={TARGET}>admin.project-42.dev</a>.
          </p>
        </header>
      </main>
    );
  }

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
