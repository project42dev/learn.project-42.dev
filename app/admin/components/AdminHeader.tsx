"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "../../components/BrandMark";
import { ProfileMenu } from "../../components/ProfileMenu";

export function AdminHeader() {
  const pathname = usePathname();

  const isAccounts = pathname === "/admin" || pathname === "/admin/";
  const isLogs = pathname?.startsWith("/admin/logs");
  const isSettings = pathname?.startsWith("/admin/settings");

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link className="brand" href="/" aria-label="Project 42 home">
            <BrandMark />
            <span>
              Project <strong>42</strong>
            </span>
          </Link>
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
            aria-current={isAccounts ? "page" : undefined}
            href="/admin"
            style={{
              color: isAccounts ? "var(--ink)" : undefined,
              textDecoration: isAccounts ? "underline" : "none",
            }}
          >
            Accounts &amp; Registrations
          </Link>
          <Link
            aria-current={isLogs ? "page" : undefined}
            href="/admin/logs"
            style={{
              color: isLogs ? "var(--ink)" : undefined,
              textDecoration: isLogs ? "underline" : "none",
            }}
          >
            Audit Logs
          </Link>
          <Link
            aria-current={isSettings ? "page" : undefined}
            href="/admin/settings"
            style={{
              color: isSettings ? "var(--ink)" : undefined,
              textDecoration: isSettings ? "underline" : "none",
            }}
          >
            Settings &amp; Themes
          </Link>
        </nav>

        <div className="header-actions">
          <Link
            className="header-action"
            href="/"
            style={{ textDecoration: "none" }}
          >
            ← Exit Console
          </Link>
          <ProfileMenu
            accountHref="/account"
            learnerDataHref="/learner-data"
            profileHref="/profile"
          />
        </div>
      </div>
    </header>
  );
}
