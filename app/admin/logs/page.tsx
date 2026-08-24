"use client";

import React, { useState } from "react";

const SAMPLE_LOGS = [
  { id: "evt_99812", timestamp: "2026-08-24 01:14:22 UTC", event: "ACCOUNT_APPROVED", actor: "kristopher@turnerpublishing.com", target: "learner_4281", digest: "sha256:7f3a9b2...", status: "SUCCESS" },
  { id: "evt_99811", timestamp: "2026-08-24 00:52:10 UTC", event: "DOMAIN_RULE_UPDATED", actor: "kristopher@turnerpublishing.com", target: "*.mit.edu", digest: "sha256:4a8c1e9...", status: "SUCCESS" },
  { id: "evt_99810", timestamp: "2026-08-23 23:30:45 UTC", event: "OIDC_TRANSACTION_ESTABLISHED", actor: "system_auth", target: "learner_9921", digest: "sha256:1b2c3d4...", status: "SUCCESS" },
  { id: "evt_99809", timestamp: "2026-08-23 22:15:00 UTC", event: "DUPLICATE_RECOVERY_PROOF", actor: "learner_8814", target: "learner_8814", digest: "sha256:9f8e7d6...", status: "VERIFIED" },
  { id: "evt_99808", timestamp: "2026-08-23 21:04:12 UTC", event: "PURGE_SCHEDULED", actor: "kristopher@turnerpublishing.com", target: "learner_3301", digest: "sha256:5c6d7e8...", status: "PENDING_WINDOW" },
];

export default function AdminLogsPage() {
  const [filter, setFilter] = useState("");

  const filteredLogs = SAMPLE_LOGS.filter(l => 
    l.event.toLowerCase().includes(filter.toLowerCase()) || 
    l.actor.toLowerCase().includes(filter.toLowerCase()) ||
    l.target.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <main className="page-shell shell" style={{ paddingTop: "24px", maxWidth: "1200px" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 4px 0", color: "#f8fafc" }}>Audit &amp; Evidence Logs</h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>Inspect cryptographic event signatures, authentication lifecycle proofs, and administrative actions.</p>
        </div>
        <div>
          <input
            type="text"
            placeholder="Filter logs by event, actor, target..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#f8fafc",
              fontSize: "13px",
              width: "300px"
            }}
          />
        </div>
      </div>

      <div style={{ background: "#0b1225", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
              <th style={{ padding: "12px 16px" }}>Event ID</th>
              <th style={{ padding: "12px 16px" }}>Timestamp</th>
              <th style={{ padding: "12px 16px" }}>Action / Event</th>
              <th style={{ padding: "12px 16px" }}>Actor</th>
              <th style={{ padding: "12px 16px" }}>Target</th>
              <th style={{ padding: "12px 16px" }}>Digest</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, idx) => (
              <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#38bdf8" }}>{log.id}</td>
                <td style={{ padding: "12px 16px", color: "#94a3b8" }}>{log.timestamp}</td>
                <td style={{ padding: "12px 16px", fontWeight: 600, color: "#f8fafc" }}>{log.event}</td>
                <td style={{ padding: "12px 16px", color: "#cbd5e1" }}>{log.actor}</td>
                <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#cbd5e1" }}>{log.target}</td>
                <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#64748b" }}>{log.digest}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: log.status === "SUCCESS" || log.status === "VERIFIED" ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                    color: log.status === "SUCCESS" || log.status === "VERIFIED" ? "#4ade80" : "#facc15"
                  }}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
