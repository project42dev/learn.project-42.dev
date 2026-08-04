import type { Metadata } from "next";
import Link from "next/link";
import { starterCatalog } from "@project42/platform";
import { ProgressSnapshot } from "./components/ProgressSnapshot";

export const metadata: Metadata = {
  title: "Learn with Project 42",
  description:
    "Choose how you learn: work through the written modules at your own pace, or watch an instructor teach the same material on demand.",
};

// This is the landing page for learning, and its whole job is the choice
// between the two formats. It used to be a copy of the project-42.dev home
// page, hero and all, so arriving here from the main site showed you the page
// you had just left and the real index sat a second click away at /learn.
//
// The two formats are two renderings of ONE course (ADR-0020), not two
// catalogues, so the counts below are read from the same catalog either card
// sends you to. Nothing here should ever describe them as separate curricula.
export default function Home() {
  const pathCount = starterCatalog.paths.length;
  const moduleCount = starterCatalog.modules.length;
  const minutes = starterCatalog.modules.reduce(
    (total, module) => total + (module.estimatedMinutes ?? 0),
    0,
  );

  return (
    <main>
      <section className="section shell" aria-labelledby="landing-title">
        <div className="section-heading">
          <p className="eyebrow">Project 42 Academy</p>
          <h1 id="landing-title">Two ways to take the same course.</h1>
          <p>
            The same modules, the same knowledge checks, the same sources, and one
            record of what you have finished. Read it, or watch it taught. Switch
            whenever you like: your progress does not care which one you picked.
          </p>
        </div>
      </section>

      <ProgressSnapshot />

      <section className="section shell" aria-label="Choose how you want to learn">
        <div className="pillar-grid">
          <article className="pillar-card pillar-selfpaced">
            <div className="card-index">Self-paced / Available now</div>
            <h3>Read it at your own pace.</h3>
            <p>
              Short written modules in plain language, worked examples you can copy,
              and a knowledge check at the end of every one. Stop and start whenever
              you want.
            </p>
            <ul>
              <li>
                {pathCount} learning paths, {moduleCount} assessed modules
              </li>
              <li>About {minutes} minutes of material</li>
              <li>Every claim carries its source and a verification date</li>
              <li>Progress stays on this device in the current release</li>
            </ul>
            <Link href="/learn">Browse learning paths →</Link>
          </article>

          <article className="pillar-card pillar-ondemand">
            <div className="card-index">Instructor-led / Preview</div>
            <h3>Watch it taught.</h3>
            <p>
              The same material presented as a lesson rather than a page. A virtual
              instructor works through each module on video, with captions and a
              full transcript.
            </p>
            <ul>
              <li>Captions embedded in the video</li>
              <li>Full transcript you can search and copy</li>
              <li>The same knowledge check at the end</li>
              <li>Nothing is generated while you watch</li>
            </ul>
            <Link href="/ondemand">See the on-demand classroom →</Link>
          </article>
        </div>
      </section>
    </main>
  );
}
