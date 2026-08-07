"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { HeaderMenu } from "./HeaderMenu";

interface ProfileMenuProps {
  accountHref: string;
  profileHref: string;
  learnerDataHref: string;
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

/** First letters of the name, or of the email local part. Never more than two. */
function initialsFor(name: string): string {
  const words = name
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  const letters = words.slice(0, 2).map((word) => word[0]);
  return letters.join("").toUpperCase();
}

/**
 * The learner's own corner of the header.
 *
 * The menu keeps the shared cross-site destinations in a stable order. The
 * sign-in control depends on session state; protected destinations enforce
 * authentication when opened. An unconfigured self-host can still reach its
 * account entry page without presenting a nonfunctional hosted sign-in action.
 *
 * The trigger shows the learner's own photo when they have uploaded one. The
 * photo is private: it is not a public URL, it is fetched as a blob through the
 * authenticated apiFetch and held as an object URL for the life of the page,
 * the same way the account page loads it. That is why this cannot be a plain
 * <img src> and why the object URL is revoked on cleanup.
 */
export function ProfileMenu({
  accountHref,
  profileHref,
  learnerDataHref,
}: ProfileMenuProps) {
  const { configured, status, account, apiFetch, signIn, signOut } = useAuth();
  const signedIn = status === "signed-in" && Boolean(account);
  const name = account?.displayName ?? account?.primaryEmail ?? null;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    // No synchronous reset on sign-out. Setting state during an effect
    // triggers a cascading render, and it is unnecessary here: the trigger
    // below only shows the photo while signed in, and the cleanup revokes the
    // object URL either way.
    if (!signedIn) return undefined;
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const response = await apiFetch("/v1/me/profile");
        const body = (await response.json()) as {
          profile?: { photoAvailable?: boolean };
        };
        if (!response.ok || !body.profile?.photoAvailable) return;
        const photo = await apiFetch("/v1/me/profile/photo");
        if (!photo.ok) return;
        objectUrl = URL.createObjectURL(await photo.blob());
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPhotoUrl(objectUrl);
      } catch {
        // The header is not the place to report this. The account page owns
        // profile errors and says so there; a broken avatar here just falls
        // back to initials.
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [apiFetch, signedIn, account?.id]);

  const initials = signedIn && name ? initialsFor(name) : "";
  const trigger = signedIn && photoUrl ? (
    // Decorative: the button itself carries the accessible name, so announcing
    // the image as well would say the person's name twice.
    //
    // A plain <img>, not next/image: this is a blob object URL for a private
    // photo fetched through the authenticated API, so there is no remote URL
    // for an optimizer to fetch and nothing it could usefully do.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" className="profile-photo" src={photoUrl} />
  ) : initials ? (
    <span aria-hidden="true" className="profile-initials">
      {initials}
    </span>
  ) : (
    <ProfileIcon />
  );

  // When signed out and the identity provider is configured, clicking the
  // profile icon goes straight to sign-in — no dropdown, no intermediate page.
  if (!signedIn && configured) {
    return (
      <button
        aria-label="Sign in to your account"
        className="profile-trigger"
        onClick={() => void signIn()}
        type="button"
      >
        <ProfileIcon />
      </button>
    );
  }

  return (
    <HeaderMenu
      accessibleLabel={signedIn && name ? `Your account, ${name}` : "Your account"}
      align="end"
      label={trigger}
      triggerClassName="profile-trigger"
    >
      {signedIn && name ? (
        <p className="header-menu-identity">
          <span>Signed in as</span>
          <strong>{name}</strong>
        </p>
      ) : null}
      <ul className="header-menu-list">
        {!signedIn ? (
          <li>
            {configured ? (
              <button onClick={() => void signIn()} type="button">
                Sign in
              </button>
            ) : (
              <Link href={accountHref}>Sign in</Link>
            )}
          </li>
        ) : null}
        <li>
          <Link href={profileHref}>My progress</Link>
        </li>
        <li>
          <Link href={accountHref}>Account</Link>
        </li>
        <li>
          <Link href={learnerDataHref}>Learner data</Link>
        </li>
      </ul>
      {configured && signedIn ? (
        <div className="header-menu-footer">
          <button onClick={() => void signOut()} type="button">
            Sign out
          </button>
        </div>
      ) : null}
    </HeaderMenu>
  );
}
