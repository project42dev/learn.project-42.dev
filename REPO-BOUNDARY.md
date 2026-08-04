# Repository boundary

This file states what this repository is for, what must never be added to it,
and where to look instead. It exists because two codebases ended up in the
wrong repositories, and both got there through a directory convention that
nobody enforced.

Governing decision: **ADR-0017**, Orchard and the Foundry layer separation.

## What this is

**The Learn delivery surface: modules, progression, and the learner experience for structured courses.**

- Visibility: **public**

## What must never go here

| Do not add | Because | Where it belongs |
|---|---|---|
| **Field Guide content or its delivery logic** | Two surfaces with two different jobs. | `guide.project-42.dev` |
| **Canonical content** | Delivery consumes the released platform package. | `project42-platform` |
| **Any call to a model at learn time** | Everything a learner consumes is produced at publish time and stored. Inference at read time is a cost, a latency, and a consistency problem all at once. | Publish-time rendering in `orchard` |

## Looking for something else?

| Looking for | It lives in |
|---|---|
| The content, the content model, and the schemas | `project42-platform` |
| The content lifecycle tool: discovery, authoring, currency | `orchard` |
| The public marketing and entry surface | `project-42.dev` |
| The Field Guide delivery surface | `guide.project-42.dev` |
| Learner account and profile | `account.project-42.dev` |
| Owner administration | `admin.project-42.dev` |
| Planning, sprints, ADRs, board records | `project42dev-ops`, private |
| An Azure AI Foundry deployment framework | `homestead-foundry` |
| One owner's Foundry instance and model registry | `my-homestead-foundry` |

## The rule in one line

**This repository serves what was already made. It never makes anything.**
