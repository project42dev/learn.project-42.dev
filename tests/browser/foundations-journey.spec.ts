import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { starterCatalog, type LearningModule } from "@project42/platform";
import { readFile } from "node:fs/promises";

const foundations = starterCatalog.paths.find(
  (candidate) => candidate.id === "ai-foundations",
);

if (!foundations) throw new Error("AI Foundations path is missing");

const foundationModules = foundations.moduleIds.map((moduleId) => {
  const learningModule = starterCatalog.modules.find(
    (candidate) => candidate.id === moduleId,
  );
  if (!learningModule) throw new Error(`Missing module ${moduleId}`);
  return learningModule;
});

async function answerKnowledgeCheck(
  page: Page,
  learningModule: LearningModule,
  correct: boolean,
) {
  const cards = page.locator(".question-card");
  await expect(cards).toHaveCount(
    learningModule.knowledgeCheck.questions.length,
  );
  for (const [index, question] of learningModule.knowledgeCheck.questions.entries()) {
    const answerIndex = correct
      ? question.answerIndex
      : (question.answerIndex + 1) % question.choices.length;
    await cards.nth(index).locator('input[type="radio"]').nth(answerIndex).check();
  }
  await page.getByRole("button", { name: "Check my answers" }).click();
}

async function expectNoAutomatedAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test("a learner can start, resume, complete, and export AI Foundations", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const firstModule = foundationModules[0];
  const expectedCompletedModules = foundationModules.length;
  const expectedKnowledgeCheckAttempts = foundationModules.length + 1;
  const expectedCapstoneSubmissions = 2;
  await page.goto(`/learn/${foundations.id}/${firstModule.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(firstModule.title);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem("project42.progress.v1");
        return raw ? JSON.parse(raw).recentModule?.moduleId : null;
      }),
    )
    .toBe(firstModule.id);

  await page.reload();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem("project42.progress.v1");
        return raw ? JSON.parse(raw).recentModule?.moduleId : null;
      }),
    )
    .toBe(firstModule.id);
  await page.goto("/");
  const resumeLink = page.getByRole("link", {
    name: `Continue ${firstModule.title} →`,
  });
  await expect(resumeLink).toBeVisible();
  await resumeLink.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(firstModule.title);
  await answerKnowledgeCheck(page, firstModule, false);
  await expect(page.getByText("Not quite yet")).toBeVisible();
  await expect(page.getByText("Review this one.").first()).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await answerKnowledgeCheck(page, firstModule, true);
  await expect(page.getByText("Checkpoint passed")).toBeVisible();

  for (const learningModule of foundationModules.slice(1, -1)) {
    await page.getByRole("link", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      learningModule.title,
    );
    await answerKnowledgeCheck(page, learningModule, true);
    await expect(page.getByText("Checkpoint passed")).toBeVisible();
  }

  const capstoneModule = foundationModules.at(-1);
  if (!capstoneModule?.capstone) throw new Error("Capstone contract is missing");
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    capstoneModule.title,
  );

  const artifactInputs = page.locator(".capstone-artifacts input");
  await expect(artifactInputs).toHaveCount(
    capstoneModule.capstone.requiredArtifacts.length,
  );
  for (const [index] of capstoneModule.capstone.requiredArtifacts.entries()) {
    await artifactInputs.nth(index).fill(`portfolio/artifact-${index + 1}.md`);
  }
  const scoreInputs = page.locator(".capstone-rubric input");
  await expect(scoreInputs).toHaveCount(
    capstoneModule.capstone.rubric.criteria.length,
  );
  for (const [index] of capstoneModule.capstone.rubric.criteria.entries()) {
    await scoreInputs.nth(index).fill("0");
  }
  await page
    .getByLabel("Reflection and handoff")
    .fill(
      "Independent verification changed the recommendation and the handoff records the remaining uncertainty.",
    );
  await page
    .getByRole("button", { name: "Score and save capstone evidence" })
    .click();
  await expect(
    page.getByText("Latest capstone: 0% · revise and resubmit"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Use the rubric feedback to improve the artifacts, then submit a new evidence record.",
    ),
  ).toBeVisible();

  for (const [index, criterion] of capstoneModule.capstone.rubric.criteria.entries()) {
    await scoreInputs.nth(index).fill(String(criterion.maxPoints));
  }
  await page
    .getByRole("button", { name: "Score and save capstone evidence" })
    .click();
  await expect(page.getByText(/Latest capstone: 100% · rubric passed/)).toBeVisible();
  await expect(
    page.getByText(
      "Your evidence passed. Complete the knowledge check below to finish the module.",
    ),
  ).toBeVisible();

  await answerKnowledgeCheck(page, capstoneModule, true);
  await expect(page.getByText("Checkpoint passed")).toBeVisible();
  await expect(page.getByText(/Saved to your transcript/)).toBeVisible();

  await page.reload();
  await page.goto(`/learn/${foundations.id}`);
  await expect(page.locator(".module-list .module-complete")).toHaveCount(
    expectedCompletedModules,
  );

  await page.goto("/profile");
  await expect(
    page.getByText(
      `${expectedCompletedModules} of ${expectedCompletedModules} modules`,
    ),
  ).toBeVisible();
  await expect(
    page.locator(".profile-stats div").filter({ hasText: "Modules completed" }),
  ).toContainText(String(expectedCompletedModules));
  await expect(
    page.locator(".profile-stats div").filter({ hasText: "Knowledge checks" }),
  ).toContainText(String(expectedKnowledgeCheckAttempts));
  await expect(
    page.locator(".profile-stats div").filter({ hasText: "Capstone submissions" }),
  ).toContainText(String(expectedCapstoneSubmissions));
  await expect(page.getByRole("heading", { name: "Capstone history" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "100%" }).last()).toBeVisible();
  await expect(
    page.locator(".badge-grid article").getByRole("heading", {
      name: "AI Foundations",
    }),
  ).toBeVisible();

  const jsonDownloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download browser-local JSON record" })
    .click();
  const jsonDownload = await jsonDownloadPromise;
  const jsonPath = await jsonDownload.path();
  if (!jsonPath) throw new Error("JSON download path is unavailable");
  const record = JSON.parse(await readFile(jsonPath, "utf8"));
  expect(record.learner.completedModuleIds).toHaveLength(
    expectedCompletedModules,
  );
  expect(record.learner.attempts).toHaveLength(
    expectedKnowledgeCheckAttempts,
  );
  expect(record.learner.capstoneSubmissions).toHaveLength(
    expectedCapstoneSubmissions,
  );
  expect(record.learner.badges.map((badge: { id: string }) => badge.id)).toContain(
    "badge-ai-foundations",
  );

  const csvDownloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download browser-local CSV transcript" })
    .click();
  const csvDownload = await csvDownloadPromise;
  const csvPath = await csvDownload.path();
  if (!csvPath) throw new Error("CSV download path is unavailable");
  const csv = await readFile(csvPath, "utf8");
  expect(csv).toContain("AI Foundations Capstone");
  expect(csv).toContain("portfolio/artifact-1.md");
  expect(csv).toContain(",Capstone,");
});

test("keyboard controls expose feedback and retain focus semantics", async ({
  page,
}) => {
  const learningModule = foundationModules.find(
    (candidate) => candidate.id === "research-with-evidence",
  );
  if (!learningModule) throw new Error("Research workflow module is missing");
  await page.goto(`/learn/${foundations.id}/${learningModule.id}`);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const firstQuestion = page.locator(".question-card").first();
  const firstChoice = firstQuestion.locator('input[type="radio"]').first();
  await firstChoice.focus();
  await page.keyboard.press("ArrowRight");
  await expect(firstQuestion.locator('input[type="radio"]:checked')).toHaveCount(1);

  for (const [index, question] of learningModule.knowledgeCheck.questions.entries()) {
    await page
      .locator(".question-card")
      .nth(index)
      .locator('input[type="radio"]')
      .nth(question.answerIndex)
      .check();
  }
  await page.getByRole("button", { name: "Check my answers" }).click();
  await expect(page.locator(".check-result")).toHaveAttribute("role", "status");
  await expect(page.getByText(/Correct\.|Review this one\./).first()).toBeVisible();
});

test("critical learner states pass automated accessibility checks", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/learn",
    "/ondemand",
    "/ondemand/ai-foundations/agents-and-guardrails",
    "/learn/ai-foundations",
    "/learn/ai-foundations/research-with-evidence",
    "/learn/ai-foundations/ai-foundations-capstone",
    "/learn/reliable-agent-workflows",
    "/learn/reliable-agent-workflows/reliable-agent-capstone",
    "/profile",
    "/learner-data",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expectNoAutomatedAccessibilityViolations(page);
  }

  const learningModule = foundationModules.find(
    (candidate) => candidate.id === "research-with-evidence",
  );
  if (!learningModule) throw new Error("Research workflow module is missing");
  await page.goto(`/learn/${foundations.id}/${learningModule.id}`);
  await answerKnowledgeCheck(page, learningModule, false);
  await expect(page.getByText("Not quite yet")).toBeVisible();
  await expectNoAutomatedAccessibilityViolations(page);
});
