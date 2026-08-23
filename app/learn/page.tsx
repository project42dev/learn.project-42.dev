import type { Metadata } from "next";
import Link from "next/link";
import { starterCatalog } from "@project42/platform";

export const metadata: Metadata = {
  title: "Learning paths",
  description: "Choose a guided Project 42 learning path organized by Focus Area.",
};

const defaultFocusAreas = [
  {
    id: "ai-literacy-and-foundations",
    number: 1,
    title: "AI Literacy & Foundations",
    summary: "Core mental models, language model generation, prompt anatomy, context tokens, verification, and privacy without assuming technical experience.",
  },
  {
    id: "developer-and-practitioner-ai",
    number: 2,
    title: "Developer & Practitioner AI",
    summary: "Provider-neutral evaluation, capability comparison, structured outputs, function calling, and hands-on practice across Anthropic, OpenAI, and Google Gemini.",
  },
  {
    id: "frontier-agentic-systems-and-mcp",
    number: 3,
    title: "Frontier Agentic Systems & MCP",
    summary: "Bounded agent loops, tool authority, memory boundaries, Model Context Protocol (MCP) architecture, multi-agent handoffs, and scored capstone.",
  },
  {
    id: "retrieval-rag-and-fine-tuning",
    number: 4,
    title: "Retrieval, RAG & Fine-Tuning",
    summary: "Advanced retrieval architectures, hybrid search, embedding stores, knowledge graphs, and LoRA/QLoRA fine-tuning.",
  },
  {
    id: "self-hosted-and-aiops",
    number: 5,
    title: "Self-Hosted, Open-Weight & AIOps",
    summary: "Open-weight model selection, vLLM/Ollama serving, VRAM calculations, artifact integrity, endpoint security, and disaster recovery.",
  },
  {
    id: "ai-security-and-governance",
    number: 6,
    title: "AI Security, Red-Teaming & Governance",
    summary: "OWASP Top 10 for LLMs, sandboxing, guardrails, compliance frameworks, and cryptographic audit receipts.",
  },
];

export default function LearnPage() {
  const focusAreas = (starterCatalog as any).focusAreas ?? defaultFocusAreas;


  return (
    <main className="page-shell shell">
      <header className="page-hero">
        <p className="eyebrow">Self-paced Curriculum</p>
        <h1>Learning paths with a clear next step.</h1>
        <p>
          Start from first principles or jump straight into practitioner workflows. Every
          module ends with hands-on practice and an assessed knowledge check.
        </p>
      </header>

      <div className="focus-areas-container">
        {focusAreas.map((area: any) => {
          const areaPaths = starterCatalog.paths.filter((p: any) => {
            if (p.focusArea) return p.focusArea === area.id;
            if (area.id === "ai-literacy-and-foundations") return p.id === "ai-foundations" || p.id === "agentic-ai-literacy";
            if (area.id === "developer-and-practitioner-ai") return p.id.includes("practice") || p.id === "providers-in-practice";
            if (area.id === "frontier-agentic-systems-and-mcp") return p.id === "reliable-agent-workflows";
            if (area.id === "self-hosted-and-aiops") return p.id === "self-hosted-model-operations";
            return false;
          });

          if (areaPaths.length === 0) return null;

          return (
            <section className="focus-area-group" key={area.id} aria-labelledby={`focus-area-${area.id}`} style={{ marginBottom: "3.5rem" }}>
              <div className="focus-area-header" style={{ marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1rem" }}>
                <p className="eyebrow" style={{ color: "#38bdf8", marginBottom: "0.25rem" }}>Focus Area {String(area.number).padStart(2, "0")}</p>
                <h2 id={`focus-area-${area.id}`} style={{ fontSize: "1.75rem", margin: "0 0 0.5rem 0" }}>{area.title}</h2>
                <p style={{ color: "#94a3b8", margin: 0, maxWidth: "800px" }}>{area.summary}</p>
              </div>

              <div className="learning-path-list">
                {areaPaths.map((path) => {
                  const currentCourseNumber = starterCatalog.paths.findIndex((p) => p.id === path.id) + 1;

                  const modules = path.moduleIds
                    .map((moduleId) =>
                      starterCatalog.modules.find((module) => module.id === moduleId),
                    )
                    .filter(Boolean);
                  const minutes = modules.reduce(
                    (total, module) => total + (module?.estimatedMinutes ?? 0),
                    0,
                  );

                  return (
                    <article className="learning-path-row" key={path.id}>
                      <div className="learning-path-number">{String(currentCourseNumber).padStart(2, "0")}</div>
                      <div>
                        <div className="path-card-top">
                          <span className="level-pill">{path.level}</span>
                          <span>
                            {path.moduleIds.length} modules · {minutes} min
                          </span>
                        </div>
                        <h2>{path.title}</h2>
                        <p>{path.summary}</p>
                        <small>For {path.audience.toLowerCase()}</small>
                      </div>
                      <div className="learning-path-modules" aria-label={`${path.title} modules`}>
                        {modules.map((module, moduleIndex) => (
                          <span key={module!.id}>
                            {moduleIndex + 1}. {module!.title}
                          </span>
                        ))}
                      </div>
                      <Link className="button button-primary" href={`/learn/${path.id}`}>
                        Explore path
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="learn-format-switch" style={{ marginTop: "2rem" }}>
        Would you rather watch it taught?{" "}
        <Link href="/ondemand">See the on-demand classroom →</Link>
      </p>
    </main>
  );
}
