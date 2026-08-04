import type { Metadata } from "next";
import Link from "next/link";
import {
  getClassScriptPackage,
  getLearningModule,
  starterCatalog,
} from "@project42/platform";
import {
  formatLessonLength,
  getInstructorRendering,
  instructorRenderings,
} from "../lib/instructorMedia";

export const metadata: Metadata = {
  title: "On-demand classroom",
  description:
    "Instructor-led lessons on demand: the same Project 42 modules, taught on video with captions and a full transcript.",
};

// The instructor-led catalogue. It is a second RENDERING of the same modules
// the self-paced side serves (ADR-0020), not a second curriculum, so every row
// here resolves to a module that already exists at /learn and a lesson without
// a film links to the written one rather than to nothing.
export default function OnDemandPage() {
  const pathsWithScripts = starterCatalog.paths
    .map((path) => {
      const lessons = path.moduleIds.flatMap((moduleId) => {
        const classScript = getClassScriptPackage(moduleId);
        const lessonModule = getLearningModule(moduleId);
        if (!classScript || !lessonModule) return [];
        return [
          {
            moduleId,
            title: lessonModule.title,
            summary: lessonModule.summary,
            length: formatLessonLength(classScript.plannedDurationSeconds),
            rendering: getInstructorRendering(moduleId),
          },
        ];
      });
      return { path, lessons };
    })
    .filter((entry) => entry.lessons.length > 0);

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

      {pathsWithScripts.map(({ path, lessons }) => (
        <section
          aria-labelledby={`ondemand-${path.id}`}
          className="ondemand-path"
          key={path.id}
        >
          <div className="ondemand-path-head">
            <h2 id={`ondemand-${path.id}`}>{path.title}</h2>
            <span className="level-pill">{path.level}</span>
            <Link href={`/learn/${path.id}`}>Read this path →</Link>
          </div>
          <ul className="ondemand-lessons">
            {lessons.map((lesson) => (
              <li
                className={
                  lesson.rendering ? "ondemand-lesson is-filmed" : "ondemand-lesson"
                }
                key={lesson.moduleId}
              >
                <div className="ondemand-lesson-main">
                  <h3>
                    {lesson.rendering ? (
                      <Link href={`/ondemand/${path.id}/${lesson.moduleId}`}>
                        {lesson.title}
                      </Link>
                    ) : (
                      lesson.title
                    )}
                  </h3>
                  <p>{lesson.summary}</p>
                </div>
                <div className="ondemand-lesson-meta">
                  <span className="ondemand-lesson-length">{lesson.length}</span>
                  {lesson.rendering ? (
                    <Link
                      className="button button-primary"
                      href={`/ondemand/${path.id}/${lesson.moduleId}`}
                    >
                      Watch the lesson
                    </Link>
                  ) : (
                    <Link
                      className="button button-secondary"
                      href={`/learn/${path.id}/${lesson.moduleId}`}
                    >
                      Read it now
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="instructor-led-note">
        Nothing is generated while you watch. Every lesson is produced and reviewed
        before it is published, then served as a fixed package.
      </p>
    </main>
  );
}
