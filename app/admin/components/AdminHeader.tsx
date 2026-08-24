"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "../../components/BrandMark";
import { ProfileMenu } from "../../components/ProfileMenu";
import { useAuth } from "../../components/AuthProvider";
import { clientCrossDomainHref } from "../../lib/subdomainLinks";

export function AdminHeader() {
  const pathname = usePathname();
  const { status, signIn } = useAuth();
  const signedIn = status === "signed-in";

  const isAccounts = pathname === "/admin" || pathname === "/admin/";
  const isLogs = pathname?.startsWith("/admin/logs");
  const isSettings = pathname?.startsWith("/admin/settings");

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
          <Link
            href="/admin"
            style={{
              fontWeight: isAccounts ? 700 : 500,
              color: isAccounts ? "var(--accent, #0284c7)" : undefined,
            }}
          >
            Accounts
          </Link>
          <Link
            href="/admin/logs"
            style={{
              fontWeight: isLogs ? 700 : 500,
              color: isLogs ? "var(--accent, #0284c7)" : undefined,
            }}
          >
            Audit Logs
          </Link>
          <Link
            href="/admin/settings"
            style={{
              fontWeight: isSettings ? 700 : 500,
              color: isSettings ? "var(--accent, #0284c7)" : undefined,
            }}
          >
            Settings &amp; Themes
          </Link>
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
