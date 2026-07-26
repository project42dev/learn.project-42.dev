import type { Metadata } from "next";
import { ProgressMigration } from "../components/ProgressMigration";

export const metadata: Metadata = {
  title: "Import previous progress",
  description:
    "Move browser-only Project 42 learning progress from project-42.dev to Learn.",
};

export default function ImportProgressPage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero">
        <p className="eyebrow">Project 42 Learn</p>
        <h1>Keep the progress you already earned.</h1>
        <p>
          Use this once after the Project 42 site split. You stay in control of
          whether the previous browser record replaces progress stored here.
        </p>
      </header>
      <ProgressMigration />
    </main>
  );
}
