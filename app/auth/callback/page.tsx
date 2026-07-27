"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../components/AuthProvider";

export default function AuthCallbackPage() {
  const { completeSignIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void completeSignIn().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Sign-in could not be completed.");
    });
  }, [completeSignIn]);

  return (
    <main className="page-shell shell">
      <section className="profile-card auth-callback" aria-live="polite">
        <p className="eyebrow">Secure sign-in</p>
        <h1>{error ? "Sign-in needs attention" : "Completing sign-in…"}</h1>
        <p>{error ?? "Project 42 is verifying the identity-provider response."}</p>
      </section>
    </main>
  );
}
