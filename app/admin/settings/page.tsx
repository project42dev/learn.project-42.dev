"use client";

import React, { useState } from "react";

const THEMES = [
  { id: "01-cosmic-answer", name: "01 Cosmic Answer", bg: "#05070e", primary: "#6366f1", accent: "#38bdf8", description: "Deep midnight canvas with ethereal indigo nebulas and cyan starlight." },
  { id: "02-dont-panic-gold", name: "02 Don't Panic Gold", bg: "#0d0b05", primary: "#f59e0b", accent: "#fbbf24", description: "Friendly galactic gold and warm amber on warm cosmic obsidian." },
  { id: "03-magrathean-blueprint", name: "03 Magrathean Blueprint", bg: "#060d14", primary: "#0ea5e9", accent: "#38bdf8", description: "Precision technical grid with blueprint azure and drafting cyan." },
  { id: "04-field-signal", name: "04 Field Signal (Default)", bg: "#070b12", primary: "#10b981", accent: "#34d399", description: "Standard tactical telemetry with emerald status lights and slate glass." },
  { id: "05-heart-of-gold", name: "05 Heart of Gold", bg: "#0d0612", primary: "#ec4899", accent: "#a855f7", description: "Infinite Improbability pink, neon magenta, and cosmic violet." },
  { id: "06-galactic-guide", name: "06 Galactic Guide", bg: "#060f0d", primary: "#14b8a6", accent: "#2dd4bf", description: "Sub-Etha emerald green, interstellar teal, and holographic terminals." },
  { id: "07-deep-thought", name: "07 Deep Thought", bg: "#09090b", primary: "#a855f7", accent: "#c084fc", description: "Monolithic computing dark mode with calculating purple." },
];

const LAYOUTS = [
  { id: "website", name: "Full Website Gateway", description: "Standard top navbar, full-width content shell, interactive hero, and compact footer." },
  { id: "dashboard", name: "Operational Dashboard", description: "Collapsible left sidebar, compact top telemetry strip, and dense data cards." },
  { id: "portal", name: "Executive Portal", description: "Centered single-column layout with high-focus typography and distraction-free learning." },
];

export default function AdminSettingsPage() {
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("p42_theme") || "04-field-signal";
    }
    return "04-field-signal";
  });
  const [activeLayout, setActiveLayout] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("p42_layout") || "website";
    }
    return "website";
  });
  const [approvedDomains, setApprovedDomains] = useState("turnerpublishing.com\nmit.edu\nanthropic-partner.org");
  const [savedStatus, setSavedStatus] = useState("");

  const handleSave = () => {
    localStorage.setItem("p42_theme", activeTheme);
    localStorage.setItem("p42_layout", activeLayout);
    document.documentElement.setAttribute("data-theme", activeTheme);
    setSavedStatus("✓ Settings & Theme configuration saved successfully!");
    setTimeout(() => setSavedStatus(""), 4000);
  };

  return (
    <main className="page-shell shell" style={{ paddingTop: "24px", maxWidth: "1200px" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 4px 0", color: "#f8fafc" }}>Settings &amp; Appearance</h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>Configure platform appearance, theme presets, layout templates, and approved email domains.</p>
        </div>
        <button
          onClick={handleSave}
          style={{
            padding: "8px 18px",
            borderRadius: "6px",
            background: "#38bdf8",
            color: "#070b12",
            border: "none",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Save Changes
        </button>
      </div>

      {savedStatus && (
        <div style={{ padding: "12px 16px", borderRadius: "6px", background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#4ade80", marginBottom: "20px", fontSize: "13.5px" }}>
          {savedStatus}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <section style={{ background: "#0b1225", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "20px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#f8fafc", margin: "0 0 8px 0" }}>Theme Presets</h2>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 16px 0" }}>Select the active theme applied across the platform. Additional themes can be downloaded from the Theme Gallery.</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {THEMES.map((theme) => {
              const isSelected = activeTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => setActiveTheme(theme.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "6px",
                    background: isSelected ? "rgba(56, 189, 248, 0.12)" : "rgba(255,255,255,0.02)",
                    border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: theme.bg, border: "1px solid rgba(255,255,255,0.2)" }} />
                      <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: theme.primary }} />
                      <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: theme.accent }} />
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: "13.5px", color: "#f8fafc" }}>{theme.name}</strong>
                      <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>{theme.description}</span>
                    </div>
                  </div>
                  <input type="radio" checked={isSelected} onChange={() => setActiveTheme(theme.id)} />
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section style={{ background: "#0b1225", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#f8fafc", margin: "0 0 8px 0" }}>Layout Template</h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 16px 0" }}>Choose how navigation and modules are arranged.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {LAYOUTS.map((layout) => {
                const isSelected = activeLayout === layout.id;
                return (
                  <div
                    key={layout.id}
                    onClick={() => setActiveLayout(layout.id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "6px",
                      background: isSelected ? "rgba(56, 189, 248, 0.12)" : "rgba(255,255,255,0.02)",
                      border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", fontSize: "13.5px", color: "#f8fafc" }}>{layout.name}</strong>
                      <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>{layout.description}</span>
                    </div>
                    <input type="radio" checked={isSelected} onChange={() => setActiveLayout(layout.id)} />
                  </div>
                );
              })}
            </div>
          </section>

          <section style={{ background: "#0b1225", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "20px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#f8fafc", margin: "0 0 8px 0" }}>Approved Email Domains</h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 12px 0" }}>Enter exact domains eligible for instant automatic account approval (one per line):</p>
            <textarea
              rows={4}
              value={approvedDomains}
              onChange={(e) => setApprovedDomains(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#f8fafc",
                fontSize: "13px",
                fontFamily: "monospace",
                boxSizing: "border-box"
              }}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
