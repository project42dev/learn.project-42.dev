import type { Metadata } from "next";
import Link from "next/link";
import { siteFacts } from "../lib/siteFacts";

export const metadata: Metadata = {
  title: "About",
  description: "Why Project 42 exists and how the open-source learning platform works.",
};

export default function AboutPage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero">
        <p className="eyebrow">About Project 42</p>
        <h1>A free place to become fluent in AI.</h1>
        <p>
          Project 42 is for the person asking their first AI question and the
          practitioner building their hundredth workflow. It pairs a practical field
          guide with learning paths that show what you understand—not just what you
          clicked.
        </p>
      </header>

      <div className="about-grid">
        <section>
          <span className="about-number">01</span>
          <h2>Beginner first, no ceiling</h2>
          <p>
            Every subject begins in plain language, then opens into practical and
            advanced material. Accessible does not mean shallow.
          </p>
        </section>
        <section>
          <span className="about-number">02</span>
          <h2>Concepts before vendors</h2>
          <p>
            We teach ideas that transfer, then explain how Anthropic, OpenAI, Google,
            and other selected providers implement them.
          </p>
        </section>
        <section>
          <span className="about-number">03</span>
          <h2>Evidence before freshness claims</h2>
          <p>
            Volatile material carries sources and verification dates. Future
            automation will propose evidence-backed updates, never publish unchecked
            AI output.
          </p>
        </section>
        <section>
          <span className="about-number">04</span>
          <h2>Hosted now, portable by design</h2>
          <p>
            Project42dev operates the first instance. The platform core and starter
            curriculum are open so teams can eventually run and extend their own.
          </p>
        </section>
        <section>
          <span className="about-number">05</span>
          <h2>One course, two ways to take it</h2>
          <p>
            Every module can be read or watched. An instructor-led lesson is a second
            rendering of the same material, not a second course, so both carry the
            same knowledge check, cite the same sources, and land in the same record.
            A correction reaches the reader and the viewer together.
          </p>
        </section>
      </div>

      <section className="release-facts" aria-labelledby="release-facts-title">
        <div className="release-facts-heading">
          <div>
            <p className="eyebrow">Release facts</p>
            <h2 id="release-facts-title">One source, no mystery numbers.</h2>
          </div>
          <p>
            Versions, catalog totals, provider coverage, licenses, and project links
            come from the tagged software and curriculum packages—not hand-maintained
            marketing copy.
          </p>
        </div>

        <dl className="version-fact-grid" aria-label="Current Project 42 versions">
          <div>
            <dt>Hosted site</dt>
            <dd>v{siteFacts.siteVersion}</dd>
          </div>
          <div>
            <dt>Open-source platform</dt>
            <dd>v{siteFacts.platformVersion}</dd>
          </div>
          <div>
            <dt>Curriculum content</dt>
            <dd>v{siteFacts.contentVersion}</dd>
          </div>
          <div>
            <dt>Learner-data policy</dt>
            <dd>{siteFacts.learnerDataPolicy.policyVersion}</dd>
          </div>
        </dl>

        <dl className="catalog-fact-grid" aria-label="Current curriculum totals">
          <div>
            <dt>Learning paths</dt>
            <dd>{siteFacts.counts.learningPaths}</dd>
          </div>
          <div>
            <dt>Assessed modules</dt>
            <dd>{siteFacts.counts.assessedModules}</dd>
          </div>
          <div>
            <dt>Evidence activities</dt>
            <dd>{siteFacts.counts.evidenceActivities}</dd>
          </div>
          <div>
            <dt>Reviewed questions</dt>
            <dd>{siteFacts.counts.reviewedQuestions}</dd>
          </div>
          {/*
            No "Practical resources" tile. Learn's count is legitimately 0
            because the references moved to guide.project-42.dev, but rendering
            that reads as "Project 42 has no practical resources", which is
            false: there are 83 of them one subdomain over. The fact stays in
            release-facts.json; it just is not a stat this site should display.
          */}
          <div>
            <dt>Provider scopes</dt>
            <dd>{siteFacts.counts.providerScopes}</dd>
          </div>
        </dl>

        <div className="provider-fact-section">
          <div>
            <p className="eyebrow">Coverage without tunnel vision</p>
            <h3>Core ideas first, implementations second.</h3>
            <p className="provider-fact-summary">
              {siteFacts.counts.providerImplementations} named provider implementations
              sit beside a provider-neutral core.
            </p>
          </div>
          <ul aria-label="Current provider coverage">
            {siteFacts.providers.map((provider) => (
              <li key={provider.id}>
                <strong>{provider.name}</strong>
                <span>{provider.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="release-fact-links">
          <a href={siteFacts.licenses.software.url}>
            Software: {siteFacts.licenses.software.label}
          </a>
          <a href={siteFacts.licenses.curriculum.url}>
            Curriculum: {siteFacts.licenses.curriculum.label}
          </a>
          <a href={siteFacts.repositories.site}>Hosted site source</a>
          <a href={siteFacts.repositories.platform}>Reusable platform source</a>
          <a href={siteFacts.repositories.issues}>Report or follow an issue</a>
        </div>
      </section>

      <section className="open-source-banner">
        <div>
          <p className="eyebrow">Built in public</p>
          <h2>Use it. Improve it. Teach with it.</h2>
          <p>
            Software uses {siteFacts.licenses.software.spdx}. Project 42 curriculum uses{" "}
            {siteFacts.licenses.curriculum.spdx}. Private learner data and internal
            operations are never part of the public repositories.
          </p>
        </div>
        <div className="button-row">
          <a
            className="button button-primary"
            href={siteFacts.repositories.platform}
          >
            Platform source
          </a>
          <Link className="button button-secondary" href="/learn">
            Start learning
          </Link>
        </div>
      </section>
    </main>
  );
}
