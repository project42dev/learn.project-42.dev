"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { HeaderMenu, MenuChevron } from "./HeaderMenu";
import { ProfileMenu } from "./ProfileMenu";
import { AdminHeader } from "../admin/components/AdminHeader";

export function SiteHeader() {
  const pathname = usePathname();

  // If in Admin Console, render dedicated AdminHeader
  if (pathname && pathname.startsWith("/admin")) {
    return <AdminHeader />;
  }

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Project 42 home">
          <BrandMark />
          <span>
            Project <strong>42</strong>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/learn">Learn</Link>
          <Link href="/guide">Field Guide</Link>
          <Link href="/guide/diagrams">Visual guides</Link>
          <HeaderMenu
            label={
              <>
                About
                <MenuChevron />
              </>
            }
          >
            <ul className="header-menu-list">
              <li>
                <Link href="/about">About Project 42</Link>
              </li>
              <li>
                <Link href="/platform">Open-source platform &amp; docs</Link>
              </li>
              <li>
                <a href="https://gallery.project-42.dev" target="_blank" rel="noopener noreferrer">Theme Gallery &amp; Studio</a>
              </li>
              <li>
                <Link href="/releases">Release notes</Link>
              </li>
              <li>
                <Link href="/roadmap">Roadmap</Link>
              </li>
              <li>
                <Link href="/support">Support &amp; Content Requests</Link>
              </li>
              <li>
                <Link href="/legal-transparency">
                  Legal and transparency
                </Link>
              </li>
            </ul>
          </HeaderMenu>
        </nav>
        <div className="header-actions">
          <Link className="header-action" href="/learn">
            Start learning
          </Link>
          <ProfileMenu
            accountHref="/account"
            learnerDataHref="/learner-data"
            profileHref="/profile"
          />
        </div>
      </div>
    </header>
  );
}
