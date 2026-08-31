"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteFacts } from "../lib/siteFacts";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return (
      <footer className="site-footer">
        <div className="shell footer-bottom">
          <span>Project 42 Admin Portal · fixed operational theme</span>
          <span>
            <a href="https://project-42.dev/support">Support</a>
            {" · "}
            <a href="https://project-42.dev/legal-transparency">
              Legal &amp; Transparency
            </a>
          </span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <div className="brand footer-brand">
            <BrandMark />
            <span>Project 42</span>
          </div>
          <p>
            Free, open AI learning for curious minds and capable teams — built with AI, for humans mastering AI.
          </p>
        </div>
        <div>
          <strong>Explore</strong>
          <Link href="/learn">Learning paths</Link>
          <Link href="/guide">Field Guide</Link>
          <Link href="/guide/diagrams">Visual guides</Link>
          <Link href="/profile">Your transcript</Link>
          <Link href="/learner-data">Learner data</Link>
        </div>
        <div>
          <strong>Project</strong>
          <Link href="/about">About</Link>
          <Link href="/legal-transparency">
            Legal &amp; Transparency
          </Link>
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
          <Link href="/legal-transparency">
            Legal &amp; Transparency
          </Link>
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
