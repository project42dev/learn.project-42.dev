import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { crossDomainHref } from "../lib/subdomainLinks";

export async function SiteHeader() {
  const [learnHref, diagramsHref, profileHref, accountHref, startHref] =
    await Promise.all([
      // The landing page, not /learn. Off-site headers link to the bare
      // origin, so pointing this at /learn made the same nav item land on two
      // different URLs depending on where it was clicked from.
      crossDomainHref("/"),
      crossDomainHref("/diagrams"),
      crossDomainHref("/profile"),
      crossDomainHref("/account"),
      crossDomainHref("/learn/ai-foundations"),
    ]);
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <a className="brand" href="https://project-42.dev" aria-label="Project 42 home">
          <BrandMark />
          <span>
            Project <strong>42</strong>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <Link href={learnHref}>Learn</Link>
          <a href="https://guide.project-42.dev">Field Guide</a>
          <Link href={diagramsHref}>Visual guides</Link>
          <Link href={profileHref}>My progress</Link>
          <Link href={accountHref}>Account</Link>
          <a href="https://project-42.dev/about">About</a>
        </nav>
        <Link className="header-action" href={startHref}>
          Start learning
        </Link>
      </div>
    </header>
  );
}
