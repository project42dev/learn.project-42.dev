"use client";

import type { LearnerProgress } from "@project42/platform";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "./ProgressProvider";

const legacyOrigin = "https://project-42.dev";
const transferReady = "project42-progress-transfer-ready-v1";
const transferRequest = "project42-progress-transfer-request-v1";
const transferResponse = "project42-progress-transfer-response-v1";

function parseProgress(value: unknown): LearnerProgress | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as Partial<LearnerProgress>;
    if (
      parsed.schemaVersion !== 1 ||
      !Array.isArray(parsed.attempts) ||
      !Array.isArray(parsed.completedModuleIds)
    ) {
      return null;
    }
    return {
      ...(parsed as LearnerProgress),
      capstoneSubmissions: parsed.capstoneSubmissions ?? [],
    };
  } catch {
    return null;
  }
}

export function ProgressMigration() {
  const { hydrated, progress, replaceProgress } = useProgress();
  const bridge = useRef<HTMLIFrameElement>(null);
  const [legacyProgress, setLegacyProgress] = useState<LearnerProgress | null>(null);
  const [status, setStatus] = useState<
    "checking" | "available" | "empty" | "invalid" | "imported"
  >("checking");

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.origin !== legacyOrigin ||
        event.source !== bridge.current?.contentWindow
      ) {
        return;
      }
      if (event.data?.type === transferReady) {
        bridge.current?.contentWindow?.postMessage(
          { type: transferRequest },
          legacyOrigin,
        );
        return;
      }
      if (event.data?.type !== transferResponse) return;
      if (event.data.payload === null) {
        setStatus("empty");
        return;
      }
      const candidate = parseProgress(event.data.payload);
      if (!candidate) {
        setStatus("invalid");
        return;
      }
      setLegacyProgress(candidate);
      setStatus("available");
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  function requestTransfer() {
    setStatus("checking");
    bridge.current?.contentWindow?.postMessage({ type: transferRequest }, legacyOrigin);
  }

  function importProgress() {
    if (!legacyProgress) return;
    replaceProgress(legacyProgress);
    setStatus("imported");
  }

  const destinationHasProgress =
    progress.attempts.length > 0 ||
    progress.completedModuleIds.length > 0 ||
    (progress.capstoneSubmissions?.length ?? 0) > 0;

  return (
    <section className="profile-card" aria-labelledby="progress-migration-title">
      <p className="eyebrow">One-time migration</p>
      <h2 id="progress-migration-title">Bring your existing progress to Learn</h2>
      <p>
        Project 42 previously stored learning progress under project-42.dev. This
        check reads that browser-only record through a narrowly scoped,
        same-project transfer page. It first lands in this browser; if you already
        connected an approved account, the normal progress synchronization then
        saves it to that account.
      </p>
      <iframe
        hidden
        onLoad={requestTransfer}
        ref={bridge}
        src={`${legacyOrigin}/transfer-progress`}
        title="Project 42 legacy progress transfer"
      />
      {status === "checking" && <p role="status">Checking this browser…</p>}
      {status === "empty" && (
        <p role="status">No previous Project 42 progress was found in this browser.</p>
      )}
      {status === "invalid" && (
        <p role="alert">
          A previous record was found, but it did not match the supported progress
          format. Use the transcript restore option instead.
        </p>
      )}
      {status === "available" && legacyProgress && (
        <div>
          <p role="status">
            Found {legacyProgress.completedModuleIds.length} completed modules and{" "}
            {legacyProgress.attempts.length} knowledge-check attempts.
          </p>
          {destinationHasProgress && (
            <p>
              This Learn site already has progress. Importing will replace the
              browser record currently shown here.
            </p>
          )}
          <button className="button button-primary" onClick={importProgress} type="button">
            Import previous progress
          </button>
        </div>
      )}
      {status === "imported" && (
        <p role="status">
          Progress imported. Your profile and transcript now use the transferred
          record.
        </p>
      )}
      {status !== "available" && status !== "imported" && (
        <button
          className="button button-secondary"
          disabled={!hydrated || status === "checking"}
          onClick={requestTransfer}
          type="button"
        >
          Check again
        </button>
      )}
    </section>
  );
}
