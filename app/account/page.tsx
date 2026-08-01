import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  AccountDashboard,
  DeletionStatusLookup,
} from "../components/AccountDashboard";
import { ACCOUNT_DOMAIN, LEARN_DOMAIN } from "../lib/subdomainLinks";

const TARGET = `https://${ACCOUNT_DOMAIN}/account/`;

export const metadata: Metadata = {
  title: "My account",
  description:
    "Project 42 profile, approval status, and owner administration.",
};

async function currentHost(): Promise<string> {
  try {
    return (await headers()).get("host") ?? LEARN_DOMAIN;
  } catch {
    return LEARN_DOMAIN;
  }
}

export default async function AccountPage() {
  // learn.project-42.dev no longer owns this route once account.project-42.dev
  // is live (AB#6851) - redirect only real learn.project-42.dev production
  // traffic here. Local dev/test servers, CI, and the filtered export built
  // for account.project-42.dev itself all see the real dashboard - keying off
  // "is this the owning domain" instead would also redirect every local dev
  // server and Playwright run (host 127.0.0.1), and would make
  // account.project-42.dev/account redirect to itself.
  if ((await currentHost()) === LEARN_DOMAIN) {
    return (
      <main className="page-shell shell">
        <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
        <link rel="canonical" href={TARGET} />
        <header className="page-hero profile-hero">
          <p className="eyebrow">Account and access</p>
          <h1>Your account has a new home.</h1>
          <p>
            Manage your profile and sign-in identity at{" "}
            <a href={TARGET}>account.project-42.dev</a>.
          </p>
        </header>
      </main>
    );
  }

  return (
    <main className="page-shell shell">
      <header className="page-hero profile-hero">
        <p className="eyebrow">Account and access</p>
        <h1>One learning record. Your account.</h1>
        <p>
          Manage your profile and sign-in identity while keeping progress
          available across browsers and devices.
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
      <DeletionStatusLookup />
    </main>
  );
}
