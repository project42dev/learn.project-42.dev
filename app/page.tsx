import Link from "next/link";
import { starterCatalog } from "@project42/platform";
import { diagramCatalog } from "./lib/diagrams";

export default function Home() {
  const beginnerPath = starterCatalog.paths.find((path) => path.id === "ai-foundations");
  const practitionerPath = starterCatalog.paths.find(
    (path) => path.id === "providers-in-practice",
  );

  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">Free, open AI learning</p>
          <h1>
            Start curious.
            <span>Become capable.</span>
          </h1>
          <p className="hero-lede">
            Project 42 makes artificial intelligence understandable from your first
            question to your first reliable agent. Learn at your pace, check what you
            know, and keep a record of your progress.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href="/learn/ai-foundations">
              Start AI Foundations
            </Link>
            <Link className="button button-secondary" href="/guide">
              Browse the field guide
            </Link>
            <Link className="button button-secondary" href="/diagrams">
              See visual guides
            </Link>
          </div>
          <ul className="trust-list" aria-label="Project 42 promises">
            <li>Beginner-friendly</li>
            <li>Provider-neutral</li>
            <li>Evidence-linked</li>
            <li>Open source</li>
          </ul>
        </div>
        <div className="hero-map" aria-label="Learning journey preview">
          <div className="map-orbit map-orbit-one" />
          <div className="map-orbit map-orbit-two" />
          <div className="map-node map-node-start">
            <span>01</span>
            Understand
          </div>
          <div className="map-node map-node-build">
            <span>02</span>
            Practice
          </div>
          <div className="map-node map-node-prove">
            <span>03</span>
            Prove it
          </div>
          <div className="map-center">
            <span className="map-mark">42</span>
            <small>Your path</small>
          </div>
        </div>
      </section>

      <section className="progress-strip shell" aria-label="Project 42 destinations">
        <div>
          <strong>Learn</strong>
          <span>Courses, knowledge checks, badges, and your transcript</span>
        </div>
        <div>
          <strong>Field Guide</strong>
          <span>Practical answers, workflows, comparisons, and visual guides</span>
        </div>
        <Link className="button button-secondary" href="/account">
          Sign in to track progress
        </Link>
      </section>

      <section className="section shell" aria-labelledby="two-ways">
        <div className="section-heading">
          <p className="eyebrow">Two ways to grow</p>
          <h2 id="two-ways">Learn deeply. Find answers quickly.</h2>
          <p>
            Follow a guided path when you want mastery, or jump into the field guide
            when you need something useful right now.
          </p>
        </div>
        <div className="pillar-grid">
          <article className="pillar-card pillar-learn">
            <div className="card-index">Academy / 01</div>
            <h3>Self-paced learning</h3>
            <p>
              Short modules, plain language, practical examples, and a knowledge check
              at the end of every major section.
            </p>
            <ul>
              <li>{starterCatalog.paths.length} starter paths</li>
              <li>{starterCatalog.modules.length} assessed modules</li>
              <li>Account-backed progress and transcript</li>
            </ul>
            <Link href="/learn">Explore learning paths →</Link>
          </article>
          <article className="pillar-card pillar-reference">
            <div className="card-index">Field guide / 02</div>
            <h3>Resources for the work</h3>
            <p>
              Checklists, explainers, provider maps, and decision tools with visible
              verification dates and sources.
            </p>
            <ul>
              <li>{starterCatalog.resources.length} starter resources</li>
              <li>{diagramCatalog.length} source-first visual guides</li>
              <li>Anthropic, OpenAI, and Google coverage</li>
              <li>Provider-neutral core concepts</li>
            </ul>
            <Link href="/guide">Open the Field Guide →</Link>
          </article>
        </div>
      </section>

      <section className="section shell" aria-labelledby="featured-paths">
        <div className="section-heading section-heading-inline">
          <div>
            <p className="eyebrow">Choose your starting point</p>
            <h2 id="featured-paths">Paths with a destination</h2>
          </div>
          <Link className="text-link" href="/learn">
            View all paths
          </Link>
        </div>
        <div className="path-grid">
          {[beginnerPath, practitionerPath].filter(Boolean).map((path, index) => (
            <article className="path-card" key={path!.id}>
              <div className="path-card-top">
                <span className="level-pill">{path!.level}</span>
                <span>{path!.moduleIds.length} modules</span>
              </div>
              <div className="path-number">0{index + 1}</div>
              <h3>{path!.title}</h3>
              <p>{path!.summary}</p>
              <Link href={`/learn/${path!.id}`}>
                See this path →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section shell provider-section" aria-labelledby="provider-title">
        <div>
          <p className="eyebrow">No single-provider tunnel vision</p>
          <h2 id="provider-title">Learn the ideas that transfer.</h2>
        </div>
        <div className="provider-stack">
          {starterCatalog.providers.map((provider) => (
            <div className="provider-row" key={provider.id}>
              <span className={`provider-dot provider-${provider.id}`} />
              <strong>{provider.name}</strong>
              <p>{provider.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section shell self-host-section" aria-labelledby="self-host-title" style={{ background: "rgba(255, 255, 255, 0.03)", padding: "2.5rem 2rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)", margin: "3rem auto" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <p className="eyebrow" style={{ color: "#38bdf8" }}>Open Source & Self-Hosting</p>
          <h2 id="self-host-title" style={{ fontSize: "2rem", marginBottom: "1rem" }}>Run Project 42 Inside Your Organization</h2>
          <p style={{ fontSize: "1.1rem", color: "#94a3b8", marginBottom: "1.5rem", lineHeight: "1.6" }}>
            Deploy the complete, host-agnostic Project 42 platform in your own cloud, air-gapped intranet, or local server. Customize with your organization&apos;s branding, overlay internal courses, and sync with upstream curriculum updates.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            <a className="button button-primary" href="https://github.com/project42dev/project42-platform" target="_blank" rel="noopener noreferrer">
              View Open-Source Platform on GitHub →
            </a>
            <a className="button button-secondary" href="https://github.com/project42dev/project42-platform/blob/main/docs/self-hosting/portal-and-theming.md" target="_blank" rel="noopener noreferrer">
              Read Self-Hosting Runbook
            </a>
          </div>
        </div>
      </section>

      <section className="cta shell">
        <p className="eyebrow">Your first checkpoint is 12 minutes away</p>
        <h2>Understanding beats intimidation.</h2>
        <p>Start with one module. Your approved account keeps your place across devices.</p>
        <Link
          className="button button-primary"
          href="/learn/ai-foundations/what-ai-does"
        >
          Begin the first module
        </Link>
      </section>
    </main>
  );
}
