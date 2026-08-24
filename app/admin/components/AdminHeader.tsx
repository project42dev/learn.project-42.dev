"use client";

import Link from "next/link";
import { BrandMark } from "../../components/BrandMark";
import { ProfileMenu } from "../../components/ProfileMenu";
import { useAuth } from "../../components/AuthProvider";
import { clientCrossDomainHref } from "../../lib/subdomainLinks";

export function AdminHeader() {
  const { status, signIn } = useAuth();
  const signedIn = status === "signed-in";

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <a className="brand" href="https://project-42.dev" aria-label="Project 42 home">
            <BrandMark />
            <span>
              Project <strong>42</strong>
            </span>
          </a>
          <span
            aria-label="Project 42 Administration"
            style={{
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: "4px",
              background: "rgba(17, 24, 39, 0.08)",
              color: "var(--ink)",
              border: "1px solid rgba(17, 24, 39, 0.15)",
            }}
          >
            Admin Console
          </span>
        </div>

        <nav aria-label="Admin navigation">
          <Link href="/admin">Accounts &amp; Registrations</Link>
          <a href="https://guide.project-42.dev">Field Guide</a>
          <a href="https://learn.project-42.dev/diagrams">Visual guides</a>
        </nav>

        <div className="header-actions">
          {!signedIn && (
            <button
              className="button button-primary"
              onClick={() => void signIn("/admin")}
              type="button"
              style={{ fontSize: "0.85rem", padding: "0.35rem 0.9rem" }}
            >
              Sign in
            </button>
          )}
          <a
            className="header-action"
            href="https://project-42.dev"
            style={{ textDecoration: "none" }}
          >
            ← Exit Console
          </a>
          <ProfileMenu
            accountHref={clientCrossDomainHref("/account")}
            learnerDataHref={clientCrossDomainHref("/learner-data")}
            profileHref={clientCrossDomainHref("/profile")}
          />
        </div>
      </div>
    </header>
  );
}
