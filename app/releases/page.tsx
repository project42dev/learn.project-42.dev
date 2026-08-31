import type { Metadata } from "next";
import releaseNotes from "../../config/release-notes.json";
import { siteFacts } from "../lib/siteFacts";

export const metadata: Metadata = {
  title: "Releases",
  description:
    "What shipped in each Project 42 release, and the current versions of the site, platform, and curriculum.",
};

// Compiled from CHANGELOG.md by scripts/generate-release-notes.mjs. The
// changelog stays the source of truth; a hand-maintained copy here would be a
// second place to update and a second place to be wrong.
export default function ReleasesPage() {
  const releases = releaseNotes.releases;

  return (
    <main className="page-shell shell">
      <header className="page-hero">
        <p className="eyebrow">Releases</p>
        <h1>What shipped, and when.</h1>
        <p>
          Every release of the public site, taken straight from the changelog in
          the repository. The versions below come from the tagged packages
          themselves, not from copy someone remembered to update.
        </p>
      </header>

      <dl className="version-fact-grid" aria-label="Current Project 42 versions">
        <div>
          <dt>Site</dt>
          <dd>v{siteFacts.siteVersion}</dd>
        </div>
        <div>
          <dt>Platform</dt>
          <dd>v{siteFacts.platformVersion}</dd>
        </div>
        <div>
          <dt>Curriculum</dt>
          <dd>v{siteFacts.contentVersion}</dd>
        </div>
        <div>
          <dt>Learner-data policy</dt>
          <dd>{siteFacts.learnerDataPolicy.policyVersion}</dd>
        </div>
      </dl>

      <ol className="release-list">
        {releases.map((release) => (
          <li className="release-entry" key={release.version}>
            <div className="release-entry-head">
              <h2>v{release.version}</h2>
              {release.date ? (
                <time dateTime={release.date}>{release.date}</time>
              ) : (
                <span className="level-pill">Unreleased</span>
              )}
            </div>
            <ul>
              {release.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <p className="page-foot-note">
        Full history, including the platform and curriculum packages, lives with
        the source. <a href={siteFacts.repositories.site}>Site repository</a> ·{" "}
        <a href={siteFacts.repositories.platform}>Platform repository</a>
      </p>
    </main>
  );
}
