"use client";

import {
  buildAssessmentHistory,
  buildCapstoneHistory,
  buildPortableLearnerRecord,
  buildTranscript,
  buildTranscriptCsv,
  restorePortableLearnerRecord,
  serializePortableLearnerRecord,
  starterCatalog,
} from "@project42/platform";
import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import {
  buildProgressMigrationItems,
  buildProgressReconciliationPackage,
  createProgressImportId,
  createProgressMigrationPreview,
  type ProgressMigrationDisposition,
  type ProgressMigrationPreview,
  type ProgressReconciliationPackage,
} from "../lib/progressMigration";
import { clientCrossDomainHref } from "../lib/subdomainLinks";
import { useAuth } from "./AuthProvider";
import { useProgress } from "./ProgressProvider";

export function ProfileDashboard() {
  const { account, apiFetch, configured } = useAuth();
  const {
    progress,
    migrationPreview,
    localRecordRecovery,
    migrationRecovery,
    hydrated,
    storageStatus,
    syncStatus,
    migrateLocalToAccount,
    verifyMigrationExport,
    removeMigrationRecovery,
    replaceProgress,
    rename,
    reset,
  } = useProgress();
  const [importStatus, setImportStatus] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [reconciliationStatus, setReconciliationStatus] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const [backupRemovalConfirmed, setBackupRemovalConfirmed] = useState(false);
  const [transcriptDownloadStatus, setTranscriptDownloadStatus] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const [transcriptDownloadPending, setTranscriptDownloadPending] =
    useState(false);
  const transcript = useMemo(
    () => buildTranscript(starterCatalog, progress),
    [progress],
  );
  const assessmentHistory = useMemo(
    () => buildAssessmentHistory(starterCatalog, progress),
    [progress],
  );
  const capstoneHistory = useMemo(
    () => buildCapstoneHistory(starterCatalog, progress),
    [progress],
  );
  const exportDate = new Date().toISOString().slice(0, 10);
  const authoritativeAccountTranscript = account?.state === "approved";
  const migrationItems = useMemo(
    () =>
      migrationPreview
        ? buildProgressMigrationItems(migrationPreview, starterCatalog)
        : [],
    [migrationPreview],
  );
  const retainedPreview = useMemo(
    () =>
      migrationRecovery
        ? createProgressMigrationPreview(
            migrationRecovery.localProgress,
            migrationRecovery.remoteProgress,
          )
        : null,
    [migrationRecovery],
  );

  const downloadRecord = () => {
    const record = buildPortableLearnerRecord(starterCatalog, progress);
    downloadTextFile(
      `project-42-learning-record-${exportDate}.json`,
      serializePortableLearnerRecord(record),
      "application/json",
    );
  };

  const downloadTranscript = async () => {
    setTranscriptDownloadStatus(null);
    if (!authoritativeAccountTranscript) {
      downloadTextFile(
        `project-42-browser-local-transcript-${exportDate}.csv`,
        buildTranscriptCsv(starterCatalog, progress),
        "text/csv",
      );
      setTranscriptDownloadStatus({
        kind: "success",
        message:
          "Browser-local transcript downloaded. It is not an authoritative account transcript.",
      });
      return;
    }

    setTranscriptDownloadPending(true);
    try {
      const response = await apiFetch("/v1/me/transcript.csv");
      if (!response.ok) {
        const body = (await response
          .clone()
          .json()
          .catch(() => null)) as {
          error?: { code?: string };
        } | null;
        if (body?.error?.code === "recent_authentication_required") {
          throw new Error(
            "Sign out and sign in again before downloading your authoritative account transcript.",
          );
        }
        throw new Error(
          "The authoritative account transcript could not be downloaded. Your browser-local record is unchanged; try again.",
        );
      }
      if (
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .startsWith("text/csv")
      ) {
        throw new Error(
          "The account service returned an invalid transcript. Your browser-local record is unchanged; try again.",
        );
      }
      const content = await response.text();
      if (!content.startsWith('"schema_version","record_authority","record_type"')) {
        throw new Error(
          "The account service returned an unsupported transcript. Your browser-local record is unchanged; try again.",
        );
      }
      downloadTextFile(
        `project42-authoritative-account-transcript-${exportDate}.csv`,
        content,
        "text/csv",
      );
      setTranscriptDownloadStatus({
        kind: "success",
        message:
          "Authoritative account transcript downloaded directly from your durable learner record.",
      });
    } catch (caught) {
      setTranscriptDownloadStatus({
        kind: "error",
        message:
          caught instanceof Error
            ? caught.message
            : "The authoritative account transcript could not be downloaded. Your browser-local record is unchanged; try again.",
      });
    } finally {
      setTranscriptDownloadPending(false);
    }
  };

  const downloadRecoveryRecord = () => {
    if (!localRecordRecovery) return;
    downloadTextFile(
      `project-42-browser-record-recovery-${exportDate}.json`,
      localRecordRecovery.rawRecord,
      "application/json",
    );
  };

  const downloadReconciliationPackage = async (
    preview: ProgressMigrationPreview,
    state: ProgressReconciliationPackage["state"],
    importId?: string,
  ) => {
    const generatedAt = new Date().toISOString();
    const resolvedImportId =
      importId ?? (await createProgressImportId(preview.localProgress));
    const reconciliation = buildProgressReconciliationPackage(
      preview,
      starterCatalog,
      { generatedAt, importId: resolvedImportId, state },
    );
    downloadTextFile(
      `project-42-progress-reconciliation-${exportDate}.json`,
      `${JSON.stringify(reconciliation, null, 2)}\n`,
      "application/json",
    );
    setReconciliationStatus({
      kind: "success",
      message:
        "Portable browser, account, proposed-merge, and transcript evidence downloaded.",
    });
  };

  const verifyAndDownloadAccountExport = async () => {
    setReconciliationStatus(null);
    try {
      const exported = await verifyMigrationExport();
      downloadTextFile(
        `project42-verified-account-export-${exportDate}.json`,
        `${JSON.stringify(exported, null, 2)}\n`,
        "application/json",
      );
      setReconciliationStatus({
        kind: "success",
        message:
          "The server export matches the retained migration record and was downloaded.",
      });
    } catch (caught) {
      setReconciliationStatus({
        kind: "error",
        message:
          caught instanceof Error
            ? caught.message
            : "The account export could not be verified.",
      });
    }
  };

  const importRecord = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setImportStatus({
        kind: "error",
        message: "That file is too large. Project 42 records must be under 1 MB.",
      });
      return;
    }

    try {
      const parsed: unknown = JSON.parse(await file.text());
      const restored = restorePortableLearnerRecord(parsed, starterCatalog);
      if (!restored.valid) {
        setImportStatus({
          kind: "error",
          message: `This record cannot be restored: ${restored.errors.join("; ")}`,
        });
        return;
      }
      if (
        !window.confirm(
          "Replace the progress currently stored in this browser with this record?",
        )
      ) {
        return;
      }
      replaceProgress(restored.progress);
      setImportStatus({
        kind: "success",
        message: `Restored ${restored.progress.completedModuleIds.length} completed modules, ${restored.progress.attempts.length} knowledge checks, and ${restored.progress.capstoneSubmissions?.length ?? 0} capstone submissions.`,
      });
    } catch {
      setImportStatus({
        kind: "error",
        message: "This file is not a valid Project 42 JSON learning record.",
      });
    }
  };

  if (!hydrated) {
    return <div className="profile-loading">Loading your device-local record…</div>;
  }

  return (
    <div className="profile-dashboard">
      {localRecordRecovery ? (
        <aside
          aria-labelledby="local-record-recovery-title"
          className="storage-warning"
          role="alert"
        >
          <strong id="local-record-recovery-title">
            Your browser record needs recovery.
          </strong>
          <p>
            Project 42 found an unsupported or damaged local record. It has not
            replaced that record, uploaded it, or started account synchronization.
          </p>
          <ul>
            {localRecordRecovery.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <p>
            Download the untouched record before trying to repair it or restore a
            compatible Project 42 JSON record. Keep the download private because it
            can contain learning history.
          </p>
          <button
            className="button button-secondary"
            onClick={downloadRecoveryRecord}
            type="button"
          >
            Download original browser record
          </button>
        </aside>
      ) : storageStatus !== "ready" ? (
        <aside className="storage-warning" role="alert">
          <strong>Progress storage needs attention.</strong>
          <p>
            This browser is not reliably saving Project 42 progress. Your work remains
            available in this tab, but it may be lost when the tab closes. Download a
            JSON record after completing a module.
          </p>
        </aside>
      ) : null}

      <section className="profile-card account-sync-card" aria-labelledby="account-sync-title">
        <p className="eyebrow">Cross-device progress</p>
        <h2 id="account-sync-title">
          {syncStatus === "synced"
            ? "Progress is synchronized"
            : syncStatus === "migration-available"
              ? "Move this browser record into your account"
              : "Browser and account status"}
        </h2>
        {!configured ? (
          <p>
            This deployment has not connected its account service yet. Your record
            continues to stay privately in this browser.
          </p>
        ) : !account ? (
          <p>
            <Link href={clientCrossDomainHref("/account")}>Sign in</Link> to request access and synchronize
            progress after approval.
          </p>
        ) : account.state !== "approved" ? (
          <p>
            Your account is {account.state}. Progress remains in this browser until
            the account is approved.
          </p>
        ) : syncStatus === "migration-available" ? (
          <>
            <p>
              Review the browser and account records before anything is saved.
              Project 42 keeps both copies recoverable until the account confirms
              the import.
            </p>
            {migrationPreview ? (
              <>
                <div
                  aria-label="Progress migration preview"
                  className="progress-migration-preview"
                  role="group"
                >
                  <dl>
                    <div>
                      <dt>Record</dt>
                      <dd>Browser / account / after import</dd>
                    </div>
                    <div>
                      <dt>Started paths</dt>
                      <dd>
                        {migrationPreview.local.startedPaths} /{" "}
                        {migrationPreview.remote.startedPaths} /{" "}
                        {migrationPreview.merged.startedPaths}
                      </dd>
                    </div>
                    <div>
                      <dt>Completed modules</dt>
                      <dd>
                        {migrationPreview.local.completedModules} /{" "}
                        {migrationPreview.remote.completedModules} /{" "}
                        {migrationPreview.merged.completedModules}
                      </dd>
                    </div>
                    <div>
                      <dt>Assessment attempts</dt>
                      <dd>
                        {migrationPreview.local.attempts} /{" "}
                        {migrationPreview.remote.attempts} /{" "}
                        {migrationPreview.merged.attempts}
                      </dd>
                    </div>
                    <div>
                      <dt>Capstone submissions</dt>
                      <dd>
                        {migrationPreview.local.capstoneSubmissions} /{" "}
                        {migrationPreview.remote.capstoneSubmissions} /{" "}
                        {migrationPreview.merged.capstoneSubmissions}
                      </dd>
                    </div>
                    <div>
                      <dt>Badges</dt>
                      <dd>
                        {migrationPreview.local.badges} /{" "}
                        {migrationPreview.remote.badges} /{" "}
                        {migrationPreview.merged.badges}
                      </dd>
                    </div>
                  </dl>
                </div>
                <p>
                  The import adds {migrationPreview.localAdditions.attempts} browser
                  assessment{" "}
                  {migrationPreview.localAdditions.attempts === 1
                    ? "attempt"
                    : "attempts"}{" "}
                  and {migrationPreview.localAdditions.completedModules} completed{" "}
                  {migrationPreview.localAdditions.completedModules === 1
                    ? "module"
                    : "modules"}
                  . Existing account attempts keep their original IDs and timestamps.
                </p>
                <div
                  aria-labelledby="migration-item-heading"
                  className="migration-item-review"
                >
                  <h3 id="migration-item-heading">
                    Exact browser evidence review
                  </h3>
                  <p>
                    Every browser enrollment, completion, attempt, capstone, and
                    badge is listed with the action this merge will take.
                  </p>
                  <ul>
                    {migrationItems.map((item) => (
                      <li key={`${item.kind}-${item.id}`}>
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.detail}</span>
                          <code>{item.id}</code>
                        </div>
                        <span className={`migration-disposition ${item.disposition}`}>
                          {migrationDispositionLabel(item.disposition)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="migration-behavior">
                  <h3>Merge and replace effects</h3>
                  <p>
                    Merge retains every account-only record, adds browser-only
                    evidence, and keeps identical immutable evidence once.
                  </p>
                  <p>
                    Replacing the account is unavailable because it would remove{" "}
                    {migrationPreview.remoteOnly.startedPaths} path enrollment
                    {migrationPreview.remoteOnly.startedPaths === 1 ? "" : "s"},{" "}
                    {migrationPreview.remoteOnly.completedModules} completion
                    {migrationPreview.remoteOnly.completedModules === 1 ? "" : "s"},{" "}
                    {migrationPreview.remoteOnly.attempts} attempt
                    {migrationPreview.remoteOnly.attempts === 1 ? "" : "s"},{" "}
                    {migrationPreview.remoteOnly.capstoneSubmissions} capstone
                    {migrationPreview.remoteOnly.capstoneSubmissions === 1 ? "" : "s"},
                    and {migrationPreview.remoteOnly.badges} badge
                    {migrationPreview.remoteOnly.badges === 1 ? "" : "s"} held only
                    by the account.
                  </p>
                </div>
                {migrationPreview.duplicateAttempts > 0 ||
                migrationPreview.duplicateCapstoneSubmissions > 0 ? (
                  <p>
                    Matching duplicate evidence will be kept once; retrying this
                    import uses the same receipt and does not duplicate attempts.
                  </p>
                ) : null}
                {migrationPreview.conflicts.length > 0 ? (
                  <div className="storage-warning" role="alert">
                    <strong>Conflicting immutable evidence needs attention.</strong>
                    <ul>
                      {migrationPreview.conflicts.map((conflict) => (
                        <li key={`${conflict.kind}-${conflict.id}`}>
                          {conflict.message}
                        </li>
                      ))}
                    </ul>
                    <p>
                      Nothing has been changed. The account transcript remains
                      unchanged, and the browser attempt remains in the retained
                      local record. Download the reconciliation package containing
                      both immutable records and the proposed transcript before
                      contacting support.
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="button-row">
              <button
                className="button button-secondary"
                disabled={!migrationPreview}
                onClick={() => {
                  if (!migrationPreview) return;
                  setReconciliationStatus(null);
                  void downloadReconciliationPackage(
                    migrationPreview,
                    "preview",
                  ).catch(() => {
                    setReconciliationStatus({
                      kind: "error",
                      message:
                        "The reconciliation package could not be created. Nothing was uploaded.",
                    });
                  });
                }}
                type="button"
              >
                Download reconciliation package
              </button>
              <button
                className="button button-primary"
                disabled={
                  !migrationPreview || migrationPreview.conflicts.length > 0
                }
                onClick={() => {
                  setMigrationError(null);
                  void migrateLocalToAccount().catch((caught) => {
                    setMigrationError(
                      caught instanceof Error
                        ? caught.message
                        : "Progress could not be moved.",
                    );
                  });
                }}
                type="button"
              >
                Confirm and merge into my account
              </button>
            </div>
          </>
        ) : (
          <p>
            {syncStatus === "checking" && "Checking the server record…"}
            {syncStatus === "recovery-needed" &&
              "Account synchronization is paused while the original browser record is available for recovery."}
            {syncStatus === "syncing" && "Saving your latest progress…"}
            {syncStatus === "synced" &&
              "Changes to modules, scores, transcripts, and badges are saved to your account."}
            {syncStatus === "error" &&
              "Synchronization failed. Your browser copy remains available; retry by reloading this page."}
          </p>
        )}
        {migrationError ? <p role="alert">{migrationError}</p> : null}
      </section>

      {migrationRecovery && retainedPreview ? (
        <section
          aria-labelledby="retained-migration-heading"
          className="profile-card retained-migration"
        >
          <p className="eyebrow">Browser backup</p>
          <h2 id="retained-migration-heading">
            Retained migration evidence
          </h2>
          <p>
            The original browser record, the account record used for comparison,
            and the proposed merge remain in this browser until you explicitly
            remove them.
          </p>
          <dl>
            <div>
              <dt>Import receipt</dt>
              <dd><code>{migrationRecovery.importId}</code></dd>
            </div>
            <div>
              <dt>State</dt>
              <dd>{migrationRecovery.state}</dd>
            </div>
            <div>
              <dt>Verified server export</dt>
              <dd>
                {migrationRecovery.verifiedExportAt
                  ? `Revision ${migrationRecovery.verifiedRevision} verified ${migrationRecovery.verifiedExportAt}`
                  : "Not yet verified"}
              </dd>
            </div>
          </dl>
          <div className="button-row">
            <button
              className="button button-secondary"
              onClick={() => {
                setReconciliationStatus(null);
                void downloadReconciliationPackage(
                  retainedPreview,
                  migrationRecovery.state,
                  migrationRecovery.importId,
                ).catch(() => {
                  setReconciliationStatus({
                    kind: "error",
                    message: "The retained reconciliation package could not be created.",
                  });
                });
              }}
              type="button"
            >
              Download retained reconciliation package
            </button>
            {migrationRecovery.state === "completed" ? (
              <button
                className="button button-secondary"
                onClick={() => void verifyAndDownloadAccountExport()}
                type="button"
              >
                Verify and download account export
              </button>
            ) : null}
          </div>
          <div className="backup-removal">
            <label>
              <input
                checked={backupRemovalConfirmed}
                onChange={(event) =>
                  setBackupRemovalConfirmed(event.currentTarget.checked)
                }
                type="checkbox"
              />
              I understand that removing this retained backup deletes the original
              pre-merge browser and account comparison from this device.
            </label>
            <button
              className="button button-secondary"
              disabled={!backupRemovalConfirmed}
              onClick={() => {
                try {
                  removeMigrationRecovery();
                  setBackupRemovalConfirmed(false);
                  setReconciliationStatus({
                    kind: "success",
                    message:
                      "The retained browser migration backup was removed from this device.",
                  });
                } catch {
                  setReconciliationStatus({
                    kind: "error",
                    message:
                      "The browser could not remove the retained migration backup.",
                  });
                }
              }}
              type="button"
            >
              Remove retained browser backup
            </button>
          </div>
        </section>
      ) : null}

      {reconciliationStatus ? (
        <p
          className={`import-status import-status-${reconciliationStatus.kind}`}
          role={reconciliationStatus.kind === "error" ? "alert" : "status"}
        >
          {reconciliationStatus.message}
        </p>
      ) : null}

      <section className="profile-card profile-identity">
        <p className="eyebrow">Learner profile</p>
        <h2>{progress.displayName}</h2>
        <p>
          Your browser keeps a local copy. When an approved account is connected,
          Project 42 also synchronizes the record with the server.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            rename(String(form.get("displayName") ?? ""));
          }}
        >
          <label htmlFor="display-name">Display name</label>
          <div className="name-row">
            <input
              defaultValue={progress.displayName}
              id="display-name"
              key={progress.displayName}
              name="displayName"
            />
            <button className="button button-secondary" type="submit">
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="profile-stats" aria-label="Learning statistics">
        <div>
          <span>{progress.completedModuleIds.length}</span>
          <small>Modules completed</small>
        </div>
        <div>
          <span>{progress.attempts.length}</span>
          <small>Knowledge checks</small>
        </div>
        <div>
          <span>{progress.badges.length}</span>
          <small>Badges earned</small>
        </div>
        <div>
          <span>{progress.capstoneSubmissions?.length ?? 0}</span>
          <small>Capstone submissions</small>
        </div>
      </section>

      <section className="transcript-section">
        <div className="section-heading section-heading-inline">
          <div>
            <p className="eyebrow">Transcript</p>
            <h2>Your paths</h2>
          </div>
          <Link className="text-link" href="/learn">
            Continue learning
          </Link>
        </div>
        <p className="record-authority-note">
          {authoritativeAccountTranscript
            ? "This on-screen view reflects the latest account progress synchronized to this browser. The authoritative CSV is generated directly from your durable account record."
            : "This transcript is browser-local. It is useful as a portable learning record, but it is not an authoritative account transcript."}
        </p>
        <div className="transcript-list">
          {transcript.map((entry) => (
            <article key={entry.pathId}>
              <div>
                <h3>{entry.pathTitle}</h3>
                <p>
                  {entry.completedModules} of {entry.totalModules} modules
                  {entry.bestScorePercent === null
                    ? ""
                    : ` · Best check ${entry.bestScorePercent}%`}
                </p>
              </div>
              <div
                aria-label={`${entry.pathTitle} completion`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={entry.completionPercent}
                className="transcript-progress"
                role="progressbar"
              >
                <span style={{ width: `${entry.completionPercent}%` }} />
              </div>
              <strong>{entry.completionPercent}%</strong>
            </article>
          ))}
        </div>
        <div className="profile-export" aria-labelledby="export-heading">
          <div>
            <h3 id="export-heading">Back up or move your progress</h3>
            <p>
              {authoritativeAccountTranscript
                ? "Download a browser-local backup or request a spreadsheet-friendly authoritative transcript from your account. The server creates no public download link."
                : "Download a complete browser-local record, restore one on another device, or save a browser-local spreadsheet transcript. Files stay on your device."}
            </p>
          </div>
          <div className="profile-transfer">
            <div className="button-row">
              <button
                className="button button-secondary"
                onClick={downloadRecord}
                type="button"
              >
                Download browser-local JSON record
              </button>
              <button
                className="button button-secondary"
                disabled={transcriptDownloadPending}
                onClick={() => void downloadTranscript()}
                type="button"
              >
                {transcriptDownloadPending
                  ? "Requesting authoritative transcript…"
                  : authoritativeAccountTranscript
                    ? "Download authoritative account CSV transcript"
                    : "Download browser-local CSV transcript"}
              </button>
            </div>
            <label className="record-import">
              <span>Restore a JSON record</span>
              <input
                accept="application/json,.json"
                aria-describedby="record-import-help"
                onChange={importRecord}
                type="file"
              />
            </label>
            <small id="record-import-help">
              Restoring replaces the progress in this browser after confirmation.
            </small>
          </div>
        </div>
        {importStatus ? (
          <p
            className={`import-status import-status-${importStatus.kind}`}
            role={importStatus.kind === "error" ? "alert" : "status"}
          >
            {importStatus.message}
          </p>
        ) : null}
        {transcriptDownloadStatus ? (
          <p
            className={`import-status import-status-${transcriptDownloadStatus.kind}`}
            role={
              transcriptDownloadStatus.kind === "error" ? "alert" : "status"
            }
          >
            {transcriptDownloadStatus.message}
          </p>
        ) : null}
      </section>

      <section className="attempt-section" aria-labelledby="attempt-history-heading">
        <div className="section-heading section-heading-inline">
          <div>
            <p className="eyebrow">Assessment history</p>
            <h2 id="attempt-history-heading">Your scores</h2>
          </div>
          <span className="attempt-count">
            {assessmentHistory.length}{" "}
            {assessmentHistory.length === 1 ? "attempt" : "attempts"}
          </span>
        </div>
        {assessmentHistory.length > 0 ? (
          <div className="attempt-table-wrap">
            <table className="attempt-table">
              <thead>
                <tr>
                  <th scope="col">Module</th>
                  <th scope="col">Path</th>
                  <th scope="col">Score</th>
                  <th scope="col">Result</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {assessmentHistory.map((attempt) => (
                  <tr key={attempt.attemptId}>
                    <th scope="row">{attempt.moduleTitle}</th>
                    <td>{attempt.pathTitle}</td>
                    <td>{attempt.scorePercent}%</td>
                    <td>
                      <span
                        className={
                          attempt.passed ? "attempt-passed" : "attempt-not-passed"
                        }
                      >
                        {attempt.passed ? "Passed" : "Try again"}
                      </span>
                    </td>
                    <td>{new Date(attempt.completedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state attempt-empty">
            <h3>No scores yet.</h3>
            <p>Complete a module knowledge check and every attempt will appear here.</p>
            <Link className="button button-primary" href="/learn">
              Choose a learning path
            </Link>
          </div>
        )}
      </section>

      <section className="attempt-section" aria-labelledby="capstone-history-heading">
        <div className="section-heading section-heading-inline">
          <div>
            <p className="eyebrow">Applied evidence</p>
            <h2 id="capstone-history-heading">Capstone history</h2>
          </div>
          <span className="attempt-count">
            {capstoneHistory.length}{" "}
            {capstoneHistory.length === 1 ? "submission" : "submissions"}
          </span>
        </div>
        {capstoneHistory.length > 0 ? (
          <div className="attempt-table-wrap">
            <table className="attempt-table">
              <thead>
                <tr>
                  <th scope="col">Capstone</th>
                  <th scope="col">Path</th>
                  <th scope="col">Score</th>
                  <th scope="col">Result</th>
                  <th scope="col">Artifacts</th>
                  <th scope="col">Evidence links</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {capstoneHistory.map((submission) => (
                  <tr key={submission.id}>
                    <th scope="row">{submission.capstoneTitle}</th>
                    <td>{submission.pathTitle}</td>
                    <td>{submission.scorePercent}%</td>
                    <td>
                      <span
                        className={
                          submission.passed
                            ? "attempt-passed"
                            : "attempt-not-passed"
                        }
                      >
                        {submission.passed ? "Passed" : "Revise"}
                      </span>
                    </td>
                    <td>{submission.artifactRefs.length}</td>
                    <td>
                      {submission.criterionScores.reduce(
                        (total, score) =>
                          total + (score.evidenceRefs?.length ?? 0),
                        0,
                      )}
                    </td>
                    <td>{new Date(submission.submittedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state attempt-empty">
            <h3>No capstone evidence yet.</h3>
            <p>
              Complete a path capstone to add applied evidence, revisions, and
              criterion scores to your portable record and transcript.
            </p>
            <Link
              className="button button-primary"
              href="/learn"
            >
              Choose a learning path
            </Link>
          </div>
        )}
      </section>

      <section
        aria-labelledby="learning-achievements-heading"
        className="badge-section"
      >
        <div className="section-heading">
          <p className="eyebrow">Learning achievements</p>
          <h2 id="learning-achievements-heading">Evidence in your progress record</h2>
        </div>
        <p className="record-authority-note">
          {authoritativeAccountTranscript
            ? "These achievements can be synchronized in your durable account progress, but they are not issued credentials."
            : "These achievements are browser-local and are not issued credentials."}
        </p>
        {progress.badges.length ? (
          <div className="badge-grid">
            {progress.badges.map((badge) => (
              <article key={badge.id}>
                <div className="badge-medallion">42</div>
                <h3>{badge.name}</h3>
                <p>{badge.description}</p>
                <small>
                  Earned {new Date(badge.earnedAt).toLocaleDateString()} · Not an
                  issued credential
                </small>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Your first badge is waiting.</h3>
            <p>
              Complete every required check and capstone in a path to earn its
              mastery badge.
            </p>
            <Link className="button button-primary" href="/learn/ai-foundations">
              Start AI Foundations
            </Link>
          </div>
        )}
      </section>

      <section
        aria-labelledby="durable-credentials-heading"
        className="badge-section"
      >
        <div className="section-heading">
          <p className="eyebrow">Credentials</p>
          <h2 id="durable-credentials-heading">Durable issued credentials</h2>
        </div>
        <div className="empty-state">
          <h3>No durable credentials have been issued.</h3>
          <p>
            A durable credential requires server-side issuance against versioned
            evidence and an append-only lifecycle. Browser-local achievements never
            appear here as verified credentials.
          </p>
        </div>
      </section>

      {progress.attempts.length || (progress.capstoneSubmissions?.length ?? 0) > 0 ? (
        <details className="reset-panel">
          <summary>Manage local learning data</summary>
          <p>Resetting removes progress, scores, and badges from this browser.</p>
          <button
            className="button button-danger"
            onClick={() => {
              if (window.confirm("Reset all Project 42 progress on this device?")) reset();
            }}
            type="button"
          >
            Reset local record
          </button>
        </details>
      ) : null}
    </div>
  );
}

function migrationDispositionLabel(
  disposition: ProgressMigrationDisposition,
): string {
  switch (disposition) {
    case "will-add":
      return "Will add";
    case "already-in-account":
      return "Already in account";
    case "will-merge":
      return "Will merge evidence";
    case "conflict":
      return "Conflict — import blocked";
  }
}

function downloadTextFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
