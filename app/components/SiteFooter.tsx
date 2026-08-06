import Link from "next/link";
import { siteFacts } from "../lib/siteFacts";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <div className="brand footer-brand">
            <BrandMark />
            <span>Project 42</span>
          </div>
          <p>Free, open AI learning for curious people and capable teams.</p>
        </div>
        <div>
          <strong>Explore</strong>
          <Link href="/learn">Learning paths</Link>
          <a href="https://guide.project-42.dev">Field Guide</a>
          <Link href="/diagrams">Visual guides</Link>
          <Link href="/profile">Your transcript</Link>
          <Link href="/learner-data">Learner data</Link>
        </div>
        <div>
          <strong>Project</strong>
          <a href="https://project-42.dev/about">About</a>
          <a href="https://project-42.dev/legal-transparency">
            Legal &amp; Transparency
          </a>
          <a href={siteFacts.repositories.roadmap}>Public roadmap and issues</a>
          <a href={siteFacts.repositories.platform}>Open-source platform</a>
          <a href={siteFacts.repositories.site}>Learn site source</a>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>
          Site v{siteFacts.siteVersion} · Platform v{siteFacts.platformVersion} · Content v
          {siteFacts.contentVersion}
        </span>
        <span>
          <a href="https://project-42.dev/legal-transparency">
            Legal &amp; Transparency
          </a>
          {" · "}
          <a href={siteFacts.licenses.software.url}>Code {siteFacts.licenses.software.spdx}</a>
          {" · "}
          <a href={siteFacts.licenses.curriculum.url}>
            Curriculum {siteFacts.licenses.curriculum.spdx}
          </a>
        </span>
      </div>
    </footer>
  );
}
