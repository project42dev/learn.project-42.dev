import type { Metadata } from "next";
import Link from "next/link";
import { learnerDataPolicy as policy } from "../lib/learnerDataPolicy";

export const metadata: Metadata = {
  title: "Learner data and account controls",
  description:
    "What Project 42 stores today and the consent, retention, export, deletion, and recovery rules for future accounts.",
};

function label(value: string) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function LearnerDataPage() {
  return (
    <main className="page-shell shell learner-data-page">
      <header className="page-hero learner-data-hero">
        <p className="eyebrow">Learner data</p>
        <h1>Your learning data, without fine print.</h1>
        <p>
          Project 42 is building cross-device learning records deliberately. This
          page separates what is available now from the account protections that
          must pass before hosted records turn on.
        </p>
        <a
          className="text-link"
          href="https://project-42.dev/legal-transparency"
        >
          Service, licensing, and AI transparency →
        </a>
      </header>

      <section className="policy-status" aria-labelledby="policy-status-title">
        <div>
          <p className="eyebrow">Available today</p>
          <h2 id="policy-status-title">Private to this browser</h2>
          <p>{policy.currentStorageNotice}</p>
          <p>
            You can download a portable JSON backup or CSV transcript and erase the
            local record from <Link href="/profile">My progress</Link>.
          </p>
        </div>
        <dl>
          <div>
            <dt>Account-backed records</dt>
            <dd>{policy.accountBackedRecords === "available" ? "Available" : "Not enabled"}</dd>
          </div>
          <div>
            <dt>Policy version</dt>
            <dd>{policy.policyVersion}</dd>
          </div>
          <div>
            <dt>Current hosted collection</dt>
            <dd>None</dd>
          </div>
        </dl>
      </section>

      <section className="policy-section" aria-labelledby="identity-heading">
        <div className="policy-section-heading">
          <p className="eyebrow">Identity</p>
          <h2 id="identity-heading">An email address is never your account key.</h2>
          <p>
            Accounts use OpenID Connect Authorization Code with PKCE through the
            account API. Learn receives only an opaque HttpOnly session cookie and
            never stores provider tokens. Project 42 binds the provider&apos;s stable
            issuer and subject to an internal learner ID. Changing an email cannot
            create or merge accounts.
          </p>
        </div>
        <div className="policy-fact-grid">
          <article>
            <span>01</span>
            <h3>Minimal profile</h3>
            <p>
              Required records are an internal learner ID, tenant or installation,
              lifecycle state, and timestamps. Display name and accessibility
              preferences are optional.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Tenant boundaries</h3>
            <p>
              Every command and query must name its tenant or installation and is
              denied by default outside that boundary.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Portable storage</h3>
            <p>
              The hosted profile uses Sites-managed D1. The supported self-host
              reference uses PostgreSQL under the same contract tests.
            </p>
          </article>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="lifecycle-heading">
        <div className="policy-section-heading">
          <p className="eyebrow">Account lifecycle</p>
          <h2 id="lifecycle-heading">Only explicit transitions are allowed.</h2>
          <p>
            Deleted is terminal. Recovery cannot use an email address to replace,
            merge, or guess an identity.
          </p>
        </div>
        <ol className="policy-lifecycle">
          {policy.lifecycle.states.map((state) => {
            const next = policy.lifecycle.transitions
              .filter((transition) => transition.from === state)
              .map((transition) => label(transition.to));
            return (
              <li key={state}>
                <strong>{label(state)}</strong>
                <span>{next.length ? `May move to ${next.join(", ")}` : "Terminal state"}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="policy-section" aria-labelledby="consent-heading">
        <div className="policy-section-heading">
          <p className="eyebrow">Consent and choice</p>
          <h2 id="consent-heading">One purpose, one visible decision.</h2>
          <p>
            Every decision records its purpose, policy version, choice, and time.
            Optional uses cannot be bundled into the learning service.
          </p>
        </div>
        <div className="policy-table-wrap" tabIndex={0} aria-label="Consent purposes">
          <table className="policy-table">
            <thead>
              <tr>
                <th scope="col">Purpose</th>
                <th scope="col">Required</th>
                <th scope="col">What it does</th>
                <th scope="col">If withdrawn</th>
              </tr>
            </thead>
            <tbody>
              {policy.consent.purposes.map((purpose) => (
                <tr key={purpose.id}>
                  <th scope="row">{label(purpose.id)}</th>
                  <td>{purpose.required ? "Yes" : "No"}</td>
                  <td>{purpose.description}</td>
                  <td>{purpose.withdrawalEffect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="retention-heading">
        <div className="policy-section-heading">
          <p className="eyebrow">Retention and recovery</p>
          <h2 id="retention-heading">Records have an end date.</h2>
          <p>
            Active learning records remain while the account is active. Inactive
            account records expire after two years; diagnostics after 30 days; audit
            detail after one year; and deletion receipts after 90 days.
          </p>
        </div>
        <div className="policy-control-grid">
          <article>
            <strong>{policy.deletion.cancellationWindowDays} days</strong>
            <h3>Deletion cancellation</h3>
            <p>A confirmed request can be cancelled inside this window.</p>
          </article>
          <article>
            <strong>{policy.deletion.activeStoreCompletionDays} days</strong>
            <h3>Active-store deletion</h3>
            <p>Adapters must return verified receipts before the account is deleted.</p>
          </article>
          <article>
            <strong>{policy.deletion.backupExpiryDays} days</strong>
            <h3>Backup expiry</h3>
            <p>Every restore replays the deletion ledger before serving records.</p>
          </article>
          <article>
            <strong>
              {policy.recovery.recoveryPointHours}h / {policy.recovery.recoveryTimeHours}h
            </strong>
            <h3>Recovery objective</h3>
            <p>
              Initial recovery point and recovery time targets, tested every{" "}
              {policy.recovery.restoreTestCadenceDays} days.
            </p>
          </article>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="export-heading">
        <div className="policy-section-heading">
          <p className="eyebrow">Export and deletion</p>
          <h2 id="export-heading">Your record must remain movable and erasable.</h2>
        </div>
        <div className="policy-two-column">
          <article>
            <h3>Export</h3>
            <ul>
              <li>Portable Project 42 JSON and transcript CSV</li>
              <li>
                Authentication within the previous{" "}
                {policy.export.recentAuthenticationMinutes} minutes
              </li>
              <li>A single authenticated download, never a public object URL</li>
              <li>An audit event without retaining the exported payload</li>
            </ul>
          </article>
          <article>
            <h3>Deletion</h3>
            <ol>
              <li>Explain scope and offer export.</li>
              <li>Require recent authentication and explicit confirmation.</li>
              <li>Issue a receipt and allow cancellation.</li>
              <li>Verify active-store deletion.</li>
              <li>Expire backups and replay deletion after every restore.</li>
            </ol>
          </article>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="roles-heading">
        <div className="policy-section-heading">
          <p className="eyebrow">Authorization</p>
          <h2 id="roles-heading">Visibility is not permission.</h2>
          <p>
            Hiding a button is never enough. Every server operation checks the actor,
            tenant, role, and requested record.
          </p>
        </div>
        <div className="policy-role-grid">
          {policy.authorization.grants.map((grant) => (
            <article key={grant.role}>
              <h3>{label(grant.role)}</h3>
              <p>{grant.boundary}</p>
              <small>{grant.permissions.length} explicit permissions</small>
            </article>
          ))}
        </div>
      </section>

      <section className="policy-machine-readable">
        <div>
          <p className="eyebrow">Open contract</p>
          <h2>Inspect the exact policy applications must follow.</h2>
          <p>
            The machine-readable endpoint is generated from the same validated
            platform contract as this page.
          </p>
        </div>
        <a className="button button-primary" href="/learner-data/policy">
          View policy JSON
        </a>
      </section>
    </main>
  );
}
