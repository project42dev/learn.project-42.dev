import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { HeaderMenu, MenuChevron } from "./HeaderMenu";
import { ProfileMenu } from "./ProfileMenu";
import { siteFacts } from "../lib/siteFacts";
import { crossDomainHref } from "../lib/subdomainLinks";

// Primary navigation is four items: Learn, Field Guide, Visual guides, About.
// Account and progress moved into the profile menu on the right, where a
// learner looks for their own things, which also keeps the nav about the
// material rather than about the session.
export async function SiteHeader() {
  const [
    learnHref,
    diagramsHref,
    aboutHref,
    profileHref,
    accountHref,
    learnerDataHref,
    importProgressHref,
  ] = await Promise.all([
    // The landing page, not /learn. Off-site headers link to the bare origin,
    // so pointing this at /learn made the same nav item land on two different
    // URLs depending on where it was clicked from.
    crossDomainHref("/"),
    crossDomainHref("/diagrams"),
    crossDomainHref("/about"),
    crossDomainHref("/profile"),
    crossDomainHref("/account"),
    crossDomainHref("/learner-data"),
    crossDomainHref("/import-progress"),
  ]);

  // Release notes and support have no first-party page yet, so these point at
  // the canonical artifacts in the repository rather than at a route that does
  // not exist. Roadmap already resolved this way in the footer.
  const releaseNotesHref = `${siteFacts.repositories.site}/blob/main/RELEASE_NOTES.md`;
  const supportHref = `${siteFacts.repositories.site}/blob/main/SUPPORT.md`;

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
                <Link href={aboutHref}>About Project 42</Link>
              </li>
              <li>
                <a href={releaseNotesHref}>Release notes</a>
              </li>
              <li>
                <a href={siteFacts.repositories.roadmap}>Roadmap</a>
              </li>
              <li>
                <a href={supportHref}>Support</a>
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
          <Link className="header-action" href={learnHref}>
            Start learning
          </Link>
          <ProfileMenu
            accountHref={accountHref}
            importProgressHref={importProgressHref}
            learnerDataHref={learnerDataHref}
            profileHref={profileHref}
          />
        </div>
      </div>
    </header>
  );
}
