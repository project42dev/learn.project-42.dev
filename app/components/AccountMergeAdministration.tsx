"use client";

import type {
  AccountMergePreview,
  AccountMergeProof,
  AccountMergeReceipt,
  AccountMergeResolutionChoice,
} from "@project42/platform";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useAuth, type Project42Account } from "./AuthProvider";

type MergeSide = "source" | "survivor";
type RecoveryMethod =
  | "identity-provider-recovery"
  | "support-video-verification"
  | "signed-owner-attestation"
  | "legacy-account-evidence";

interface RecoveryForm {
  methods: RecoveryMethod[];
  referenceId: string;
  summary: string;
}

interface ProofState {
  token: string;
  method: AccountMergeProof["method"] | null;
  expiresAt: string | null;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

const recoveryMethods: Array<{ value: RecoveryMethod; label: string }> = [
  {
    value: "identity-provider-recovery",
    label: "Identity-provider recovery completed",
  },
  {
    value: "support-video-verification",
    label: "Live support video verification completed",
  },
  {
    value: "signed-owner-attestation",
    label: "Signed owner attestation recorded",
  },
  {
    value: "legacy-account-evidence",
    label: "Independent legacy-account evidence reviewed",
  },
];

const emptyRecoveryForm = (): RecoveryForm => ({
  methods: [],
  referenceId: "",
  summary: "",
});

const emptyProof = (): ProofState => ({
  token: "",
  method: null,
  expiresAt: null,
});

function accountLabel(account: Project42Account): string {
  return (
    account.displayName ??
    account.primaryEmail ??
    `Account ${account.id.slice(0, 8)}`
  );
}

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

export function AccountMergeAdministration({
  accounts,
  onAccountsChanged,
}: {
  accounts: Project42Account[];
  onAccountsChanged: () => Promise<void>;
}) {
  const { account, apiFetch } = useAuth();
  const eligibleAccounts = useMemo(
    () => accounts.filter((candidate) => candidate.state !== "revoked"),
    [accounts],
  );
  const [sourceUserId, setSourceUserId] = useState("");
  const [survivorUserId, setSurvivorUserId] = useState("");
  const [proofs, setProofs] = useState<Record<MergeSide, ProofState>>({
    source: emptyProof(),
    survivor: emptyProof(),
  });
  const [recovery, setRecovery] = useState<Record<MergeSide, RecoveryForm>>({
    source: emptyRecoveryForm(),
    survivor: emptyRecoveryForm(),
  });
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
    "Select the duplicate account and the learner record that must survive.",
  );
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const previewHeading = useRef<HTMLHeadingElement>(null);
  // The status line sits at the top of a very long section while the actions
  // are hundreds of pixels below it. Without moving focus, a failed merge
  // looks like the button did nothing at all.
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

  // The status line sits at the top of a very long section while the actions
  // are hundreds of pixels below it, so a failed merge previously looked like
  // the button had done nothing at all. Bring the reason to the operator.
  const announced = useRef(message);
  useEffect(() => {
    if (message === announced.current) return;
    announced.current = message;
    if (message) statusMessage.current?.focus();
  }, [message]);

  const source = eligibleAccounts.find(
    (candidate) => candidate.id === sourceUserId,
  );
  const survivor = eligibleAccounts.find(
    (candidate) => candidate.id === survivorUserId,
  );
  const previewExpired = preview
    ? clock >= Date.parse(preview.expiresAt)
    : false;
  const requiredConfirmation =
    source && survivor ? `MERGE ${source.id} INTO ${survivor.id}` : "";

  function resetReview(nextMessage: string) {
    setProofs({ source: emptyProof(), survivor: emptyProof() });
    setRecovery({
      source: emptyRecoveryForm(),
      survivor: emptyRecoveryForm(),
    });
    setPreview(null);
    setResolutions({});
    setIdempotencyKey("");
    setConfirmation("");
    setReceipt(null);
    setRollbackConfirmation("");
    setRollbackReason("");
    setMessage(nextMessage);
  }

  function selectAccount(side: MergeSide, userId: string) {
    if (side === "source") setSourceUserId(userId);
    else setSurvivorUserId(userId);
    resetReview(
      "Account selection changed. Collect fresh proof for both accounts before previewing.",
    );
  }

  function updateRecovery(
    side: MergeSide,
    update: (current: RecoveryForm) => RecoveryForm,
  ) {
    setRecovery((current) => ({
      ...current,
      [side]: update(current[side]),
    }));
  }

  function setProofToken(side: MergeSide, token: string) {
    setProofs((current) => ({
      ...current,
      [side]: {
        token,
        method: token ? "recent-authentication" : null,
        expiresAt: null,
      },
    }));
  }

  async function createRecentSignInProof(side: MergeSide) {
    const selectedId = side === "source" ? sourceUserId : survivorUserId;
    if (!account || selectedId !== account.id) {
      setMessage("Select your own signed-in account before creating this proof.");
      return;
    }
    setBusy(true);
    try {
      const body = await readApi<{ proof: AccountMergeProof }>(
        await apiFetch("/v1/me/account-merge-proof", { method: "POST" }),
        "A recent-authentication proof could not be created.",
      );
      setProofs((current) => ({
        ...current,
        [side]: {
          token: body.proof.token,
          method: body.proof.method,
          expiresAt: body.proof.expiresAt,
        },
      }));
      setMessage(
        `A one-time proof for the ${side} account is held only in this tab.`,
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

  async function createRecoveryProof(side: MergeSide) {
    const userId = side === "source" ? sourceUserId : survivorUserId;
    const form = recovery[side];
    if (!userId) {
      setMessage(`Select the ${side} account first.`);
      return;
    }
    setBusy(true);
    try {
      const body = await readApi<{ proof: AccountMergeProof }>(
        await apiFetch("/v1/admin/account-merges/recovery-proofs", {
          method: "POST",
          body: JSON.stringify({
            userId,
            methods: form.methods,
            referenceId: form.referenceId,
            summary: form.summary,
          }),
        }),
        "The owner-assisted recovery proof could not be created.",
      );
      setProofs((current) => ({
        ...current,
        [side]: {
          token: body.proof.token,
          method: body.proof.method,
          expiresAt: body.proof.expiresAt,
        },
      }));
      setMessage(
        `Governed recovery evidence for the ${side} account is ready and expires at ${new Date(
          body.proof.expiresAt,
        ).toLocaleTimeString()}.`,
      );
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "The owner-assisted recovery proof could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source || !survivor) {
      setMessage("Select both accounts before previewing a merge.");
      return;
    }
    if (source.id === survivor.id) {
      setMessage("The duplicate and survivor must be different accounts.");
      return;
    }
    if (!proofs.source.token || !proofs.survivor.token) {
      setMessage("Collect a separate one-time proof for each account.");
      return;
    }
    const key = crypto.randomUUID();
    setBusy(true);
    try {
      const body = await readApi<{ merge: AccountMergePreview }>(
        await apiFetch("/v1/admin/account-merges/preview", {
          method: "POST",
          body: JSON.stringify({
            sourceUserId: source.id,
            survivorUserId: survivor.id,
            sourceProofToken: proofs.source.token,
            survivorProofToken: proofs.survivor.token,
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
        "Review every conflict, consequence, evidence method, and recovery condition before confirming.",
      );
    } catch (caught) {
      const replayOrExpiry =
        caught instanceof Error &&
        [
          "account_merge_proof_unavailable",
          "account_merge_proof_expired",
          "invalid_account_merge_proof",
        ].includes(caught.name);
      if (replayOrExpiry) {
        setProofs({ source: emptyProof(), survivor: emptyProof() });
      }
      setMessage(
        caught instanceof Error
          ? `${caught.message}${replayOrExpiry ? " Collect fresh proof for both accounts." : ""}`
          : "The account merge preview could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function completeMerge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview || !source || !survivor) return;
    if (previewExpired) {
      setMessage("This preview expired. Cancel it and collect fresh proof.");
      return;
    }
    setBusy(true);
    try {
      const body = await readApi<{ receipt: AccountMergeReceipt }>(
        await apiFetch(
          `/v1/admin/account-merges/${encodeURIComponent(preview.id)}/complete`,
          {
            method: "POST",
            body: JSON.stringify({
              confirmation,
              idempotencyKey,
              resolutions,
            }),
          },
        ),
        "The account merge could not be completed.",
      );
      setReceipt(body.receipt);
      setProofs({ source: emptyProof(), survivor: emptyProof() });
      setMessage(
        "The duplicate account now resolves to the survivor. The recovery receipt is immutable.",
      );
      await onAccountsChanged();
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
          `/v1/admin/account-merges/${encodeURIComponent(preview.id)}/rollback`,
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
        "The recovery snapshot restored both accounts. Personal snapshot rows were purged.",
      );
      await onAccountsChanged();
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
      aria-labelledby="account-merge-title"
    >
      <p className="eyebrow">Duplicate-account recovery</p>
      <h3 id="account-merge-title">Review and merge learner records</h3>
      <p>
        A merge never starts from matching email alone. Prove control of each
        account, choose the durable survivor, review every conflict, and preserve
        the recovery receipt.
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

      <form className="account-merge-form" onSubmit={createPreview}>
        <div className="account-merge-account-grid">
          {(["source", "survivor"] as const).map((side) => {
            const selectedId =
              side === "source" ? sourceUserId : survivorUserId;
            const selected = eligibleAccounts.find(
              (candidate) => candidate.id === selectedId,
            );
            const form = recovery[side];
            return (
              <fieldset key={side}>
                <legend>
                  {side === "source"
                    ? "Duplicate account to retire"
                    : "Learner record to keep"}
                </legend>
                <label htmlFor={`merge-${side}-account`}>Account</label>
                <select
                  id={`merge-${side}-account`}
                  disabled={busy || Boolean(preview)}
                  onChange={(event) => selectAccount(side, event.target.value)}
                  required
                  value={selectedId}
                >
                  <option value="">Select an account</option>
                  {eligibleAccounts.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {accountLabel(candidate)}
                      {candidate.primaryEmail
                        ? ` — ${candidate.primaryEmail}`
                        : ""}
                    </option>
                  ))}
                </select>
                {selected ? (
                  <small>
                    {selected.state} · roles {selected.roles.join(", ")} ·
                    updated{" "}
                    {new Date(selected.updatedAt).toLocaleDateString()}
                  </small>
                ) : null}

                <label htmlFor={`merge-${side}-proof`}>
                  One-time proof from the account holder
                </label>
                <input
                  autoComplete="off"
                  disabled={busy || Boolean(preview)}
                  id={`merge-${side}-proof`}
                  onChange={(event) => setProofToken(side, event.target.value)}
                  placeholder="Paste a recent-authentication proof"
                  type="password"
                  value={proofs[side].token}
                />
                {account?.id === selectedId ? (
                  <button
                    className="button button-secondary"
                    disabled={busy || Boolean(preview)}
                    onClick={() => void createRecentSignInProof(side)}
                    type="button"
                  >
                    Use my recent sign-in
                  </button>
                ) : null}

                <details className="account-recovery-details">
                  <summary>Create owner-assisted recovery proof</summary>
                  <p>
                    Record at least two independent, non-email recovery methods.
                    The reference and summary belong in the audit trail.
                  </p>
                  <div className="recovery-method-list">
                    {recoveryMethods.map((method) => (
                      <label key={method.value}>
                        <input
                          checked={form.methods.includes(method.value)}
                          disabled={busy || Boolean(preview)}
                          onChange={(event) =>
                            updateRecovery(side, (current) => ({
                              ...current,
                              methods: event.target.checked
                                ? [...current.methods, method.value]
                                : current.methods.filter(
                                    (candidate) =>
                                      candidate !== method.value,
                                  ),
                            }))
                          }
                          type="checkbox"
                        />
                        {method.label}
                      </label>
                    ))}
                  </div>
                  <label htmlFor={`merge-${side}-reference`}>
                    Recovery reference
                  </label>
                  <input
                    disabled={busy || Boolean(preview)}
                    id={`merge-${side}-reference`}
                    minLength={8}
                    onChange={(event) =>
                      updateRecovery(side, (current) => ({
                        ...current,
                        referenceId: event.target.value,
                      }))
                    }
                    value={form.referenceId}
                  />
                  <label htmlFor={`merge-${side}-summary`}>
                    Evidence summary
                  </label>
                  <textarea
                    disabled={busy || Boolean(preview)}
                    id={`merge-${side}-summary`}
                    minLength={20}
                    onChange={(event) =>
                      updateRecovery(side, (current) => ({
                        ...current,
                        summary: event.target.value,
                      }))
                    }
                    rows={3}
                    value={form.summary}
                  />
                  <button
                    className="button button-secondary"
                    disabled={
                      busy ||
                      Boolean(preview) ||
                      form.methods.length < 2 ||
                      form.referenceId.trim().length < 8 ||
                      form.summary.trim().length < 20
                    }
                    onClick={() => void createRecoveryProof(side)}
                    type="button"
                  >
                    Record governed recovery proof
                  </button>
                </details>
                {proofs[side].method ? (
                  <p className="account-merge-proof-status">
                    Evidence ready:{" "}
                    {proofs[side].method === "recent-authentication"
                      ? "recent account authentication"
                      : "owner-assisted recovery"}
                    {proofs[side].expiresAt
                      ? ` · expires ${new Date(
                          proofs[side].expiresAt,
                        ).toLocaleTimeString()}`
                      : ""}
                  </p>
                ) : null}
              </fieldset>
            );
          })}
        </div>
        {!preview ? (
          <button className="button button-primary" disabled={busy} type="submit">
            Preview merge consequences
          </button>
        ) : null}
      </form>

      {preview ? (
        <div className="account-merge-review">
          <h4 ref={previewHeading} tabIndex={-1}>
            Merge review
          </h4>
          <dl className="account-merge-evidence">
            <div>
              <dt>Duplicate account proof</dt>
              <dd>{preview.proofMethods.source}</dd>
            </div>
            <div>
              <dt>Survivor account proof</dt>
              <dd>{preview.proofMethods.survivor}</dd>
            </div>
            <div>
              <dt>Recovery snapshot</dt>
              <dd>Created atomically before any records move</dd>
            </div>
            <div>
              <dt>Review expires</dt>
              <dd>{new Date(preview.expiresAt).toLocaleString()}</dd>
            </div>
          </dl>
          {previewExpired ? (
            <p className="account-merge-warning" role="alert">
              This review has expired. No merge occurred. Cancel it and collect
              fresh proof.
            </p>
          ) : null}

          <h5>Records affected</h5>
          <div className="account-merge-records">
            {Object.entries(preview.recordCounts).map(([name, counts]) => (
              <span key={name}>
                {name.replaceAll("_", " ")}: {counts.source} duplicate +{" "}
                {counts.survivor} survivor
              </span>
            ))}
          </div>

          <form onSubmit={completeMerge}>
            <fieldset>
              <legend>Resolve every conflict</legend>
              {preview.conflicts.length === 0 ? (
                <p>No conflicting profile or owner-role values were found.</p>
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
                      Keep from duplicate:{" "}
                      <strong>
                        {conflictValue(
                          conflict.sourceValue,
                          preview.sourceDisplayName ?? "Source value",
                        )}
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
                      Keep from survivor:{" "}
                      <strong>
                        {conflictValue(
                          conflict.survivorValue,
                          preview.survivorDisplayName ?? "Survivor value",
                        )}
                      </strong>
                    </label>
                  </fieldset>
                ))
              )}
            </fieldset>
            <div className="account-merge-consequences">
              <strong>Consequences</strong>
              <ul>
                <li>
                  The duplicate sign-in will resolve to the survivor learner
                  record.
                </li>
                <li>
                  Progress, attempts, transcript entries, badges, consent, and
                  linked identities are reconciled without discarding records.
                </li>
                <li>
                  Rollback is refused after new profile, learning, role, or
                  identity activity to prevent overwriting later work.
                </li>
              </ul>
            </div>
            <label htmlFor="merge-confirmation">
              Type <code>{requiredConfirmation}</code>
            </label>
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
                  preview.conflicts.some(
                    (conflict) => !resolutions[conflict.key],
                  )
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
              <dt>Receipt digest</dt>
              <dd>
                <code>{receipt.receiptDigest}</code>
              </dd>
            </div>
            <div>
              <dt>Recovery snapshot digest</dt>
              <dd>
                <code>{receipt.snapshotDigest}</code>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{receipt.status}</dd>
            </div>
          </dl>
          {receipt.status === "completed" && preview ? (
            <details className="account-recovery-details">
              <summary>Roll back from the protected recovery snapshot</summary>
              <p>
                Rollback succeeds only while neither restored account has new
                governed activity.
              </p>
              <form onSubmit={rollbackMerge}>
                <label htmlFor="merge-rollback-confirmation">
                  Type <code>ROLL BACK {preview.id}</code>
                </label>
                <input
                  autoComplete="off"
                  id="merge-rollback-confirmation"
                  onChange={(event) =>
                    setRollbackConfirmation(event.target.value)
                  }
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
