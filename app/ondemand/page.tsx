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

// The instructor-led catalogue, and it must line up with /learn exactly.
//
// It previously listed only the three paths that have class scripts and
// numbered them 01-03, so "02" meant Providers in Practice on /learn and
// Reliable Agent Workflows here, and five paths simply vanished. Two views of
// ONE catalogue (ADR-0020) cannot disagree about what is in it or what order
// it comes in.
//
// So: every path, in catalog order, carrying its catalog number. A path with
// no class scripts says so and still links to where its material can be read.
export default function OnDemandPage() {
  const paths = starterCatalog.paths.map((path) => {
    const lessons = path.moduleIds.flatMap((moduleId) => {
      const classScript = getClassScriptPackage(moduleId);
      const lessonModule = getLearningModule(moduleId);
      if (!lessonModule) return [];
      return [
        {
          moduleId,
          title: lessonModule.title,
          seconds: classScript?.plannedDurationSeconds ?? 0,
          scripted: Boolean(classScript),
          rendering: getInstructorRendering(moduleId),
        },
      ];
    });
    const scripted = lessons.filter((lesson) => lesson.scripted);
    return {
      path,
      lessons,
      scriptedCount: scripted.length,
      minutes: Math.round(
        scripted.reduce((total, lesson) => total + lesson.seconds, 0) / 60,
      ),
      filmed: lessons.find((lesson) => lesson.rendering),
    };
  });

  const scriptedTotal = paths.reduce((total, entry) => total + entry.scriptedCount, 0);
  const pathsWithScripts = paths.filter((entry) => entry.scriptedCount > 0).length;
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
        Counting out loud, because the honest numbers are small and they are
        three different numbers. Collapsing them into one would be the same
        silent-success failure this project keeps finding in its own checks: a
        figure that looks healthy and measures the wrong thing.
      */}
      <p className="ondemand-status">
        <strong>
          {filmedCount} lesson{filmedCount === 1 ? "" : "s"} filmed so far
        </strong>{" "}
        out of {scriptedTotal} written for the classroom, across{" "}
        {pathsWithScripts} of {starterCatalog.paths.length} paths. The paths and
        their order are the same as the self-paced side. Every module is already
        available to read, and anything you finish now carries straight over when
        its lesson is published.
      </p>

      <div className="learning-path-list">
        {paths.map(({ path, lessons, scriptedCount, minutes, filmed }, index) => (
          <article
            className={
              scriptedCount > 0 ? "learning-path-row" : "learning-path-row is-unwritten"
            }
            key={path.id}
          >
            <div className="learning-path-number">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <div className="path-card-top">
                <span className="level-pill">{path.level}</span>
                <span>
                  {scriptedCount > 0
                    ? `${scriptedCount} lessons · ${minutes} min of video`
                    : `${lessons.length} modules · no lessons written yet`}
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
