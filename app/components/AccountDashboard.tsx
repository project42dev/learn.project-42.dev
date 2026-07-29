"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { learnerDataPolicy } from "../lib/learnerDataPolicy";
import {
  useAuth,
  type AccountState,
  type Project42Account,
} from "./AuthProvider";
import { AccountMergeAdministration } from "./AccountMergeAdministration";

interface DomainRule {
  id: string;
  domain: string;
  enabled: boolean;
  policyVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface LearnerProfile {
  userId: string;
  displayName: string | null;
  bio: string | null;
  organization: string | null;
  location: string | null;
  websiteUrl: string | null;
  photoAvailable: boolean;
  photoUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LinkedIdentity {
  id: string;
  provider: string;
  providerLogin: string | null;
  displayName: string | null;
  status: "active" | "unlinked";
  primary: boolean;
  linkedAt: string;
  lastVerifiedAt: string;
  lastSeenAt: string;
  unlinkedAt: string | null;
  canUnlink: boolean;
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

interface AuditEvent {
  id: string;
  action: string;
  requestId: string;
  outcome: "success" | "denied" | "failed";
  reason: string;
  occurredAt: string;
}

const nextStates: Record<AccountState, AccountState[]> = {
  pending: ["approved", "rejected", "revoked"],
  approved: ["suspended", "revoked"],
  rejected: ["approved", "revoked"],
  suspended: ["approved", "revoked"],
  revoked: [],
};

type AccountStateFilter = AccountState | "all";

interface AccountStateAction {
  accountId: string;
  nextState: AccountState;
}

interface DomainRuleAction {
  kind: "enable" | "disable" | "remove";
  ruleId: string;
}

const accountStateFilters: AccountStateFilter[] = [
  "pending",
  "all",
  "approved",
  "rejected",
  "suspended",
  "revoked",
];

function accountLabel(account: Project42Account): string {
  return account.displayName ?? account.primaryEmail ?? `Account ${account.id.slice(0, 8)}`;
}

function accountActionLabel(
  currentState: AccountState,
  nextState: AccountState,
): string {
  if (nextState === "approved" && currentState !== "pending") return "Restore access";
  if (nextState === "approved") return "Approve";
  if (nextState === "rejected") return "Reject";
  if (nextState === "suspended") return "Suspend";
  return "Revoke";
}

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
        <p>
          Review <Link href="/learner-data">learner-data and recovery controls</Link>
          {" "}and the{" "}
          <a href="https://project-42.dev/legal-transparency">
            Legal &amp; Transparency page
          </a>
          . Hosted sign-in and records may be temporarily unavailable even after
          configuration.
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
        <p>
          Before requesting access, review{" "}
          <Link href="/learner-data">learner data, consent, retention, and recovery</Link>
          {" "}and the{" "}
          <a href="https://project-42.dev/legal-transparency">
            Legal &amp; Transparency page
          </a>
          . Hosted sign-in and records may be temporarily unavailable.
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
        <p>
          Your browser-local record remains available. See{" "}
          <Link href="/learner-data">learner-data and recovery expectations</Link>
          {" "}or{" "}
          <a href="https://project-42.dev/legal-transparency#service-title">
            service limitations
          </a>
          .
        </p>
        <div className="button-row">
          <button
            className="button button-primary"
            onClick={() => void refreshAccount()}
            type="button"
          >
            Try again
          </button>
          <button
            className="button button-secondary"
            onClick={() => void signOut()}
            type="button"
          >
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
        <button
          className="button button-secondary"
          onClick={() => void signOut()}
          type="button"
        >
          Sign out on this browser
        </button>
        {account.roles.includes("owner") ? (
          <a className="button button-primary" href="/admin">
            Open owner console
          </a>
        ) : null}
      </section>
      {account.state !== "suspended" && account.state !== "revoked" ? (
        <ProfileEditor />
      ) : null}
      {account.state === "approved" ? <LinkedIdentityEditor /> : null}
      <LearnerDataControls />
      {account.roles.includes("owner") ? <OwnerAdministration /> : null}
    </div>
  );
}

function LinkedIdentityEditor() {
  const { apiFetch, startGithubLink } = useAuth();
  const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
  const [message, setMessage] = useState("Loading linked accounts…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await apiFetch("/v1/me/identities");
      const body = (await response.json()) as {
        identities?: LinkedIdentity[];
        error?: { message?: string };
      };
      if (!response.ok || !body.identities) {
        throw new Error(
          body.error?.message ?? "Linked accounts could not be loaded.",
        );
      }
      setIdentities(body.identities);
      setMessage("Linked accounts are current.");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Linked accounts could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function connectGithub() {
    setBusy(true);
    setMessage("Opening GitHub’s secure authorization page…");
    try {
      await startGithubLink("/account?linked=github");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "GitHub account linking could not be started.",
      );
      setBusy(false);
    }
  }

  async function unlink(identity: LinkedIdentity) {
    const label = identity.providerLogin
      ? `@${identity.providerLogin}`
      : identity.displayName ?? identity.provider;
    if (
      !window.confirm(
        `Unlink ${label}? Your Project 42 learning record will remain intact.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const response = await apiFetch(
        `/v1/me/identities/${encodeURIComponent(identity.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body = (await response.json()) as {
          error?: { message?: string };
        };
        throw new Error(
          body.error?.message ?? "The linked account could not be removed.",
        );
      }
      await load();
      setMessage(`${label} was unlinked.`);
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "The linked account could not be removed.",
      );
    } finally {
      setBusy(false);
    }
  }

  const githubLinked = identities.some(
    (identity) => identity.provider === "github" && identity.status === "active",
  );

  return (
    <section className="profile-card" aria-labelledby="linked-identities-title">
      <p className="eyebrow">Linked accounts</p>
      <h3 id="linked-identities-title">Sign-in and contributor identity</h3>
      <p>
        Link GitHub to your existing Project 42 learner record without changing
        your primary sign-in. Repository permissions are never requested.
      </p>
      <p className="admin-status" role="status">
        {message}
      </p>
      <div className="linked-identity-list">
        {identities.map((identity) => (
          <article key={identity.id}>
            <div>
              <strong>
                {identity.provider === "github"
                  ? "GitHub"
                  : identity.provider === "oidc"
                    ? "Primary identity provider"
                    : identity.provider}
              </strong>
              <span>
                {identity.providerLogin
                  ? `@${identity.providerLogin}`
                  : identity.displayName ?? "Verified identity"}
              </span>
              <small>
                Last verified{" "}
                {new Date(identity.lastVerifiedAt).toLocaleDateString()}
              </small>
            </div>
            <div className="linked-identity-actions">
              <span className="account-state">
                {identity.primary ? "Primary" : "Linked"}
              </span>
              {identity.canUnlink ? (
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => void unlink(identity)}
                  type="button"
                >
                  Unlink
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!githubLinked ? (
        <button
          className="button button-primary"
          disabled={busy}
          onClick={() => void connectGithub()}
          type="button"
        >
          Connect GitHub
        </button>
      ) : null}
    </section>
  );
}

function ProfileEditor() {
  const { apiFetch, refreshAccount } = useAuth();
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading profile…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await apiFetch("/v1/me/profile");
      const body = (await response.json()) as {
        profile?: LearnerProfile;
        error?: { message?: string };
      };
      if (!response.ok || !body.profile) {
        throw new Error(body.error?.message ?? "Your profile could not be loaded.");
      }
      setProfile(body.profile);
      setMessage("Profile is current.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Your profile could not be loaded.");
    } finally {
      setBusy(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!profile?.photoAvailable) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    void apiFetch("/v1/me/profile/photo")
      .then(async (response) => {
        if (!response.ok) throw new Error("Profile photo could not be loaded.");
        objectUrl = URL.createObjectURL(await response.blob());
        if (!cancelled) setPhotoUrl(objectUrl);
      })
      .catch((caught) => {
        if (!cancelled) {
          setMessage(
            caught instanceof Error ? caught.message : "Profile photo could not be loaded.",
          );
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [apiFetch, profile?.photoAvailable, profile?.photoUpdatedAt]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await apiFetch("/v1/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: String(form.get("displayName") ?? ""),
          bio: String(form.get("bio") ?? ""),
          organization: String(form.get("organization") ?? ""),
          location: String(form.get("location") ?? ""),
          websiteUrl: String(form.get("websiteUrl") ?? ""),
        }),
      });
      const body = (await response.json()) as {
        profile?: LearnerProfile;
        error?: { message?: string };
      };
      if (!response.ok || !body.profile) {
        throw new Error(body.error?.message ?? "Your profile could not be saved.");
      }
      setProfile(body.profile);
      setMessage("Profile saved.");
      await refreshAccount();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Your profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      setMessage("Choose a JPEG, PNG, or WebP photo first.");
      return;
    }
    const extension = photo.name.split(".").pop()?.toLowerCase();
    const contentType =
      photo.type ||
      (extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "");
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      setMessage("Choose a JPEG, PNG, or WebP photo.");
      return;
    }
    setBusy(true);
    try {
      const response = await apiFetch("/v1/me/profile/photo", {
        method: "PUT",
        headers: { "content-type": contentType },
        body: photo,
      });
      const body = (await response.json()) as {
        photo?: { available: boolean };
        error?: { message?: string };
      };
      if (!response.ok || !body.photo?.available) {
        throw new Error(body.error?.message ?? "Profile photo could not be uploaded.");
      }
      setPhotoUrl(null);
      event.currentTarget.reset();
      await load();
      setMessage("Profile photo saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Profile photo could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!window.confirm("Remove your Project 42 profile photo?")) return;
    setBusy(true);
    try {
      const response = await apiFetch("/v1/me/profile/photo", { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Profile photo could not be removed.");
      }
      setPhotoUrl(null);
      await load();
      setMessage("Profile photo removed.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Profile photo could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-card" aria-labelledby="hosted-profile-title">
      <p className="eyebrow">Hosted profile</p>
      <h3 id="hosted-profile-title">How you appear in Project 42</h3>
      <p>
        These details are stored with your Project 42 account. Your verified email
        remains controlled by your identity provider.
      </p>
      <p className="admin-status" role="status">
        {message}
      </p>
      {profile ? (
        <>
          <div className="account-photo-editor">
            <div className="account-photo-preview">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Current profile" src={photoUrl} />
              ) : (
                <span aria-hidden="true">
                  {(profile.displayName?.trim().charAt(0) || "?").toUpperCase()}
                </span>
              )}
            </div>
            <form onSubmit={uploadPhoto}>
              <label htmlFor="profile-photo">Profile photo</label>
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                id="profile-photo"
                name="photo"
                required
                type="file"
              />
              <small>JPEG, PNG, or WebP; 2 MB maximum. Stored privately.</small>
              <div className="button-row">
                <button className="button button-secondary" disabled={busy} type="submit">
                  Upload photo
                </button>
                {profile.photoAvailable ? (
                  <button
                    className="button button-secondary"
                    disabled={busy}
                    onClick={() => void removePhoto()}
                    type="button"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </form>
          </div>
          <form className="account-profile-form" key={profile.updatedAt} onSubmit={saveProfile}>
          <label htmlFor="profile-display-name">Display name</label>
          <input
            defaultValue={profile.displayName ?? ""}
            id="profile-display-name"
            maxLength={80}
            name="displayName"
          />
          <label htmlFor="profile-organization">Organization</label>
          <input
            defaultValue={profile.organization ?? ""}
            id="profile-organization"
            maxLength={120}
            name="organization"
          />
          <label htmlFor="profile-location">Location</label>
          <input
            defaultValue={profile.location ?? ""}
            id="profile-location"
            maxLength={120}
            name="location"
          />
          <label htmlFor="profile-website">Website</label>
          <input
            defaultValue={profile.websiteUrl ?? ""}
            id="profile-website"
            inputMode="url"
            maxLength={2048}
            name="websiteUrl"
            placeholder="https://example.com"
            type="url"
          />
          <label htmlFor="profile-bio">About you</label>
          <textarea
            defaultValue={profile.bio ?? ""}
            id="profile-bio"
            maxLength={500}
            name="bio"
            rows={4}
          />
          <button className="button button-primary" disabled={busy} type="submit">
            Save profile
          </button>
          </form>
        </>
      ) : (
        <button className="button button-secondary" disabled={busy} onClick={() => void load()} type="button">
          Try loading profile again
        </button>
      )}
    </section>
  );
}

function LearnerDataControls() {
  const { apiFetch, signIn } = useAuth();
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
      <p className="account-policy-note">
        These controls follow the current{" "}
        <Link href="/learner-data">learner-data policy</Link>. Consent is recorded
        separately from the{" "}
        <a href="https://project-42.dev/legal-transparency">
          Legal &amp; Transparency page
        </a>
        ; neither is preselected.
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

export function AdminDashboard() {
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
        <p className="eyebrow">Owner administration</p>
        <h2>Hosted identity is not configured</h2>
        <p>The owner console requires a configured OIDC provider and account API.</p>
      </section>
    );
  }

  if (status === "loading" || status === "signing-in") {
    return <div className="profile-loading">Checking owner access…</div>;
  }

  if (status === "signed-out") {
    return (
      <section className="profile-card account-card">
        <p className="eyebrow">Owner administration</p>
        <h2>Sign in with an approved owner account</h2>
        <p>
          Administrative data is loaded only after the account service confirms an
          approved owner role.
        </p>
        <button
          className="button button-primary"
          onClick={() => void signIn("/admin")}
          type="button"
        >
          Sign in to owner console
        </button>
      </section>
    );
  }

  if (status === "error" || !account) {
    return (
      <section className="profile-card account-card" role="alert">
        <p className="eyebrow">Owner administration</p>
        <h2>Owner access could not be verified</h2>
        <p>{error ?? "The account could not be loaded."}</p>
        <div className="button-row">
          <button
            className="button button-primary"
            onClick={() => void refreshAccount()}
            type="button"
          >
            Try again
          </button>
          <button
            className="button button-secondary"
            onClick={() => void signOut()}
            type="button"
          >
            Clear this sign-in
          </button>
        </div>
      </section>
    );
  }

  if (account.state !== "approved" || !account.roles.includes("owner")) {
    return (
      <section className="profile-card account-card" role="alert">
        <p className="eyebrow">Owner administration</p>
        <h2>Owner access required</h2>
        <p>
          This account is not an approved Project 42 owner. No administrative data
          has been requested or displayed.
        </p>
        <a className="button button-secondary" href="/account">
          Return to my account
        </a>
      </section>
    );
  }

  return <OwnerAdministration />;
}

export function OwnerAdministration() {
  const { apiFetch } = useAuth();
  const [accounts, setAccounts] = useState<Project42Account[]>([]);
  const [accountStateFilter, setAccountStateFilter] =
    useState<AccountStateFilter>("pending");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountAction, setAccountAction] = useState<AccountStateAction | null>(
    null,
  );
  const [accountActionReason, setAccountActionReason] = useState("");
  const [accountActionConfirmation, setAccountActionConfirmation] = useState("");
  const [domains, setDomains] = useState<DomainRule[]>([]);
  const [domainAction, setDomainAction] = useState<DomainRuleAction | null>(null);
  const [domainActionReason, setDomainActionReason] = useState("");
  const [automaticDomainApprovalEnabled, setAutomaticDomainApprovalEnabled] =
    useState(false);
  const [deletionRequests, setDeletionRequests] = useState<OwnerDeletionRequest[]>([]);
  const [deletionActionId, setDeletionActionId] = useState<string | null>(null);
  const [deletionActionReason, setDeletionActionReason] = useState("");
  const [deletionActionConfirmation, setDeletionActionConfirmation] = useState("");
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loadedAt, setLoadedAt] = useState(0);
  const [message, setMessage] = useState("Loading owner controls…");
  const [busy, setBusy] = useState(false);
  const accountActionHeading = useRef<HTMLHeadingElement>(null);
  const domainActionHeading = useRef<HTMLHeadingElement>(null);
  const deletionActionHeading = useRef<HTMLHeadingElement>(null);

  const filteredAccounts = useMemo(() => {
    const query = accountSearch.trim().toLocaleLowerCase();
    return accounts.filter((candidate) => {
      if (
        accountStateFilter !== "all" &&
        candidate.state !== accountStateFilter
      ) {
        return false;
      }
      if (!query) return true;
      return [
        candidate.displayName,
        candidate.primaryEmail,
        candidate.id,
        candidate.state,
        ...candidate.roles,
      ].some((value) => value?.toLocaleLowerCase().includes(query));
    });
  }, [accountSearch, accountStateFilter, accounts]);

  const accountCounts = useMemo(
    () =>
      Object.fromEntries(
        accountStateFilters.map((state) => [
          state,
          state === "all"
            ? accounts.length
            : accounts.filter((candidate) => candidate.state === state).length,
        ]),
      ) as Record<AccountStateFilter, number>,
    [accounts],
  );

  const selectedAccount = accountAction
    ? accounts.find((candidate) => candidate.id === accountAction.accountId) ?? null
    : null;
  const selectedDomain = domainAction
    ? domains.find((candidate) => candidate.id === domainAction.ruleId) ?? null
    : null;
  const selectedDeletionRequest = deletionActionId
    ? deletionRequests.find((candidate) => candidate.id === deletionActionId) ?? null
    : null;

  useEffect(() => {
    if (accountAction) accountActionHeading.current?.focus();
  }, [accountAction]);

  useEffect(() => {
    if (domainAction) domainActionHeading.current?.focus();
  }, [domainAction]);

  useEffect(() => {
    if (deletionActionId) deletionActionHeading.current?.focus();
  }, [deletionActionId]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [accountResponse, domainResponse, deletionResponse, auditResponse] =
        await Promise.all([
        apiFetch("/v1/admin/accounts"),
        apiFetch("/v1/admin/domains"),
        apiFetch("/v1/admin/deletions"),
        apiFetch("/v1/admin/audit"),
      ]);
      const accountBody = (await accountResponse.json()) as {
        accounts?: Project42Account[];
        error?: { message?: string };
      };
      const domainBody = (await domainResponse.json()) as {
        domains?: DomainRule[];
        automaticApprovalEnabled?: boolean;
        error?: { message?: string };
      };
      const deletionBody = (await deletionResponse.json()) as {
        requests?: OwnerDeletionRequest[];
        error?: { message?: string };
      };
      const auditBody = (await auditResponse.json()) as {
        events?: AuditEvent[];
        error?: { message?: string };
      };
      if (
        !accountResponse.ok ||
        !domainResponse.ok ||
        !deletionResponse.ok ||
        !auditResponse.ok
      ) {
        throw new Error(
          accountBody.error?.message ??
            domainBody.error?.message ??
            deletionBody.error?.message ??
            auditBody.error?.message ??
            "Owner data could not be loaded.",
        );
      }
      setAccounts(accountBody.accounts ?? []);
      setDomains(domainBody.domains ?? []);
      setAutomaticDomainApprovalEnabled(
        domainBody.automaticApprovalEnabled === true,
      );
      setDeletionRequests(deletionBody.requests ?? []);
      setAuditEvents(auditBody.events ?? []);
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

  function beginStateChange(target: Project42Account, state: AccountState) {
    setAccountAction({ accountId: target.id, nextState: state });
    setAccountActionReason("");
    setAccountActionConfirmation("");
  }

  function cancelStateChange() {
    setAccountAction(null);
    setAccountActionReason("");
    setAccountActionConfirmation("");
  }

  async function changeState(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountAction || !selectedAccount) return;
    const reason = accountActionReason.trim();
    if (
      reason.length < 5 ||
      reason.length > 500 ||
      (accountAction.nextState === "revoked" &&
        accountActionConfirmation !== "REVOKE")
    ) {
      return;
    }
    setBusy(true);
    try {
      const response = await apiFetch(
        `/v1/admin/accounts/${encodeURIComponent(selectedAccount.id)}/state`,
        {
          method: "PATCH",
          body: JSON.stringify({ state: accountAction.nextState, reason }),
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
      setMessage(
        `${accountLabel(selectedAccount)} changed to ${accountAction.nextState}.`,
      );
      cancelStateChange();
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
        body: JSON.stringify({
          domain,
          reason,
          enabled: automaticDomainApprovalEnabled,
        }),
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
      setMessage(
        body.domain.enabled
          ? `Exact-domain approval enabled for ${body.domain.domain}.`
          : `${body.domain.domain} staged as a disabled rule.`,
      );
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Domain change failed.");
    } finally {
      setBusy(false);
    }
  }

  function beginDomainAction(
    rule: DomainRule,
    kind: DomainRuleAction["kind"],
  ) {
    setDomainAction({ kind, ruleId: rule.id });
    setDomainActionReason("");
  }

  function cancelDomainAction() {
    setDomainAction(null);
    setDomainActionReason("");
  }

  async function submitDomainAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!domainAction || !selectedDomain) return;
    const reason = domainActionReason.trim();
    if (reason.length < 5 || reason.length > 500) return;
    const remove = domainAction.kind === "remove";
    setBusy(true);
    try {
      const response = await apiFetch(
        `/v1/admin/domains/${encodeURIComponent(selectedDomain.id)}`,
        {
          method: remove ? "DELETE" : "PATCH",
          body: JSON.stringify(
            remove
              ? { reason }
              : { enabled: domainAction.kind === "enable", reason },
          ),
        },
      );
      const body = (await response.json()) as {
        domain?: DomainRule;
        error?: { message?: string };
      };
      if (!response.ok || !body.domain) {
        throw new Error(
          body.error?.message ??
            (remove
              ? "Domain rule could not be removed."
              : "Domain rule could not be changed."),
        );
      }
      if (remove) {
        setDomains((current) =>
          current.filter((candidate) => candidate.id !== body.domain?.id),
        );
        setMessage(`Removed ${body.domain.domain}.`);
      } else {
        setDomains((current) =>
          current.map((candidate) =>
            candidate.id === body.domain?.id ? body.domain : candidate,
          ),
        );
        setMessage(`Domain rule ${body.domain.enabled ? "enabled" : "disabled"}.`);
      }
      cancelDomainAction();
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : remove
            ? "Domain removal failed."
            : "Domain change failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function beginDeletionAction(request: OwnerDeletionRequest) {
    setDeletionActionId(request.id);
    setDeletionActionReason("");
    setDeletionActionConfirmation("");
  }

  function cancelDeletionAction() {
    setDeletionActionId(null);
    setDeletionActionReason("");
    setDeletionActionConfirmation("");
  }

  async function completeDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDeletionRequest) return;
    const reason = deletionActionReason.trim();
    if (
      reason.length < 5 ||
      reason.length > 500 ||
      deletionActionConfirmation !== "DELETE"
    ) {
      return;
    }
    setBusy(true);
    try {
      const response = await apiFetch(
        `/v1/admin/deletions/${encodeURIComponent(selectedDeletionRequest.id)}/complete`,
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
        current.filter((candidate) => candidate.id !== selectedDeletionRequest.id),
      );
      setAccounts((current) =>
        current.filter((candidate) => candidate.id !== selectedDeletionRequest.userId),
      );
      setMessage("Account and learner data deletion completed.");
      cancelDeletionAction();
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
          <div className="admin-account-heading">
            <div>
              <h3>Account approval queue</h3>
              <p>
                New registrations appear under Pending. Search by name, verified
                email, role, state, or account identifier.
              </p>
            </div>
            <strong aria-live="polite">
              {filteredAccounts.length} of {accounts.length} shown
            </strong>
          </div>
          <div className="admin-account-filters">
            <div>
              <label htmlFor="admin-account-search">Search accounts</label>
              <input
                id="admin-account-search"
                onChange={(event) => setAccountSearch(event.target.value)}
                placeholder="Name or verified email"
                type="search"
                value={accountSearch}
              />
            </div>
            <div>
              <label htmlFor="admin-account-state">Account state</label>
              <select
                id="admin-account-state"
                onChange={(event) => {
                  setAccountStateFilter(event.target.value as AccountStateFilter);
                  cancelStateChange();
                }}
                value={accountStateFilter}
              >
                {accountStateFilters.map((state) => (
                  <option key={state} value={state}>
                    {state === "all"
                      ? "All accounts"
                      : state.charAt(0).toUpperCase() + state.slice(1)}{" "}
                    ({accountCounts[state]})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="admin-account-list">
            {filteredAccounts.length === 0 ? (
              <p className="admin-empty-state">
                No accounts match this state and search.
              </p>
            ) : null}
            {filteredAccounts.map((candidate) => (
              <article key={candidate.id}>
                <div>
                  <strong>{accountLabel(candidate)}</strong>
                  <small>{candidate.primaryEmail ?? "No verified email"}</small>
                  <small>
                    {candidate.emailVerified ? "Verified email" : "Email not verified"} ·{" "}
                    {candidate.roles.join(", ")}
                  </small>
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
                      onClick={() => beginStateChange(candidate, next)}
                      type="button"
                    >
                      {accountActionLabel(candidate.state, next)}
                    </button>
                  ))}
                </div>
                {accountAction?.accountId === candidate.id &&
                selectedAccount ? (
                  <form
                    className={`admin-account-action${
                      accountAction.nextState === "revoked"
                        ? " admin-account-action-danger"
                        : ""
                    }`}
                    onSubmit={(event) => void changeState(event)}
                  >
                    <h4 ref={accountActionHeading} tabIndex={-1}>
                      {accountActionLabel(
                        selectedAccount.state,
                        accountAction.nextState,
                      )}{" "}
                      {accountLabel(selectedAccount)}
                    </h4>
                    <p>
                      Change this account from <strong>{selectedAccount.state}</strong>{" "}
                      to <strong>{accountAction.nextState}</strong>. The reason is
                      written to the privileged audit record.
                    </p>
                    {accountAction.nextState === "revoked" ? (
                      <p role="alert">
                        Revocation is permanent for this identity. It cannot be
                        restored from this console.
                      </p>
                    ) : null}
                    <label htmlFor="admin-account-action-reason">Reason</label>
                    <textarea
                      id="admin-account-action-reason"
                      maxLength={500}
                      minLength={5}
                      onChange={(event) =>
                        setAccountActionReason(event.target.value)
                      }
                      required
                      rows={3}
                      value={accountActionReason}
                    />
                    {accountAction.nextState === "revoked" ? (
                      <>
                        <label htmlFor="admin-account-action-confirmation">
                          Enter REVOKE to confirm
                        </label>
                        <input
                          autoComplete="off"
                          id="admin-account-action-confirmation"
                          onChange={(event) =>
                            setAccountActionConfirmation(event.target.value)
                          }
                          required
                          value={accountActionConfirmation}
                        />
                      </>
                    ) : null}
                    <div className="button-row">
                      <button
                        className="button button-primary"
                        disabled={
                          busy ||
                          accountActionReason.trim().length < 5 ||
                          (accountAction.nextState === "revoked" &&
                            accountActionConfirmation !== "REVOKE")
                        }
                        type="submit"
                      >
                        Confirm{" "}
                        {accountActionLabel(
                          selectedAccount.state,
                          accountAction.nextState,
                        ).toLocaleLowerCase()}
                      </button>
                      <button
                        className="button button-secondary"
                        disabled={busy}
                        onClick={cancelStateChange}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
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
          {!automaticDomainApprovalEnabled ? (
            <p role="status">
              Automatic approval remains locked until the deployment validates real
              signed verified-email claims. You can safely stage disabled rules now.
            </p>
          ) : null}
          <form className="domain-form" onSubmit={(event) => void createDomain(event)}>
            <label htmlFor="approved-domain">Exact domain</label>
            <input
              id="approved-domain"
              name="domain"
              placeholder="example.com"
              required
            />
            <label htmlFor="domain-reason">Reason</label>
            <input
              id="domain-reason"
              minLength={5}
              name="reason"
              required
            />
            <button
              className="button button-primary"
              disabled={busy}
              type="submit"
            >
              {automaticDomainApprovalEnabled ? "Add enabled rule" : "Stage disabled rule"}
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
                <div className="admin-actions">
                  <button
                    className="button button-secondary"
                    disabled={
                      busy || (!automaticDomainApprovalEnabled && !rule.enabled)
                    }
                    onClick={() =>
                      beginDomainAction(rule, rule.enabled ? "disable" : "enable")
                    }
                    type="button"
                  >
                    {rule.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={busy || rule.enabled}
                    onClick={() => beginDomainAction(rule, "remove")}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
                {domainAction?.ruleId === rule.id && selectedDomain ? (
                  <form
                    className={`admin-account-action${
                      domainAction.kind === "remove"
                        ? " admin-account-action-danger"
                        : ""
                    }`}
                    onSubmit={(event) => void submitDomainAction(event)}
                  >
                    <h4 ref={domainActionHeading} tabIndex={-1}>
                      {domainAction.kind === "remove"
                        ? "Remove"
                        : domainAction.kind === "enable"
                          ? "Enable"
                          : "Disable"}{" "}
                      {selectedDomain.domain}
                    </h4>
                    <p>
                      {domainAction.kind === "remove"
                        ? "Remove this disabled exact-domain rule. The rule must be recreated before it can be used again."
                        : `${domainAction.kind === "enable" ? "Enable" : "Disable"} automatic approval for this exact verified-email domain.`}{" "}
                      The reason is written to the privileged audit record.
                    </p>
                    <label htmlFor="admin-domain-action-reason">Reason</label>
                    <textarea
                      id="admin-domain-action-reason"
                      maxLength={500}
                      minLength={5}
                      onChange={(event) =>
                        setDomainActionReason(event.target.value)
                      }
                      required
                      rows={3}
                      value={domainActionReason}
                    />
                    <div className="button-row">
                      <button
                        className="button button-primary"
                        disabled={busy || domainActionReason.trim().length < 5}
                        type="submit"
                      >
                        Confirm {domainAction.kind}
                      </button>
                      <button
                        className="button button-secondary"
                        disabled={busy}
                        onClick={cancelDomainAction}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
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
                        onClick={() => beginDeletionAction(request)}
                        type="button"
                      >
                        Complete deletion
                      </button>
                    </div>
                    {deletionActionId === request.id &&
                    selectedDeletionRequest ? (
                      <form
                        className="admin-account-action admin-account-action-danger"
                        onSubmit={(event) => void completeDeletion(event)}
                      >
                        <h4 ref={deletionActionHeading} tabIndex={-1}>
                          Permanently delete{" "}
                          {selectedDeletionRequest.displayName ??
                            selectedDeletionRequest.primaryEmail ??
                            selectedDeletionRequest.userId}
                        </h4>
                        <p role="alert">
                          This completes the approved deletion request and removes
                          the account and learner data. The reason is written to the
                          privileged audit record.
                        </p>
                        <label htmlFor="admin-deletion-action-reason">Reason</label>
                        <textarea
                          id="admin-deletion-action-reason"
                          maxLength={500}
                          minLength={5}
                          onChange={(event) =>
                            setDeletionActionReason(event.target.value)
                          }
                          required
                          rows={3}
                          value={deletionActionReason}
                        />
                        <label htmlFor="admin-deletion-action-confirmation">
                          Enter DELETE to confirm
                        </label>
                        <input
                          autoComplete="off"
                          id="admin-deletion-action-confirmation"
                          onChange={(event) =>
                            setDeletionActionConfirmation(event.target.value)
                          }
                          required
                          value={deletionActionConfirmation}
                        />
                        <div className="button-row">
                          <button
                            className="button button-primary"
                            disabled={
                              busy ||
                              deletionActionReason.trim().length < 5 ||
                              deletionActionConfirmation !== "DELETE"
                            }
                            type="submit"
                          >
                            Confirm permanent deletion
                          </button>
                          <button
                            className="button button-secondary"
                            disabled={busy}
                            onClick={cancelDeletionAction}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <AccountMergeAdministration
          accounts={accounts}
          onAccountsChanged={load}
        />

        <section className="profile-card">
          <h3>Privileged audit events</h3>
          <p>
            The newest request-correlated administrative and data-rights events are
            shown first.
          </p>
          {auditEvents.length === 0 ? (
            <p>No privileged audit events are recorded.</p>
          ) : (
            <div className="audit-event-list">
              {auditEvents.slice(0, 25).map((event) => (
                <article key={event.id}>
                  <div>
                    <strong>{event.action}</strong>
                    <small>{new Date(event.occurredAt).toLocaleString()}</small>
                  </div>
                  <span className="account-state">{event.outcome}</span>
                  <p>{event.reason}</p>
                  <small>Request {event.requestId}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
