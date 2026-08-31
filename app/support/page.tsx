import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support & Content Requests — Project 42",
  description: "Get assistance with Project 42, request new curriculum modules or agent patterns, report issues, and explore community support resources.",
};

export default function SupportPage() {
  return (
    <main className="page-shell shell" style={{ maxWidth: "1000px", padding: "40px 20px 80px" }}>
      <header style={{ marginBottom: "36px" }}>
        <p style={{
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontSize: "12px",
          fontWeight: 800,
          color: "#38bdf8",
          margin: "0 0 8px 0"
        }}>
          Help, Community &amp; Contributions
        </p>
        <h1 style={{ fontSize: "36px", fontWeight: 900, margin: "0 0 12px 0", color: "#f8fafc", letterSpacing: "-0.02em" }}>
          Support &amp; Content Requests
        </h1>
        <p style={{ fontSize: "17px", color: "#94a3b8", lineHeight: "1.6", margin: 0, maxWidth: "800px" }}>
          Project 42 is a community-driven, open-source AI learning platform. Whether you need technical help self-hosting, want to propose a new curriculum track, or found a defect, here is how to get support.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {/* 1. Request New Content */}
        <div style={{
          background: "#0b1225",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              marginBottom: "16px"
            }}>
              💡
            </div>
            <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#f8fafc", margin: "0 0 8px 0" }}>
              Request New Content
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              Have an AI topic, agent orchestration pattern, or interactive exercise you want covered? Propose curriculum modules and visual guides directly to the authoring team.
            </p>
          </div>
          <a
            href="https://github.com/project42dev/project42-platform/issues/new?title=Content+Request%3A+&labels=content%2Cenhancement"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              background: "#38bdf8",
              color: "#070b12",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "13.5px",
              textDecoration: "none",
              textAlign: "center"
            }}
          >
            Submit Content Request →
          </a>
        </div>

        {/* 2. Platform & Self-Host Help */}
        <div style={{
          background: "#0b1225",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              marginBottom: "16px"
            }}>
              🛠️
            </div>
            <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#f8fafc", margin: "0 0 8px 0" }}>
              Self-Hosting &amp; Docs
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              Need help configuring Docker containers, Keycloak OIDC authentication, Postgres/D1 persistence, or custom themes? Explore the platform docs or community threads.
            </p>
          </div>
          <Link
            href="/platform"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f8fafc",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "13.5px",
              textDecoration: "none",
              textAlign: "center"
            }}
          >
            View Platform Docs
          </Link>
        </div>

        {/* 3. Bug Reports & Defects */}
        <div style={{
          background: "#0b1225",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              marginBottom: "16px"
            }}>
              🐞
            </div>
            <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#f8fafc", margin: "0 0 8px 0" }}>
              Report a Defect
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              Found a broken link, visual layout flaw, accessibility issue, or runtime exception? File an issue on GitHub with reproduction steps.
            </p>
          </div>
          <a
            href="https://github.com/project42dev/project-42.dev/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f8fafc",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "13.5px",
              textDecoration: "none",
              textAlign: "center"
            }}
          >
            Open Bug Report →
          </a>
        </div>
      </div>

      {/* Additional Details & Policies */}
      <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "12px", padding: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#f8fafc", margin: "0 0 12px 0" }}>
          Community Support &amp; SLA Policy
        </h2>
        <p style={{ fontSize: "14.5px", color: "#94a3b8", lineHeight: "1.6", margin: "0 0 16px 0" }}>
          Project 42 is provided under open-source MIT &amp; CC-BY-4.0 licenses. We operate on a community-driven model and do not provide commercial uptime or response-time Service Level Agreements (SLAs). All issues, enhancements, and roadmap priorities are tracked publicly in Azure DevOps and GitHub.
        </p>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <Link href="/legal-transparency" style={{ color: "#38bdf8", fontSize: "13.5px", textDecoration: "none", fontWeight: 600 }}>
            Legal &amp; Transparency Policy →
          </Link>
          <Link href="/roadmap" style={{ color: "#38bdf8", fontSize: "13.5px", textDecoration: "none", fontWeight: 600 }}>
            Public Roadmap →
          </Link>
          <Link href="/releases" style={{ color: "#38bdf8", fontSize: "13.5px", textDecoration: "none", fontWeight: 600 }}>
            Release Notes →
          </Link>
        </div>
      </section>
    </main>
  );
}
