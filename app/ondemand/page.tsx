import type { Metadata } from "next";
import Link from "next/link";
import {
  getClassScriptPackage,
  getLearningModule,
  starterCatalog,
} from "@project42/platform";
import { getInstructorRendering, instructorRenderings } from "../lib/instructorMedia";

export const metadata: Metadata = {
  title: "On-demand classroom",
  description:
    "Instructor-led lessons on demand: the same Project 42 modules, taught on video with captions and a full transcript.",
};

// The instructor-led catalogue. It uses the same learning-path-row block as
// /learn on purpose: this is the same catalogue in a second rendering
// (ADR-0020), so presenting it as a different kind of list made two views of
// one thing look like two products. A path with no film yet still links to
// where its material can be finished today.
export default function OnDemandPage() {
  const pathsWithScripts = starterCatalog.paths.flatMap((path) => {
    const lessons = path.moduleIds.flatMap((moduleId) => {
      const classScript = getClassScriptPackage(moduleId);
      const lessonModule = getLearningModule(moduleId);
      if (!classScript || !lessonModule) return [];
      return [
        {
          moduleId,
          title: lessonModule.title,
          seconds: classScript.plannedDurationSeconds,
          rendering: getInstructorRendering(moduleId),
        },
      ];
    });
    if (lessons.length === 0) return [];
    return [
      {
        path,
        lessons,
        minutes: Math.round(
          lessons.reduce((total, lesson) => total + lesson.seconds, 0) / 60,
        ),
        filmed: lessons.find((lesson) => lesson.rendering),
      },
    ];
  });

  const scriptedCount = pathsWithScripts.reduce(
    (total, entry) => total + entry.lessons.length,
    0,
  );
  const filmedCount = instructorRenderings.length;

  return (
    <main className="page-shell shell">
      <header className="page-hero">
        <p className="eyebrow">
          Instructor-led <span className="level-pill">Preview</span>
        </p>
        <h1>The classroom, on demand.</h1>
        <p>
          The same material, taught rather than read. A virtual instructor works
          through each module on video, with captions and a full transcript, so you
          can watch a lesson instead of reading one. Same course, same knowledge
          checks, same sources, and one record either way.
        </p>
      </header>

      {/*
        Counting out loud, because the honest number is small. Saying "40
        lessons" when one has been filmed would be the same silent-success
        failure this project keeps finding in its own checks: a figure that
        looks healthy and measures the wrong thing.
      */}
      <p className="ondemand-status">
        <strong>
          {filmedCount} lesson{filmedCount === 1 ? "" : "s"} filmed so far
        </strong>{" "}
        out of {scriptedCount} written for the classroom. Every module is already
        available to read, and anything you finish now carries straight over when
        its lesson is published.
      </p>

      <div className="learning-path-list">
        {pathsWithScripts.map(({ path, lessons, minutes, filmed }, index) => (
          <article className="learning-path-row" key={path.id}>
            <div className="learning-path-number">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div>
              <div className="path-card-top">
                <span className="level-pill">{path.level}</span>
                <span>
                  {lessons.length} lessons · {minutes} min
                </span>
              </div>
              <h2>{path.title}</h2>
              <p>{path.summary}</p>
              <small>For {path.audience.toLowerCase()}</small>
            </div>
            <div className="learning-path-modules" aria-label={`${path.title} lessons`}>
              {lessons.map((lesson, lessonIndex) => (
                <span
                  className={lesson.rendering ? "lesson-filmed" : undefined}
                  key={lesson.moduleId}
                >
                  {lessonIndex + 1}. {lesson.title}
                  {lesson.rendering ? <em>Filmed</em> : null}
                </span>
              ))}
            </div>
            {filmed ? (
              <Link
                className="button button-primary"
                href={`/ondemand/${path.id}/${filmed.moduleId}`}
              >
                Watch the lesson
              </Link>
            ) : (
              <Link className="button button-secondary" href={`/learn/${path.id}`}>
                Read this path
              </Link>
            )}
          </article>
        ))}
      </div>

      <p className="learn-format-switch">
        Nothing is generated while you watch. Every lesson is produced and reviewed
        before it is published, then served as a fixed package.{" "}
        <Link href="/learn">Browse the written paths →</Link>
      </p>
    </main>
  );
}
