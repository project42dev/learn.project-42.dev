"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import { BrandMark } from "../../components/BrandMark";

export function AdminHeader() {
  const pathname = usePathname();
  const { account } = useAuth();
  const displayName = account?.displayName || account?.primaryEmail || "Owner";
  const initials = displayName.slice(0, 2).toUpperCase();

  const navItems = [
    { label: "Accounts", href: "/admin" },
    { label: "Audit Logs", href: "/admin/logs" },
    { label: "Settings & Themes", href: "/admin/settings" },
  ];

  return (
    <header className="site-header" style={{ borderBottom: "1px solid rgba(56, 189, 248, 0.2)", background: "rgba(7, 11, 18, 0.95)" }}>
      <div className="shell header-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link className="brand" href="/admin" aria-label="Project 42 Admin Home" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <BrandMark />
            <span style={{ fontWeight: 700, fontSize: "16px", color: "#f8fafc" }}>
              Project <strong>42</strong>
            </span>
          </Link>
          <span style={{
            fontSize: "10.5px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: "4px",
            background: "rgba(56, 189, 248, 0.15)",
            color: "#38bdf8",
            border: "1px solid rgba(56, 189, 248, 0.3)"
          }}>
            Admin Console
          </span>
        </div>

        <nav aria-label="Admin navigation" style={{ display: "flex", gap: "8px" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  color: isActive ? "#38bdf8" : "#94a3b8",
                  background: isActive ? "rgba(56, 189, 248, 0.12)" : "transparent",
                  border: isActive ? "1px solid rgba(56, 189, 248, 0.25)" : "1px solid transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link
            href="/"
            style={{
              fontSize: "12.5px",
              color: "#94a3b8",
              textDecoration: "none",
              padding: "5px 10px",
              borderRadius: "4px",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            ← Exit Console
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #38bdf8, #818cf8)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "11px",
              color: "#070b12"
            }}>
              {initials}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
