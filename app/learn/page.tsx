import type { Metadata } from "next";
import Link from "next/link";
import { starterCatalog } from "@project42/platform";

export const metadata: Metadata = {
  title: "Learning paths",
  description: "Choose a guided Project 42 learning path.",
};

// The self-paced index. The choice between self-paced and instructor-led is
// made one level up on the landing page, so this page is only ever the written
// catalogue - it does not repeat that choice and does not carry a second copy
// of the instructor-led pitch, which lives at /ondemand.
export default function LearnPage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero">
        <p className="eyebrow">Self-paced</p>
        <h1>Learning paths with a clear next step.</h1>
        <p>
          Start from first principles or jump into practical provider decisions. Every
          module ends with a short knowledge check.
        </p>
      </header>

      <div className="learning-path-list">
        {starterCatalog.paths.map((path, index) => {
          const modules = path.moduleIds
            .map((moduleId) =>
              starterCatalog.modules.find((module) => module.id === moduleId),
            )
            .filter(Boolean);
          const minutes = modules.reduce(
            (total, module) => total + (module?.estimatedMinutes ?? 0),
            0,
          );
          return (
            <article className="learning-path-row" key={path.id}>
              <div className="learning-path-number">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <div className="path-card-top">
                  <span className="level-pill">{path.level}</span>
                  <span>
                    {path.moduleIds.length} modules · {minutes} min
                  </span>
                </div>
                <h2>{path.title}</h2>
                <p>{path.summary}</p>
                <small>For {path.audience.toLowerCase()}</small>
              </div>
              <div className="learning-path-modules" aria-label={`${path.title} modules`}>
                {modules.map((module, moduleIndex) => (
                  <span key={module!.id}>
                    {moduleIndex + 1}. {module!.title}
                  </span>
                ))}
              </div>
              <Link className="button button-primary" href={`/learn/${path.id}`}>
                Explore path
              </Link>
            </article>
          );
        })}
      </div>

      <p className="learn-format-switch">
        Would you rather watch it taught?{" "}
        <Link href="/ondemand">See the on-demand classroom →</Link>
      </p>
    </main>
  );
}
