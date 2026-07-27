import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function SiteHeader() {
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
          <Link href="/learn">Learn</Link>
          <a href="https://guide.project-42.dev">Field Guide</a>
          <Link href="/diagrams">Visual guides</Link>
          <Link href="/profile">My progress</Link>
          <Link href="/account">Account</Link>
          <a href="https://project-42.dev/about">About</a>
        </nav>
        <Link className="header-action" href="/learn/ai-foundations">
          Start learning
        </Link>
      </div>
    </header>
  );
}
