"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { HeaderMenu } from "./HeaderMenu";

interface ProfileMenuProps {
  accountHref: string;
  profileHref: string;
  learnerDataHref: string;
  importProgressHref: string;
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" className="profile-icon" focusable="false" viewBox="0 0 24 24">
      <circle cx="12" cy="8.2" fill="currentColor" r="3.6" />
      <path
        d="M4.6 20.2c0-3.9 3.3-6.6 7.4-6.6s7.4 2.7 7.4 6.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.1"
      />
    </svg>
  );
}

/**
 * The learner's own corner of the header.
 *
 * Progress, learner data, and import all work without an account, because the
 * record is device-local in this release, so they are always listed. Only the
 * sign in / sign out control depends on session state, and it is omitted
 * entirely when hosted identity is not configured: a self-hosted deployment
 * without an identity service has nothing to sign in to, and offering it would
 * be a control that cannot work.
 */
export function ProfileMenu({
  accountHref,
  profileHref,
  learnerDataHref,
  importProgressHref,
}: ProfileMenuProps) {
  const { configured, status, account, signIn, signOut } = useAuth();
  const signedIn = status === "signed-in" && Boolean(account);
  const name = account?.displayName ?? account?.primaryEmail ?? null;

  return (
    <HeaderMenu
      accessibleLabel={signedIn && name ? `Your account, ${name}` : "Your account"}
      align="end"
      label={<ProfileIcon />}
      triggerClassName="profile-trigger"
    >
      {signedIn && name ? (
        <p className="header-menu-identity">
          <span>Signed in as</span>
          <strong>{name}</strong>
        </p>
      ) : null}
      <ul className="header-menu-list">
        <li>
          <Link href={profileHref}>My progress</Link>
        </li>
        <li>
          <Link href={accountHref}>Account</Link>
        </li>
        <li>
          <Link href={learnerDataHref}>Learner data</Link>
        </li>
        <li>
          <Link href={importProgressHref}>Import previous progress</Link>
        </li>
      </ul>
      {configured ? (
        <div className="header-menu-footer">
          {signedIn ? (
            <button onClick={() => void signOut()} type="button">
              Sign out
            </button>
          ) : (
            <button onClick={() => void signIn()} type="button">
              Sign in
            </button>
          )}
        </div>
      ) : null}
    </HeaderMenu>
  );
}
