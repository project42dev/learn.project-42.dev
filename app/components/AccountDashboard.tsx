"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { learnerDataPolicy } from "../lib/learnerDataPolicy";
import {
  useAuth,
  type AccountState,
  type Project42Account,
} from "./AuthProvider";

interface DomainRule {
  id: string;
  domain: string;
  enabled: boolean;
  policyVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface ConsentRecord {
  id: string;
  purpose: string;
  policyVersion: string;
  decision: "granted" | "withdrawn";
  decidedAt: string;
}

interface DeletionRequest {
  id: string;
  state: "requested" | "cancelled" | "processing" | "completed";
  requestedAt: string;
  cancellationDeadline: string;
  completedAt: string | null;
}

interface OwnerDeletionRequest {
  id: string;
  userId: string;
  state: "requested" | "processing";
  requestedAt: string;
  cancellationDeadline: string;
  displayName: string | null;
  primaryEmail: string | null;
}

const nextStates: Record<AccountState, AccountState[]> = {
  pending: ["approved", "rejected", "revoked"],
  approved: ["suspended", "revoked"],
  rejected: ["approved", "revoked"],
  suspended: ["approved", "revoked"],
  revoked: [],
};

export function AccountDashboard() {
  const {
    configured,
    status,
    account,
    error,
    signIn,
    signOut,
    refreshAccount,
  } = useAuth();

  if (!configured) {
    return (
      <section className="profile-card account-card">
        <p className="eyebrow">Account service</p>
        <h2>Ready for hosted identity configuration</h2>
        <p>
          Account code is installed, but this deployment has not yet been connected
          to its OIDC tenant and API. Browser-local learning remains available.
        </p>
      </section>
    );
  }

  if (status === "loading" || status === "signing-in") {
    return <div className="profile-loading">Loading your Project 42 account…</div>;
  }

  if (status === "signed-out") {
    return (
      <section className="profile-card account-card">
        <p className="eyebrow">Project 42 account</p>
        <h2>Keep your progress across devices</h2>
        <p>
          Sign in through the configured identity provider. New accounts remain
          pending until an owner approves them or a verified email matches an exact
          approved-domain rule.
        </p>
        <button className="button button-primary" onClick={() => void signIn()} type="button">
          Sign in or request access
        </button>
      </section>
    );
  }

  if (status === "error" || !account) {
    return (
      <section className="profile-card account-card" role="alert">
        <p className="eyebrow">Account service</p>
        <h2>Account sign-in needs attention</h2>
        <p>{error ?? "The account could not be loaded."}</p>
        <div className="button-row">
          <button
            className="button button-primary"
            onClick={() => void refreshAccount()}
            type="button"
          >
            Try again
          </button>
          <button className="button button-secondary" onClick={signOut} type="button">
            Clear this sign-in
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="account-dashboard">
      <section className="profile-card account-card">
        <p className="eyebrow">Project 42 account</p>
        <div className="account-heading">
          <div>
            <h2>{account.displayName ?? "Project 42 learner"}</h2>
            <p>{account.primaryEmail ?? "No verified email supplied"}</p>
          </div>
          <span className={`account-state account-state-${account.state}`}>
            {account.state}
          </span>
        </div>
        {account.state === "pending" ? (
          <p>
            Your request is waiting for owner approval. Learning still works in this
            browser, but server progress is unavailable until approval.
          </p>
        ) : null}
        {account.state === "rejected" ? (
          <p>
            This registration request was rejected. Browser-local learning remains
            available, and an owner can reconsider the request without using permanent
            revocation.
          </p>
        ) : null}
        {account.state === "suspended" ? (
          <p>
            This account is suspended. Server progress is preserved but cannot be
            read or changed until an owner restores access.
          </p>
        ) : null}
        {account.state === "revoked" ? (
          <p>
            This account is revoked. Revocation is permanent for this identity
            binding; contact the deployment owner if you believe this is an error.
          </p>
        ) : null}
        {account.state === "approved" ? (
          <p>
            Your account is approved. Learn can synchronize progress, scores,
            transcript entries, and badges with the server.
          </p>
        ) : null}
        <button className="button button-secondary" onClick={signOut} type="button">
          Sign out on this browser
        </button>
      </section>
      <LearnerDataControls />
      {account.roles.includes("owner") ? <OwnerAdministration /> : null}
    </div>
  );
}

function LearnerDataControls() {
  const { apiFetch, signIn, signOut } = useAuth();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [deletions, setDeletions] = useState<DeletionRequest[]>([]);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("Loading privacy controls…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [consentResponse, deletionResponse] = await Promise.all([
        apiFetch("/v1/me/consents"),
        apiFetch("/v1/me/deletion"),
      ]);
      const consentBody = (await consentResponse.json()) as {
        consents?: ConsentRecord[];
        error?: { message?: string };
      };
      const deletionBody = (await deletionResponse.json()) as {
        requests?: DeletionRequest[];
        error?: { message?: string };
      };
      if (!consentResponse.ok || !deletionResponse.ok) {
        throw new Error(
          consentBody.error?.message ??
            deletionBody.error?.message ??
            "Privacy controls could not be loaded.",
        );
      }
      setConsents(consentBody.consents ?? []);
      setDeletions(deletionBody.requests ?? []);
      setMessage("Privacy controls are current.");
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Privacy controls could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const latestLearnerRecordConsent = [...consents]
    .reverse()
    .find((record) => record.purpose === "learner-records");
  const activeDeletion = deletions.find((request) =>
    ["requested", "processing"].includes(request.state),
  );

  async function recordConsent(decision: "granted" | "withdrawn") {
    setBusy(true);
    try {
      const response = await apiFetch("/v1/me/consents", {
        method: "POST",
        body: JSON.stringify({
          purpose: "learner-records",
          policyVersion: learnerDataPolicy.policyVersion,
          decision,
        }),
      });
      const body = (await response.json()) as {
        consent?: ConsentRecord;
        error?: { message?: string };
      };
      if (!response.ok || !body.consent) {
        throw new Error(body.error?.message ?? "Consent could not be recorded.");
      }
      setConsents((current) => [...current, body.consent as ConsentRecord]);
      setMessage(
        decision === "granted"
          ? "Learner-record consent recorded."
          : "Learner-record consent withdrawn. You can still export or delete your data.",
      );
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Consent update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setBusy(true);
    try {
      const response = await apiFetch("/v1/me/export");
      const body = (await response.json()) as {
        export?: unknown;
        error?: { code?: string; message?: string };
      };
      if (!response.ok || !body.export) {
        if (body.error?.code === "recent_authentication_required") {
          throw new Error(
            "Sign out and sign in again before exporting this sensitive account data.",
          );
        }
        throw new Error(body.error?.message ?? "Account data could not be exported.");
      }
      const blob = new Blob([JSON.stringify(body.export, null, 2)], {
        type: "application/json",
      });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `project42-learner-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(href);
      setMessage("Account and learner data export downloaded.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Account export failed.");
    } finally {
      setBusy(false);
    }
  }

  async function requestDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await apiFetch("/v1/me/deletion", {
        method: "POST",
        body: JSON.stringify({ confirmation }),
      });
      const body = (await response.json()) as {
        deletionRequest?: DeletionRequest;
        error?: { code?: string; message?: string };
      };
      if (!response.ok || !body.deletionRequest) {
        if (body.error?.code === "recent_authentication_required") {
          throw new Error(
            "Sign out and sign in again before requesting account deletion.",
          );
        }
        throw new Error(body.error?.message ?? "Deletion could not be requested.");
      }
      setDeletions((current) => [body.deletionRequest as DeletionRequest, ...current]);
      setConfirmation("");
      setMessage(
        `Deletion requested. It can be cancelled until ${new Date(
          body.deletionRequest.cancellationDeadline,
        ).toLocaleString()}.`,
      );
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Deletion request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelDeletion() {
    setBusy(true);
    try {
      const response = await apiFetch("/v1/me/deletion", { method: "DELETE" });
      const body = (await response.json()) as {
        deletionRequest?: DeletionRequest;
        error?: { code?: string; message?: string };
      };
      if (!response.ok || !body.deletionRequest) {
        if (body.error?.code === "recent_authentication_required") {
          throw new Error(
            "Sign out and sign in again before cancelling account deletion.",
          );
        }
        throw new Error(body.error?.message ?? "Deletion could not be cancelled.");
      }
      setDeletions((current) =>
        current.map((request) =>
          request.id === body.deletionRequest?.id
            ? (body.deletionRequest as DeletionRequest)
            : request,
        ),
      );
      setMessage("Deletion request cancelled.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Deletion cancellation failed.");
    } finally {
      setBusy(false);
    }
  }

  function reauthenticate() {
    signOut();
    void signIn("/account");
  }

  return (
    <section className="owner-console" aria-labelledby="learner-data-controls-title">
      <div className="section-heading section-heading-inline">
        <div>
          <p className="eyebrow">Privacy and portability</p>
          <h2 id="learner-data-controls-title">Your account and learner data</h2>
        </div>
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={() => void load()}
          type="button"
        >
          Refresh
        </button>
      </div>
      <p className="admin-status" role="status">
        {message}
      </p>
      <div className="admin-grid">
        <section className="profile-card">
          <h3>Consent and export</h3>
          <p>
            Learner-record consent is currently{" "}
            <strong>{latestLearnerRecordConsent?.decision ?? "not recorded"}</strong>.
            Every decision is retained as versioned history.
          </p>
          <div className="button-row">
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => void recordConsent("granted")}
              type="button"
            >
              Grant learner-record consent
            </button>
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => void recordConsent("withdrawn")}
              type="button"
            >
              Withdraw consent
            </button>
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => void exportData()}
              type="button"
            >
              Download my data
            </button>
          </div>
          <p>
            Export and deletion require a sign-in issued within the last 15 minutes.
          </p>
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={reauthenticate}
            type="button"
          >
            Sign in again
          </button>
        </section>

        <section className="profile-card">
          <h3>Delete account and learner data</h3>
          {activeDeletion ? (
            <>
              <p>
                Deletion is {activeDeletion.state}. You can cancel until{" "}
                {new Date(activeDeletion.cancellationDeadline).toLocaleString()}.
              </p>
              <button
                className="button button-secondary"
                disabled={busy || activeDeletion.state !== "requested"}
                onClick={() => void cancelDeletion()}
                type="button"
              >
                Cancel deletion
              </button>
            </>
          ) : (
            <form className="domain-form" onSubmit={(event) => void requestDeletion(event)}>
              <p>
                This removes the account, progress, attempts, transcript, badges, and
                consent history after a seven-day cancellation period. A minimized
                audit tombstone remains.
              </p>
              <label htmlFor="deletion-confirmation">
                Enter DELETE MY PROJECT 42 ACCOUNT
              </label>
              <input
                autoComplete="off"
                id="deletion-confirmation"
                onChange={(event) => setConfirmation(event.target.value)}
                required
                value={confirmation}
              />
              <button
                className="button button-primary"
                disabled={busy || confirmation !== "DELETE MY PROJECT 42 ACCOUNT"}
                type="submit"
              >
                Request deletion
              </button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}

function OwnerAdministration() {
  const { apiFetch } = useAuth();
  const [accounts, setAccounts] = useState<Project42Account[]>([]);
  const [domains, setDomains] = useState<DomainRule[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<OwnerDeletionRequest[]>([]);
  const [loadedAt, setLoadedAt] = useState(0);
  const [message, setMessage] = useState("Loading owner controls…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [accountResponse, domainResponse, deletionResponse] = await Promise.all([
        apiFetch("/v1/admin/accounts"),
        apiFetch("/v1/admin/domains"),
        apiFetch("/v1/admin/deletions"),
      ]);
      const accountBody = (await accountResponse.json()) as {
        accounts?: Project42Account[];
        error?: { message?: string };
      };
      const domainBody = (await domainResponse.json()) as {
        domains?: DomainRule[];
        error?: { message?: string };
      };
      const deletionBody = (await deletionResponse.json()) as {
        requests?: OwnerDeletionRequest[];
        error?: { message?: string };
      };
      if (!accountResponse.ok || !domainResponse.ok || !deletionResponse.ok) {
        throw new Error(
          accountBody.error?.message ??
            domainBody.error?.message ??
            deletionBody.error?.message ??
            "Owner data could not be loaded.",
        );
      }
      setAccounts(accountBody.accounts ?? []);
      setDomains(domainBody.domains ?? []);
      setDeletionRequests(deletionBody.requests ?? []);
      setLoadedAt(Date.now());
      setMessage("Owner data is current.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Owner data could not be loaded.");
    } finally {
      setBusy(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function changeState(target: Project42Account, state: AccountState) {
    const reason = window.prompt(
      `Reason for changing ${target.displayName ?? target.id} from ${target.state} to ${state}:`,
    );
    if (!reason) return;
    setBusy(true);
    try {
      const response = await apiFetch(
        `/v1/admin/accounts/${encodeURIComponent(target.id)}/state`,
        {
          method: "PATCH",
          body: JSON.stringify({ state, reason }),
        },
      );
      const body = (await response.json()) as {
        account?: Project42Account;
        error?: { message?: string };
      };
      if (!response.ok || !body.account) {
        throw new Error(body.error?.message ?? "Account state could not be changed.");
      }
      setAccounts((current) =>
        current.map((candidate) =>
          candidate.id === body.account?.id ? body.account : candidate,
        ),
      );
      setMessage(`Account changed to ${state}.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Account change failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const domain = String(form.get("domain") ?? "");
    const reason = String(form.get("reason") ?? "");
    setBusy(true);
    try {
      const response = await apiFetch("/v1/admin/domains", {
        method: "POST",
        body: JSON.stringify({ domain, reason, enabled: true }),
      });
      const body = (await response.json()) as {
        domain?: DomainRule;
        error?: { message?: string };
      };
      if (!response.ok || !body.domain) {
        throw new Error(body.error?.message ?? "Domain rule could not be created.");
      }
      setDomains((current) =>
        [...current, body.domain as DomainRule].sort((left, right) =>
          left.domain.localeCompare(right.domain),
        ),
      );
      event.currentTarget.reset();
      setMessage(`Exact-domain approval enabled for ${body.domain.domain}.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Domain change failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleDomain(rule: DomainRule) {
    const reason = window.prompt(
      `Reason for ${rule.enabled ? "disabling" : "enabling"} ${rule.domain}:`,
    );
    if (!reason) return;
    setBusy(true);
    try {
      const response = await apiFetch(
        `/v1/admin/domains/${encodeURIComponent(rule.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: !rule.enabled, reason }),
        },
      );
      const body = (await response.json()) as {
        domain?: DomainRule;
        error?: { message?: string };
      };
      if (!response.ok || !body.domain) {
        throw new Error(body.error?.message ?? "Domain rule could not be changed.");
      }
      setDomains((current) =>
        current.map((candidate) =>
          candidate.id === body.domain?.id ? body.domain : candidate,
        ),
      );
      setMessage(`Domain rule ${body.domain.enabled ? "enabled" : "disabled"}.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Domain change failed.");
    } finally {
      setBusy(false);
    }
  }

  async function completeDeletion(request: OwnerDeletionRequest) {
    const reason = window.prompt(
      `Reason for permanently deleting ${request.displayName ?? request.primaryEmail ?? request.userId}:`,
    );
    if (!reason) return;
    setBusy(true);
    try {
      const response = await apiFetch(
        `/v1/admin/deletions/${encodeURIComponent(request.id)}/complete`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        },
      );
      const body = (await response.json()) as {
        completion?: { deletionRequestId: string };
        error?: { code?: string; message?: string };
      };
      if (!response.ok || !body.completion) {
        if (body.error?.code === "recent_authentication_required") {
          throw new Error(
            "Sign out and sign in again before completing account deletion.",
          );
        }
        throw new Error(body.error?.message ?? "Deletion could not be completed.");
      }
      setDeletionRequests((current) =>
        current.filter((candidate) => candidate.id !== request.id),
      );
      setAccounts((current) =>
        current.filter((candidate) => candidate.id !== request.userId),
      );
      setMessage("Account and learner data deletion completed.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Deletion completion failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="owner-console" aria-labelledby="owner-console-title">
      <div className="section-heading section-heading-inline">
        <div>
          <p className="eyebrow">Owner administration</p>
          <h2 id="owner-console-title">Accounts and exact-domain approval</h2>
        </div>
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={() => void load()}
          type="button"
        >
          Refresh
        </button>
      </div>
      <p className="admin-status" role="status">
        {message}
      </p>

      <div className="admin-grid">
        <section className="profile-card">
          <h3>Accounts</h3>
          <div className="admin-account-list">
            {accounts.map((candidate) => (
              <article key={candidate.id}>
                <div>
                  <strong>{candidate.displayName ?? candidate.primaryEmail ?? candidate.id}</strong>
                  <small>{candidate.primaryEmail ?? "No verified email"}</small>
                </div>
                <span className={`account-state account-state-${candidate.state}`}>
                  {candidate.state}
                </span>
                <div className="admin-actions">
                  {nextStates[candidate.state].map((next) => (
                    <button
                      className="button button-secondary"
                      disabled={busy}
                      key={next}
                      onClick={() => void changeState(candidate, next)}
                      type="button"
                    >
                      {next}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="profile-card">
          <h3>Approved email domains</h3>
          <p>
            Matching is exact and only applies when the identity provider marks the
            primary email verified.
          </p>
          <form className="domain-form" onSubmit={(event) => void createDomain(event)}>
            <label htmlFor="approved-domain">Exact domain</label>
            <input id="approved-domain" name="domain" placeholder="example.com" required />
            <label htmlFor="domain-reason">Reason</label>
            <input id="domain-reason" minLength={5} name="reason" required />
            <button className="button button-primary" disabled={busy} type="submit">
              Add enabled rule
            </button>
          </form>
          <div className="domain-list">
            {domains.map((rule) => (
              <article key={rule.id}>
                <div>
                  <strong>{rule.domain}</strong>
                  <small>
                    {rule.enabled ? "Auto-approval enabled" : "Disabled"} · policy v
                    {rule.policyVersion}
                  </small>
                </div>
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => void toggleDomain(rule)}
                  type="button"
                >
                  {rule.enabled ? "Disable" : "Enable"}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="profile-card">
          <h3>Deletion requests</h3>
          {deletionRequests.length === 0 ? (
            <p>No account deletion requests are waiting.</p>
          ) : (
            <div className="admin-account-list">
              {deletionRequests.map((request) => {
                const cancellationOpen =
                  loadedAt < Date.parse(request.cancellationDeadline);
                return (
                  <article key={request.id}>
                    <div>
                      <strong>
                        {request.displayName ?? request.primaryEmail ?? request.userId}
                      </strong>
                      <small>
                        Requested {new Date(request.requestedAt).toLocaleString()}
                      </small>
                    </div>
                    <span className="account-state">
                      {cancellationOpen ? "cancellation open" : request.state}
                    </span>
                    <div className="admin-actions">
                      <button
                        className="button button-secondary"
                        disabled={busy || cancellationOpen}
                        onClick={() => void completeDeletion(request)}
                        type="button"
                      >
                        Complete deletion
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
