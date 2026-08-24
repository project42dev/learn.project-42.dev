"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { HeaderMenu, MenuChevron } from "./HeaderMenu";
import { ProfileMenu } from "./ProfileMenu";
import { AdminHeader } from "../admin/components/AdminHeader";
import { clientCrossDomainHref } from "../lib/subdomainLinks";

export function SiteHeader() {
  const pathname = usePathname();

  // If in Admin Console, render dedicated AdminHeader
  if (pathname && pathname.startsWith("/admin")) {
    return <AdminHeader />;
  }

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
          <Link href="/">Learn</Link>
          <a href="https://guide.project-42.dev">Field Guide</a>
          <Link href="/diagrams">Visual guides</Link>
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
                <a href="https://project-42.dev/about">About Project 42</a>
              </li>
              <li>
                <a href="https://project-42.dev/platform">Open-source platform &amp; docs</a>
              </li>
              <li>
                <a href="https://github.com/project42dev/project42-gallery" target="_blank" rel="noopener noreferrer">Theme Gallery &amp; Studio</a>
              </li>
              <li>
                <a href="https://project-42.dev/releases">Release notes</a>
              </li>
              <li>
                <a href="https://project-42.dev/roadmap">Roadmap</a>
              </li>
              <li>
                <a href="https://project-42.dev/support">Support &amp; Content Requests</a>
              </li>
              <li>
                <a href="https://project-42.dev/legal-transparency">
                  Legal and transparency
                </a>
              </li>
            </ul>
          </HeaderMenu>
        </nav>
        <div className="header-actions">
          <Link className="header-action" href="/">
            Start learning
          </Link>
          <ProfileMenu
            accountHref={clientCrossDomainHref("/account")}
            learnerDataHref={clientCrossDomainHref("/learner-data")}
            profileHref={clientCrossDomainHref("/profile")}
          />
        </div>
      </div>
    </header>
  );
}
