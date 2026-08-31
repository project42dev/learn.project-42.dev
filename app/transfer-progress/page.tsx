import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Progress transfer retired",
  description: "The previous browser progress transfer is no longer supported.",
  robots: { index: false, follow: false },
};

export default function TransferProgressPage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero">
        <p className="eyebrow">Project 42 account update</p>
        <h1>The previous progress transfer has been retired.</h1>
        <p>
          Project 42 now uses approved learner accounts for progress, scores, badges,
          and transcripts. The former browser record cannot be imported.
        </p>
      </header>
      <section className="profile-card">
        <p>
          <a href="https://learn.project-42.dev/account">Sign in to Project 42 Learn</a>{" "}
          to start or continue an account-backed learning record.
        </p>
      </section>
    </main>
  );
}
