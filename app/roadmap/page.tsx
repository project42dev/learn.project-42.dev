import type { Metadata } from "next";
import roadmap from "../../config/roadmap.json";
import { siteFacts } from "../lib/siteFacts";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "What Project 42 offers today, what is being built, and what is being considered next.",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Available now",
  "in-progress": "Being built",
  next: "Next",
  exploring: "Being considered",
};

// Grouped by status rather than by date on purpose. Dates on a roadmap read as
// commitments, and the one thing this page must not do is promise a month.
export default function RoadmapPage() {
  const groups = roadmap.statuses
    .map((status) => ({
      status,
      label: STATUS_LABELS[status] ?? status,
      items: roadmap.items.filter((item) => item.status === status),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="page-shell shell">
      <header className="page-hero">
        <p className="eyebrow">Roadmap</p>
        <h1>Where this is going.</h1>
        <p>
          What you can use today, what is being built, and what is being weighed
          up next. {roadmap.note}
        </p>
      </header>

      {groups.map((group) => (
        <section
          aria-labelledby={`roadmap-${group.status}`}
          className="roadmap-group"
          key={group.status}
        >
          <div className="roadmap-group-head">
            <h2 id={`roadmap-${group.status}`}>{group.label}</h2>
            <span>
              {group.items.length} item{group.items.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="roadmap-list">
            {group.items.map((item) => (
              <li className={`roadmap-item roadmap-${item.status}`} key={item.id}>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <p className="roadmap-detail">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="page-foot-note">
        Detail, discussion, and anything not listed here live on the public issue
        tracker. <a href={siteFacts.repositories.roadmap}>Open roadmap issues</a>
      </p>
    </main>
  );
}
