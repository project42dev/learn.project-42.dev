import diagramConfig from "@project42/platform/content/diagrams/catalogue.json";

export interface Project42Diagram {
  id: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  altText: string;
  caption: string;
  takeaways: string[];
  source: string;
}

export const diagramCatalog = Object.freeze(
  diagramConfig.diagrams as Project42Diagram[],
);

export function getDiagram(id: string) {
  return diagramCatalog.find((diagram) => diagram.id === id);
}
