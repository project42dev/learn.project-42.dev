import type { Metadata } from "next";
import Link from "next/link";
import { starterCatalog } from "@project42/platform";

export const metadata: Metadata = {
  title: "Learning paths",
  description: "Choose a guided Project 42 learning path.",
};

export default function LearnPage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero">
        <p className="eyebrow">Project 42 Academy</p>
        <h1>Learning paths with a clear next step.</h1>
        <p>
          Start from first principles or jump into practical provider decisions. Every
          module ends with a short knowledge check.
        </p>
      </header>

      {/*
        Two ways to take the same course, not two courses. Both sections are
        rendered from one content item, so a correction to the material reaches
        the reader and the viewer together. A parallel catalogue would drift, and
        when a cited source changed there would be two copies of the same claim
        to reconcile.
      */}
      <section aria-labelledby="self-paced-heading">
        <h2 id="self-paced-heading" className="section-heading">
          Self-paced
        </h2>
        <p className="section-intro">
          Read at your own speed, work through the exercises, and finish each module
          with a knowledge check. Available now.
        </p>
      </section>

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

      <section className="instructor-led-teaser" aria-labelledby="instructor-led-heading">
        <h2 id="instructor-led-heading" className="section-heading">
          Instructor-led, on demand <span className="level-pill">Coming soon</span>
        </h2>
        <p>
          The same material, taught rather than read. A virtual instructor works
          through each module on video, with captions and a full transcript, so you
          can watch a lesson instead of reading one.
        </p>
        <p>
          <strong>Same course, same knowledge checks, same sources.</strong> Every
          lesson is built from the identical content as the self-paced version, so a
          correction reaches both at once and the two can never tell you different
          things.
        </p>
        <p className="instructor-led-note">
          Nothing is generated while you watch. Every lesson is produced and reviewed
          before it is published, then served as a fixed package.
        </p>

        {/*
          A preview of the shape, not a mock of a finished lesson. It shows the
          parts a learner gets and deliberately does not show a presenter: the
          avatar is chosen but nothing has been rendered, and a fake still would
          promise a specific face we have not committed to on this page.
        */}
        {/*
          A real render, not a mock. The opening of the Agents, Tools and
          Guardrails module, spoken from that module's own class script. It is
          labelled a preview because it is the first 87 seconds of a 17-segment
          lesson, and because the presenter is not the final choice: the three
          characters originally picked are not supported by the batch API we
          render with.
        */}
        <figure className="lesson-preview" aria-label="Preview of an instructor-led lesson">
          <video
            className="lesson-preview-video"
            controls
            preload="metadata"
            playsInline
            aria-label="Instructor-led preview: Agents, Tools, and Guardrails, opening"
          >
            <source src="/preview/agents-and-guardrails-preview.mp4" type="video/mp4" />
            Your browser cannot play this video. The written module covers the same
            material.
          </video>
          <p className="lesson-preview-strap">
            <strong>Agents, Tools, and Guardrails</strong> &middot; opening 87 seconds
            &middot; spoken from the module&rsquo;s own class script
          </p>
          <ul className="lesson-preview-parts">
            <li>Captions, embedded in the video</li>
            <li>Full transcript you can search and copy</li>
            <li>The same diagrams as the written module</li>
            <li>The same knowledge check at the end</li>
          </ul>
          <figcaption>
            Each lesson is built from the same content as its written module, so the
            two can never tell you different things. The presenter shown here is a
            work in progress and is not the final choice.
          </figcaption>
        </figure>
      </section>
    </main>
  );
}
