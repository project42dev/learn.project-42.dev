"use client";

import React from "react";
import Link from "next/link";
import { siteFacts } from "../lib/siteFacts";

export default function OpenSourcePlatformPage() {
  return (
    <main className="page-shell shell" style={{ maxWidth: "1050px", margin: "0 auto", padding: "48px 24px" }}>
      {/* HERO */}
      <header style={{ textAlign: "center", marginBottom: "56px" }}>
        <span style={{ fontSize: "11.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", padding: "5px 12px", borderRadius: "999px", border: "1px solid rgba(56, 189, 248, 0.25)", fontFamily: "monospace" }}>
          Open Source Platform · Apache-2.0 &amp; CC-BY-4.0
        </span>
        <h1 style={{ fontSize: "clamp(32px, 4.5vw, 52px)", fontWeight: 900, letterSpacing: "-0.03em", marginTop: "16px", marginBottom: "16px", lineHeight: 1.15 }}>
          The Open-Source Platform &amp; Documentation
        </h1>
        <p style={{ fontSize: "17.5px", color: "#cbd5e1", maxWidth: "66ch", margin: "0 auto 28px", lineHeight: 1.6 }}>
          Project 42 is a provider-neutral AI learning infrastructure designed for self-hosting, enterprise deployment, and verifiable learner credentials. Built with AI, for humans learning AI.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <a
            href={siteFacts.repositories.platform}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: "#38bdf8", color: "#080d2a", padding: "12px 26px", borderRadius: "999px", fontSize: "14px", fontWeight: 800, textDecoration: "none" }}
          >
            GitHub Repository ↗
          </a>
          <a
            href="https://gallery.project-42.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: "rgba(255, 255, 255, 0.08)", color: "#ffffff", border: "1px solid rgba(255, 255, 255, 0.15)", padding: "12px 26px", borderRadius: "999px", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}
          >
            Theme Gallery &amp; Studio ↗
          </a>
        </div>
      </header>

      {/* CORE ARCHITECTURE PILLARS */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "64px" }}>
        <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "28px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>🐳</div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Turnkey Self-Hosting</h3>
          <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.55 }}>
            Run the entire Project 42 stack in a single container or Kubernetes cluster with Keycloak OIDC, Postgres/D1 persistence, and rate-limiting.
          </p>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "28px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>🎨</div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Theme &amp; Layout Engine</h3>
          <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.55 }}>
            Hugo/Jekyll-inspired customizable branding. Switch between 7 built-in themes or author custom brand packages with automated JSON validation.
          </p>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "28px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>📜</div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Cryptographic Transcripts</h3>
          <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.55 }}>
            Learner progress, assessment evidence, and milestone badges are cryptographically signed for durable tamper-proof verification.
          </p>
        </div>
      </section>

      {/* QUICKSTART DOCUMENTATION */}
      <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px", padding: "36px", marginBottom: "64px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "16px" }}>Quickstart Guide</h2>
        <p style={{ fontSize: "14.5px", color: "#cbd5e1", marginBottom: "20px", lineHeight: 1.6 }}>
          You can run Project 42 locally or deploy to private infrastructure using the official platform package <code>@project42/platform</code>:
        </p>

        <pre style={{ background: "#050811", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "18px", overflowX: "auto", fontSize: "13px", color: "#38bdf8", fontFamily: "JetBrains Mono, monospace" }}>
{`# 1. Clone the Open-Source Platform
git clone https://github.com/project42dev/project42-platform.git
cd project42-platform

# 2. Install dependencies & build
npm install
npm run build

# 3. Launch Self-Host Server
npm run self-host`}
        </pre>
      </section>

      {/* DOCUMENTATION DIRECTORY */}
      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "24px" }}>Public Documentation &amp; Specifications</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <a
            href="https://github.com/project42dev/project42-gallery/blob/main/docs/THEME_AUTHORING_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "20px", borderRadius: "12px", textDecoration: "none", color: "inherit" }}
          >
            <strong style={{ fontSize: "16px", color: "#38bdf8", display: "block", marginBottom: "6px" }}>Theme Authoring Guide ↗</strong>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Rules, guidelines, and token definitions for creating custom organization themes.</p>
          </a>

          <a
            href="https://github.com/project42dev/project42-gallery/blob/main/docs/THEME_SCHEMA.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "20px", borderRadius: "12px", textDecoration: "none", color: "inherit" }}
          >
            <strong style={{ fontSize: "16px", color: "#38bdf8", display: "block", marginBottom: "6px" }}>Theme JSON Schema ↗</strong>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Strict schema specification for validating theme manifest files.</p>
          </a>

          <Link
            href="/legal-transparency"
            style={{ display: "block", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "20px", borderRadius: "12px", textDecoration: "none", color: "inherit" }}
          >
            <strong style={{ fontSize: "16px", color: "#38bdf8", display: "block", marginBottom: "6px" }}>Legal &amp; Transparency</strong>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Open licenses, data privacy commitments, and provider-neutral governance policies.</p>
          </Link>

          <Link
            href="/roadmap"
            style={{ display: "block", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "20px", borderRadius: "12px", textDecoration: "none", color: "inherit" }}
          >
            <strong style={{ fontSize: "16px", color: "#38bdf8", display: "block", marginBottom: "6px" }}>Public Roadmap</strong>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Now, Next, and Later milestones across the platform and curriculum.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
