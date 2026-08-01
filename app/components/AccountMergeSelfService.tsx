"use client";

import type {
  AccountMergePreview,
  AccountMergeProof,
  AccountMergeReceipt,
  AccountMergeResolutionChoice,
} from "@project42/platform";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";

interface ProofState {
  token: string;
  userId: string | null;
  expiresAt: string | null;
}

type KeepChoice = "this" | "other";

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

const emptyProof = (): ProofState => ({ token: "", userId: null, expiresAt: null });

function conflictValue(
  value: string | boolean | null | undefined,
  fallback: string,
): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

async function readApi<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    const error = new Error(body.error?.message ?? fallback);
    error.name = body.error?.code ?? "account_merge_error";
    throw error;
  }
  return body;
}

function CopyableValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="account-merge-copyable">
      <label>{label}</label>
      <div className="account-merge-copyable-row">
        <code>{value}</code>
        <button
          className="button button-secondary"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2_000);
            });
          }}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function AccountMergeSelfService() {
  const { account, apiFetch } = useAuth();
  const [ownProof, setOwnProof] = useState<ProofState>(emptyProof());
  const [otherAccountId, setOtherAccountId] = useState("");
  const [otherProofToken, setOtherProofToken] = useState("");
  const [keep, setKeep] = useState<KeepChoice | null>(null);
  const [preview, setPreview] = useState<AccountMergePreview | null>(null);
  const [resolutions, setResolutions] = useState<
    Record<string, AccountMergeResolutionChoice>
  >({});
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [receipt, setReceipt] = useState<AccountMergeReceipt | null>(null);
  const [rollbackConfirmation, setRollbackConfirmation] = useState("");
  const [rollbackReason, setRollbackReason] = useState("");
  const [message, setMessage] = useState(
    "Merging combines two of your accounts into one. Both sides must prove ownership before anything changes.",
  );
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const statusMessage = useRef<HTMLParagraphElement>(null);
  const receiptHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!preview || receipt) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [preview, receipt]);

  useEffect(() => {
    if (receipt) receiptHeading.current?.focus();
    else if (preview) previewHeading.current?.focus();
  }, [preview, receipt]);

  const announced = useRef(message);
  useEffect(() => {
    if (message === announced.current) return;
    announced.current = message;
    // Once a preview or receipt exists, the heading-focus effect above owns
    // focus for this state change; stealing it back here would undo that
    // effect on every message update that accompanies a preview/receipt
    // transition (both effects fire in the same commit). The status
    // paragraph is still aria-live, so it is announced either way.
    if (message && !preview && !receipt) statusMessage.current?.focus();
  }, [message, preview, receipt]);

  if (!account) return null;
  const accountId = account.id;

  const previewExpired = preview ? clock >= Date.parse(preview.expiresAt) : false;
  const sourceUserId = keep === "this" ? otherAccountId.trim() : accountId;
  const survivorUserId = keep === "this" ? accountId : otherAccountId.trim();
  const requiredConfirmation =
    sourceUserId && survivorUserId
      ? `MERGE ${sourceUserId} INTO ${survivorUserId}`
      : "";

  function resetReview(nextMessage: string) {
    setOwnProof(emptyProof());
    setOtherAccountId("");
    setOtherProofToken("");
    setKeep(null);
    setPreview(null);
    setResolutions({});
    setIdempotencyKey("");
    setConfirmation("");
    setReceipt(null);
    setRollbackConfirmation("");
    setRollbackReason("");
    setMessage(nextMessage);
  }

  async function mintOwnProof() {
    setBusy(true);
    try {
      const body = await readApi<{ proof: AccountMergeProof }>(
        await apiFetch("/v1/me/account-merge-proof", { method: "POST" }),
        "A recent-authentication proof could not be created.",
      );
      setOwnProof({
        token: body.proof.token,
        userId: body.proof.userId,
        expiresAt: body.proof.expiresAt,
      });
      setMessage(
        "Your proof is ready. Sign in to the other account in a separate browser tab or window, open its Account page, and get its proof too. Then come back here and paste both.",
      );
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "A recent-authentication proof could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownProof.token) {
      setMessage("Get your own proof before previewing a merge.");
      return;
    }
    if (!otherAccountId.trim() || !otherProofToken.trim()) {
      setMessage("Paste the other account's ID and proof.");
      return;
    }
    if (!keep) {
      setMessage("Choose which account should survive the merge.");
      return;
    }
    if (otherAccountId.trim() === accountId) {
      setMessage("The other account must be different from this one.");
      return;
    }
    const sourceProofToken = keep === "this" ? otherProofToken.trim() : ownProof.token;
    const survivorProofToken = keep === "this" ? ownProof.token : otherProofToken.trim();
    const key = crypto.randomUUID();
    setBusy(true);
    try {
      const body = await readApi<{ merge: AccountMergePreview }>(
        await apiFetch("/v1/me/account-merges/preview", {
          method: "POST",
          body: JSON.stringify({
            sourceUserId,
            survivorUserId,
            sourceProofToken,
            survivorProofToken,
            idempotencyKey: key,
          }),
        }),
        "The account merge preview could not be created.",
      );
      setIdempotencyKey(key);
      setPreview(body.merge);
      setResolutions({});
      setConfirmation("");
      setReceipt(null);
      setClock(Date.now());
      setMessage(
        "Review every conflict and consequence before confirming. Nothing has changed yet.",
      );
    } catch (caught) {
      const replayOrExpiry =
        caught instanceof Error &&
        [
          "account_merge_proof_unavailable",
          "account_merge_proof_expired",
          "invalid_account_merge_proof",
        ].includes(caught.name);
      setMessage(
        caught instanceof Error
          ? `${caught.message}${replayOrExpiry ? " Get a fresh proof from both accounts and try again." : ""}`
          : "The account merge preview could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function completeMerge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) return;
    if (previewExpired) {
      setMessage("This review expired. Cancel it and start again.");
      return;
    }
    setBusy(true);
    try {
      const body = await readApi<{ receipt: AccountMergeReceipt }>(
        await apiFetch(
          `/v1/me/account-merges/${encodeURIComponent(preview.id)}/complete`,
          {
            method: "POST",
            body: JSON.stringify({ confirmation, idempotencyKey, resolutions }),
          },
        ),
        "The account merge could not be completed.",
      );
      setReceipt(body.receipt);
      setMessage(
        "The other account now resolves to this learner record. The recovery receipt is immutable. Reload this page to see the change reflected everywhere.",
      );
      // Deliberately not calling refreshAccount() here: it flips the shared
      // auth status to "loading", which unmounts this whole dashboard tree
      // (see AccountDashboard's status === "loading" branch) and would wipe
      // the receipt right when the learner needs to see it. A full reload
      // picks up the new account state instead.
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "The account merge could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function rollbackMerge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview || !receipt) return;
    setBusy(true);
    try {
      const body = await readApi<{ receipt: AccountMergeReceipt }>(
        await apiFetch(
          `/v1/me/account-merges/${encodeURIComponent(preview.id)}/rollback`,
          {
            method: "POST",
            body: JSON.stringify({
              confirmation: rollbackConfirmation,
              reason: rollbackReason,
            }),
          },
        ),
        "The merge could not be rolled back.",
      );
      setReceipt(body.receipt);
      setMessage(
        "Both accounts were restored from the recovery snapshot. Reload this page to see the change reflected everywhere.",
      );
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "The merge could not be rolled back.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="profile-card account-merge-console"
      aria-labelledby="account-merge-self-service-title"
    >
      <p className="eyebrow">Duplicate accounts</p>
      <h3 id="account-merge-self-service-title">Merge two of your accounts</h3>
      <p>
        You prove ownership of both accounts yourself by getting a one-time proof
        from each. No one else, including the account owner, is involved in a
        normal merge.
      </p>
      <p
        className="admin-status"
        ref={statusMessage}
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        {message}
      </p>

      {!preview ? (
        <>
          {!ownProof.token ? (
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => void mintOwnProof()}
              type="button"
            >
              Get this account&apos;s proof
            </button>
          ) : (
            <div className="account-merge-account-grid">
              <fieldset>
                <legend>This account&apos;s proof</legend>
                <CopyableValue label="Account ID" value={accountId} />
                <CopyableValue label="Proof" value={ownProof.token} />
                {ownProof.expiresAt ? (
                  <p className="account-merge-proof-status">
                    Expires {new Date(ownProof.expiresAt).toLocaleTimeString()}
                  </p>
                ) : null}
              </fieldset>
              <fieldset>
                <legend>The other account&apos;s proof</legend>
                <p>
                  Sign in to the other account in a private/incognito window,
                  open its Account page, get its proof, and paste both values
                  here.
                </p>
                <label htmlFor="merge-other-account-id">
                  Other account&apos;s ID
                </label>
                <input
                  autoComplete="off"
                  disabled={busy}
                  id="merge-other-account-id"
                  onChange={(event) => setOtherAccountId(event.target.value)}
                  value={otherAccountId}
                />
                <label htmlFor="merge-other-proof">Other account&apos;s proof</label>
                <input
                  autoComplete="off"
                  disabled={busy}
                  id="merge-other-proof"
                  onChange={(event) => setOtherProofToken(event.target.value)}
                  type="password"
                  value={otherProofToken}
                />
              </fieldset>
            </div>
          )}

          {ownProof.token ? (
            <form onSubmit={createPreview}>
              <fieldset>
                <legend>Which account should survive?</legend>
                <label>
                  <input
                    checked={keep === "this"}
                    disabled={busy}
                    name="merge-keep"
                    onChange={() => setKeep("this")}
                    type="radio"
                    value="this"
                  />
                  Keep this account; the other account merges into it
                </label>
                <label>
                  <input
                    checked={keep === "other"}
                    disabled={busy}
                    name="merge-keep"
                    onChange={() => setKeep("other")}
                    type="radio"
                    value="other"
                  />
                  Keep the other account; this account merges into it
                </label>
              </fieldset>
              <div className="button-row">
                <button className="button button-primary" disabled={busy} type="submit">
                  Preview merge consequences
                </button>
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() =>
                    resetReview(
                      "Merging combines two of your accounts into one. Both sides must prove ownership before anything changes.",
                    )
                  }
                  type="button"
                >
                  Start over
                </button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}

      {preview ? (
        <div className="account-merge-review">
          <h4 ref={previewHeading} tabIndex={-1}>
            Merge review
          </h4>
          <dl className="account-merge-evidence">
            <div>
              <dt>Review expires</dt>
              <dd>{new Date(preview.expiresAt).toLocaleString()}</dd>
            </div>
          </dl>
          {previewExpired ? (
            <p className="account-merge-warning" role="alert">
              This review has expired. No merge occurred. Start over and get
              fresh proofs.
            </p>
          ) : null}

          <h5>Records affected</h5>
          <div className="account-merge-records">
            {Object.entries(preview.recordCounts).map(([name, counts]) => (
              <span key={name}>
                {name.replaceAll("_", " ")}: {counts.source} from this side +{" "}
                {counts.survivor} from the other side
              </span>
            ))}
          </div>

          <form onSubmit={completeMerge}>
            <fieldset>
              <legend>Resolve every conflict</legend>
              {preview.conflicts.length === 0 ? (
                <p>No conflicting profile values were found.</p>
              ) : (
                preview.conflicts.map((conflict) => (
                  <fieldset className="account-merge-conflict" key={conflict.key}>
                    <legend>{conflict.description}</legend>
                    <label>
                      <input
                        checked={resolutions[conflict.key] === "source"}
                        disabled={busy || previewExpired}
                        name={`resolution-${conflict.key}`}
                        onChange={() =>
                          setResolutions((current) => ({
                            ...current,
                            [conflict.key]: "source",
                          }))
                        }
                        type="radio"
                        value="source"
                      />
                      Keep:{" "}
                      <strong>
                        {conflictValue(conflict.sourceValue, "Source value")}
                      </strong>
                    </label>
                    <label>
                      <input
                        checked={resolutions[conflict.key] === "survivor"}
                        disabled={busy || previewExpired}
                        name={`resolution-${conflict.key}`}
                        onChange={() =>
                          setResolutions((current) => ({
                            ...current,
                            [conflict.key]: "survivor",
                          }))
                        }
                        type="radio"
                        value="survivor"
                      />
                      Keep:{" "}
                      <strong>
                        {conflictValue(conflict.survivorValue, "Survivor value")}
                      </strong>
                    </label>
                  </fieldset>
                ))
              )}
            </fieldset>
            <div className="account-merge-consequences">
              <strong>Consequences</strong>
              <ul>
                <li>The retired sign-in will resolve to the surviving account.</li>
                <li>
                  Progress, attempts, transcript entries, badges, consent, and
                  linked identities are reconciled without discarding records.
                </li>
                <li>
                  Rollback is refused after new profile, learning, or identity
                  activity to prevent overwriting later work.
                </li>
              </ul>
            </div>
            <label htmlFor="merge-confirmation">Type the confirmation below</label>
            <CopyableValue label="Confirmation to type" value={requiredConfirmation} />
            <input
              autoComplete="off"
              disabled={busy || previewExpired || Boolean(receipt)}
              id="merge-confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              value={confirmation}
            />
            <div className="button-row">
              <button
                className="button button-primary"
                disabled={
                  busy ||
                  previewExpired ||
                  Boolean(receipt) ||
                  confirmation !== requiredConfirmation ||
                  preview.conflicts.some((conflict) => !resolutions[conflict.key])
                }
                type="submit"
              >
                Merge accounts
              </button>
              {!receipt ? (
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() =>
                    resetReview(
                      "Merge review cancelled. No accounts changed; unused proofs will expire automatically.",
                    )
                  }
                  type="button"
                >
                  Cancel review
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {receipt ? (
        <div className="account-merge-receipt">
          <h4 ref={receiptHeading} tabIndex={-1}>
            {receipt.status === "rolled-back"
              ? "Recovery completed"
              : "Immutable merge receipt"}
          </h4>
          <dl>
            <div>
              <dt>Receipt</dt>
              <dd>{receipt.id}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{receipt.status}</dd>
            </div>
          </dl>
          {receipt.status === "completed" && preview ? (
            <details className="account-recovery-details">
              <summary>Roll back this merge</summary>
              <p>
                Rollback succeeds only while neither account has new profile,
                learning, or identity activity since the merge.
              </p>
              <form onSubmit={rollbackMerge}>
                <label htmlFor="merge-rollback-confirmation">
                  Type the confirmation below
                </label>
                <CopyableValue
                  label="Confirmation to type"
                  value={`ROLL BACK ${preview.id}`}
                />
                <input
                  autoComplete="off"
                  id="merge-rollback-confirmation"
                  onChange={(event) => setRollbackConfirmation(event.target.value)}
                  value={rollbackConfirmation}
                />
                <label htmlFor="merge-rollback-reason">Rollback reason</label>
                <textarea
                  id="merge-rollback-reason"
                  minLength={10}
                  onChange={(event) => setRollbackReason(event.target.value)}
                  rows={3}
                  value={rollbackReason}
                />
                <button
                  className="button button-secondary"
                  disabled={
                    busy ||
                    rollbackConfirmation !== `ROLL BACK ${preview.id}` ||
                    rollbackReason.trim().length < 10
                  }
                  type="submit"
                >
                  Restore both accounts
                </button>
              </form>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
