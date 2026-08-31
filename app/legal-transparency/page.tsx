import type { Metadata } from "next";
import { siteFacts } from "../lib/siteFacts";

const legalVersion = "0.1-review-draft";

export const metadata: Metadata = {
  title: "Legal & Transparency",
  description:
    "How Project 42 is operated, licensed, built with AI assistance, governed by people, and limited as a free educational service.",
};

export default function LegalTransparencyPage() {
  return (
    <main className="page-shell shell legal-page">
      <header className="page-hero legal-hero">
        <p className="eyebrow">Legal &amp; Transparency</p>
        <h1>Open on purpose. Honest about the limits.</h1>
        <p>
          Project 42 is a free, open-source learning project about AI. This page
          explains who is responsible for the hosted service, how AI contributes,
          what you may reuse, what can go wrong, and where to exercise your choices.
        </p>
      </header>

      <nav aria-labelledby="legal-contents-title" className="legal-toc">
        <div>
          <p className="eyebrow">Page guide</p>
          <h2 id="legal-contents-title">On this page</h2>
        </div>
        <ol>
          <li>
            <a href="#legal-review-title">Review status</a>
          </li>
          <li>
            <a href="#people-title">People and responsibility</a>
          </li>
          <li>
            <a href="#licenses-title">Open-source and reuse</a>
          </li>
          <li>
            <a href="#service-title">Service expectations</a>
          </li>
          <li>
            <a href="#third-party-title">External services</a>
          </li>
          <li>
            <a href="#account-title">Accounts, privacy, and choice</a>
          </li>
          <li>
            <a href="#acceptable-use-title">Acceptable use</a>
          </li>
          <li>
            <a href="#warranty-title">Warranty and liability</a>
          </li>
          <li>
            <a href="#history-title">Version and sources</a>
          </li>
        </ol>
      </nav>

      <aside
        aria-labelledby="legal-review-title"
        className="legal-review-notice"
        role="note"
      >
        <div>
          <p className="eyebrow">Review status</p>
          <h2 id="legal-review-title" tabIndex={-1}>
            Owner-accepted review draft
          </h2>
          <p>
            This wording is not yet effective legal terms. The Project 42 owner
            accepted this review draft on July 28, 2026. Qualified legal review, the
            final effective version and date, and the recurring review date remain
            pending.
          </p>
        </div>
        <dl>
          <div>
            <dt>Draft version</dt>
            <dd>
              {legalVersion}
              <br />
              <span>Owner accepted July 28, 2026</span>
            </dd>
          </div>
          <div>
            <dt>Effective date</dt>
            <dd>Pending qualified legal review</dd>
          </div>
          <div>
            <dt>Publication authority</dt>
            <dd>Human approval only</dd>
          </div>
        </dl>
      </aside>

      <section className="legal-section" aria-labelledby="people-title">
        <div className="policy-section-heading">
          <p className="eyebrow">People and responsibility</p>
          <h2 id="people-title" tabIndex={-1}>
            AI helps make Project 42. People govern it.
          </h2>
          <p>
            Project 42 was created by Kristopher Turner. The hosted Project 42
            service is operated by Hybrid Cloud Solutions LLC. These statements
            remain subject to the owner and counsel verification gate identified
            above.
          </p>
        </div>
        <div className="policy-fact-grid">
          <article>
            <span>01</span>
            <h3>AI-assisted production</h3>
            <p>
              AI systems substantially assist research, drafting, editing,
              coding, test creation, accessibility review, and factual review.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Independent checks</h3>
            <p>
              Different model families may serve research, writing, verification,
              and adversarial-review roles. Automated checks reject unsupported,
              stale, inaccessible, or internally inconsistent candidates.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Human publication authority</h3>
            <p>
              AI cannot approve or publish Project 42 content by itself. People set
              policy, review evidence, resolve disagreements, approve releases, and
              remain accountable for the hosted service.
            </p>
          </article>
        </div>
        <p className="legal-caution">
          Multi-model and human review reduce risk; they do not guarantee that every
          statement is accurate, complete, current, or appropriate for your situation.
          See{" "}
          <a href="https://github.com/project42dev/project-42.dev/blob/main/docs/ai-content-practices.md">
            AI content practices
          </a>{" "}
          for the human-gate, review, publish-time, and source-tracking detail
          behind these claims, including what is not yet automated.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="licenses-title">
        <div className="policy-section-heading">
          <p className="eyebrow">Open-source and reuse</p>
          <h2 id="licenses-title" tabIndex={-1}>
            Free to use does not mean ownerless.
          </h2>
          <p>
            Each kind of material keeps its own license and ownership boundary.
            A repository license controls the files it covers; it does not relicense
            third-party services, source material, trademarks, or learner records.
          </p>
        </div>
        <div className="legal-license-grid">
          <article>
            <h3>Software</h3>
            <p>
              Project 42 application code is offered under the{" "}
              <a href="https://www.apache.org/licenses/LICENSE-2.0">
                Apache License 2.0
              </a>
              . Reuse must follow that license, including applicable notice and
              attribution requirements.
            </p>
          </article>
          <article>
            <h3>Curriculum and guides</h3>
            <p>
              Project 42 curriculum and original learning material are offered under{" "}
              <a href="https://creativecommons.org/licenses/by/4.0/">
                Creative Commons Attribution 4.0 International
              </a>
              . Give appropriate credit, link the license, and indicate changes.
            </p>
          </article>
          <article>
            <h3>Third-party material</h3>
            <p>
              Provider names, product names, quotations, linked documentation,
              screenshots, and other third-party material remain subject to their
              owners&apos; rights and terms. Citation or linking does not transfer
              ownership or imply endorsement.
            </p>
          </article>
          <article>
            <h3>Marks and private records</h3>
            <p>
              Open-source licenses do not grant trademark rights. Accounts, learner
              records, private operations, credentials, and personal data are not
              open-licensed content.
            </p>
          </article>
        </div>
        <p className="legal-caution">
          Draft copyright notice for review: © 2026 Hybrid Cloud Solutions LLC;
          Project 42 created by Kristopher Turner. The final claimant and wording
          require owner and qualified legal verification.{" "}
          Any copyright notice applies only to protectable human-authored expression
          and creative human selection, coordination, arrangement, or modification.
          Project 42 does not claim copyright in material that is purely AI-generated
          and not protectable under applicable law.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="service-title">
        <div className="policy-section-heading">
          <p className="eyebrow">Service expectations</p>
          <h2 id="service-title" tabIndex={-1}>
            Useful, not infallible or uninterrupted.
          </h2>
          <p>
            Project 42 is an educational resource and experimental open-source
            service. Use it as a starting point, verify important decisions against
            authoritative sources, and obtain qualified advice when the stakes
            require it.
          </p>
        </div>
        <div className="policy-two-column">
          <article>
            <h3>Content and professional decisions</h3>
            <ul>
              <li>Content may contain errors, omissions, outdated claims, or broken links.</li>
              <li>
                Examples and assessments are educational, not legal, medical,
                financial, security, employment, or other professional advice.
              </li>
              <li>
                A score, badge, transcript, or mastery record is Project 42 evidence,
                not professional certification or a guarantee of performance.
              </li>
              <li>You remain responsible for how you use commands, code, models, and tools.</li>
            </ul>
          </article>
          <article>
            <h3>Availability and recovery</h3>
            <ul>
              <li>The sites, identity service, APIs, and records may be unavailable.</li>
              <li>Sign-in providers may change, suspend, or lose access to an identity.</li>
              <li>Accounts and progress can be delayed, corrupted, or lost despite backups.</li>
              <li>Recovery objectives are targets, not promises of perfect restoration.</li>
              <li>Export important learner evidence and retain your own copy.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="legal-section" aria-labelledby="third-party-title">
        <div className="policy-section-heading">
          <p className="eyebrow">External services</p>
          <h2 id="third-party-title" tabIndex={-1}>
            Their services, their terms.
          </h2>
          <p>
            Project 42 relies on and links to services outside its control, including
            identity, hosting, infrastructure, model, documentation, source-control,
            and content providers.
          </p>
        </div>
        <div className="legal-link-grid">
          <article>
            <h3>Identity and hosting</h3>
            <p>
              The hosted service uses Microsoft Entra External ID, GitHub Pages, and
              Cloudflare services. Their availability and processing are governed by
              their respective terms and notices.
            </p>
          </article>
          <article>
            <h3>Models and providers</h3>
            <p>
              Project 42 is provider-neutral. References to Anthropic, OpenAI,
              Google, Microsoft, xAI, DeepSeek, open-weight projects, or others do not
              imply sponsorship, endorsement, or a service guarantee.
            </p>
          </article>
          <article>
            <h3>External links</h3>
            <p>
              A link records provenance or helps a learner continue research. Project
              42 does not control the destination, its security, its accuracy, or
              later changes.
            </p>
          </article>
        </div>
      </section>

      <section className="legal-section" aria-labelledby="account-title">
        <div className="policy-section-heading">
          <p className="eyebrow">Accounts, privacy, and choice</p>
          <h2 id="account-title" tabIndex={-1}>
            Consent is a control, not a buried checkbox.
          </h2>
          <p>
            Acceptance of legal information does not replace a separate consent
            decision where consent is required. Optional consent is not preselected
            or bundled with access to public learning material.
          </p>
        </div>
        <div className="legal-destination-grid">
          <a href="https://learn.project-42.dev/learner-data">
            <strong>Learner data</strong>
            <span>Storage, retention, consent, export, deletion, and recovery</span>
          </a>
          <a href="https://learn.project-42.dev/account">
            <strong>Account controls</strong>
            <span>Sign-in status, consent history, export, and deletion requests</span>
          </a>
          <a href="https://github.com/project42dev/project42-platform/security/policy">
            <strong>Security reporting</strong>
            <span>Report a vulnerability through the private security process</span>
          </a>
          <a href={siteFacts.repositories.issues}>
            <strong>Roadmap and support</strong>
            <span>Follow delivery or report a non-sensitive product issue</span>
          </a>
        </div>
      </section>

      <section
        className="legal-section"
        aria-labelledby="acceptable-use-title"
        id="acceptable-use"
      >
        <div className="policy-section-heading">
          <p className="eyebrow">Acceptable use</p>
          <h2 id="acceptable-use-title" tabIndex={-1}>
            Learn and build without harming others.
          </h2>
          <p>
            Do not use Project 42 to violate law, invade privacy, bypass access
            controls, distribute malware, harass people, misrepresent identity or
            credentials, disrupt the service, or infringe another person&apos;s rights.
            Repository contribution rules and third-party provider terms continue to
            apply.
          </p>
        </div>
      </section>

      <section className="legal-section" aria-labelledby="warranty-title">
        <div className="policy-section-heading">
          <p className="eyebrow">Warranty and liability</p>
          <h2 id="warranty-title" tabIndex={-1}>
            The legal limit still has limits.
          </h2>
          <p>
            To the maximum extent permitted by applicable law, Project 42 software,
            curriculum, hosted features, and related materials are provided
            &quot;as is&quot; and &quot;as available,&quot; without warranties of
            accuracy, availability, fitness for a particular purpose,
            non-infringement, or uninterrupted or error-free operation.
          </p>
        </div>
        <p className="legal-caution">
          To the maximum extent permitted by applicable law, Kristopher Turner,
          Hybrid Cloud Solutions LLC, Project 42 contributors, and licensors are not
          liable for indirect, incidental, special, consequential, exemplary, or
          similar losses arising from use of or inability to use the service or
          materials. Nothing on this page excludes rights or liability that cannot
          lawfully be excluded. This paragraph requires qualified legal approval
          before it becomes effective.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="history-title">
        <div className="policy-section-heading">
          <p className="eyebrow">Version and sources</p>
          <h2 id="history-title" tabIndex={-1}>
            Reviewable words, not invisible fine print.
          </h2>
        </div>
        <div className="policy-two-column">
          <article>
            <h3>Change history</h3>
            <ul>
              <li>
                <strong>{legalVersion}</strong> · 2026-07-28 · Owner accepted this
                review draft; qualified legal review and an effective version and
                date remain pending.
              </li>
            </ul>
          </article>
          <article>
            <h3>Reference texts</h3>
            <ul>
              <li>
                <a href="https://www.apache.org/licenses/LICENSE-2.0">
                  Apache License 2.0
                </a>
              </li>
              <li>
                <a href="https://creativecommons.org/licenses/by/4.0/legalcode.en">
                  Creative Commons Attribution 4.0 legal code
                </a>
              </li>
              <li>
                <a href="https://www.copyright.gov/ai/">
                  U.S. Copyright Office AI initiative and reports
                </a>
              </li>
              <li>
                <a href="https://www.ftc.gov/policy/advocacy-research/tech-at-ftc/2024/01/ai-companies-uphold-your-privacy-confidentiality-commitments">
                  FTC guidance on AI privacy and transparency commitments
                </a>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
