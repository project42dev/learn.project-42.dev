"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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

const nextStates: Record<AccountState, AccountState[]> = {
  pending: ["approved", "revoked"],
  approved: ["suspended", "revoked"],
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
      {account.roles.includes("owner") ? <OwnerAdministration /> : null}
    </div>
  );
}

function OwnerAdministration() {
  const { apiFetch } = useAuth();
  const [accounts, setAccounts] = useState<Project42Account[]>([]);
  const [domains, setDomains] = useState<DomainRule[]>([]);
  const [message, setMessage] = useState("Loading owner controls…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [accountResponse, domainResponse] = await Promise.all([
        apiFetch("/v1/admin/accounts"),
        apiFetch("/v1/admin/domains"),
      ]);
      const accountBody = (await accountResponse.json()) as {
        accounts?: Project42Account[];
        error?: { message?: string };
      };
      const domainBody = (await domainResponse.json()) as {
        domains?: DomainRule[];
        error?: { message?: string };
      };
      if (!accountResponse.ok || !domainResponse.ok) {
        throw new Error(
          accountBody.error?.message ??
            domainBody.error?.message ??
            "Owner data could not be loaded.",
        );
      }
      setAccounts(accountBody.accounts ?? []);
      setDomains(domainBody.domains ?? []);
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
      </div>
    </section>
  );
}
