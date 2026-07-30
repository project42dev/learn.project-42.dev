import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  createEmptyProgress,
  starterCatalog,
  type LearnerProgress,
} from "@project42/platform";
import { readFile } from "node:fs/promises";
import { readProductionProgressAcceptanceConfig } from "./progress-acceptance-config";

const acceptance = readProductionProgressAcceptanceConfig();
const sessionCookieName = "__Host-project42_session";
const progressKey = "project42.progress.v1";
const recoveryKey = "project42.progress.migration.recovery.v1";

interface ApiResult<T> {
  body: T;
  status: number;
}

async function api<T>(
  context: BrowserContext,
  path: string,
  init: {
    data?: unknown;
    method?: "GET" | "POST";
  } = {},
): Promise<ApiResult<T>> {
  const response = await context.request.fetch(`${acceptance.apiOrigin}${path}`, {
    data: init.data,
    failOnStatusCode: false,
    headers: { accept: "application/json" },
    method: init.method ?? "GET",
  });
  const text = await response.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Account API returned non-JSON data for ${path} (${response.status()}).`,
    );
  }
  if (!response.ok()) {
    const error =
      body && typeof body === "object" && "error" in body
        ? (body.error as { code?: unknown; requestId?: unknown })
        : undefined;
    const code = typeof error?.code === "string" ? error.code : "unknown";
    const requestId =
      typeof error?.requestId === "string" ? ` Request ${error.requestId}.` : "";
    throw new Error(
      `Account API rejected ${path} (${response.status()}, ${code}).${requestId}`,
    );
  }
  return { body: body as T, status: response.status() };
}

async function assertApprovedExpectedAccount(context: BrowserContext) {
  const { body } = await api<{
    account?: { id?: unknown; state?: unknown };
  }>(context, "/v1/auth/session");
  if (
    body.account?.state !== "approved" ||
    body.account.id !== acceptance.accountId
  ) {
    throw new Error(
      "The private browser state does not identify the expected approved acceptance account.",
    );
  }
}

async function sessionCookie(context: BrowserContext) {
  const cookie = (await context.cookies(acceptance.apiOrigin)).find(
    ({ name }) => name === sessionCookieName,
  );
  if (!cookie?.httpOnly || !cookie.secure || !cookie.value) {
    throw new Error(
      "The private browser state does not contain a secure HttpOnly Project 42 session.",
    );
  }
  return cookie.value;
}

function progressBody(body: {
  progress?: { progress?: LearnerProgress; revision?: number };
}) {
  const progress = body.progress?.progress;
  const revision = body.progress?.revision;
  if (!progress || !Number.isInteger(revision) || Number(revision) < 1) {
    throw new Error("The account API returned an incomplete progress record.");
  }
  return { progress, revision: Number(revision) };
}

function attemptCount(progress: LearnerProgress, attemptId: string) {
  return progress.attempts.filter(({ id }) => id === attemptId).length;
}

async function browserProgress(page: Page): Promise<LearnerProgress | null> {
  return page.evaluate((key) => {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }, progressKey);
}

test("imports once, retrieves from a second session, verifies export, and applies the backup decision", async ({
  browser,
}, testInfo) => {
  const primary = await browser.newContext({
    storageState: acceptance.primaryStatePath,
  });
  const secondary = await browser.newContext({
    storageState: acceptance.secondaryStatePath,
  });
  const primaryPage = await primary.newPage();
  const secondaryPage = await secondary.newPage();
  const path = starterCatalog.paths[0];
  const moduleId = path.moduleIds[0];
  const attemptId = `production-migration-${acceptance.runId}`;
  const localProgress: LearnerProgress = {
    ...createEmptyProgress(),
    startedPathIds: [path.id],
    completedModuleIds: [moduleId],
    attempts: [
      {
        id: attemptId,
        pathId: path.id,
        moduleId,
        contentVersion: starterCatalog.contentVersion,
        scorePercent: 100,
        passed: true,
        completedAt: acceptance.occurredAt,
      },
    ],
    updatedAt: acceptance.occurredAt,
  };

  try {
    await Promise.all([
      assertApprovedExpectedAccount(primary),
      assertApprovedExpectedAccount(secondary),
    ]);
    const [primaryCookie, secondaryCookie] = await Promise.all([
      sessionCookie(primary),
      sessionCookie(secondary),
    ]);
    if (primaryCookie === secondaryCookie) {
      throw new Error(
        "The acceptance run requires two independently authenticated sessions.",
      );
    }

    const before = progressBody(
      (
        await api<{
          progress?: { progress?: LearnerProgress; revision?: number };
        }>(primary, "/v1/me/progress")
      ).body,
    );
    if (attemptCount(before.progress, attemptId) !== 0) {
      throw new Error(
        "The production acceptance run identifier has already been used.",
      );
    }

    await primaryPage.addInitScript(
      ({ progress, progressStorageKey, recoveryStorageKey }) => {
        window.localStorage.setItem(
          progressStorageKey,
          JSON.stringify(progress),
        );
        window.localStorage.removeItem(recoveryStorageKey);
      },
      {
        progress: localProgress,
        progressStorageKey: progressKey,
        recoveryStorageKey: recoveryKey,
      },
    );
    await secondaryPage.addInitScript(
      ({ progressStorageKey, recoveryStorageKey }) => {
        window.localStorage.removeItem(progressStorageKey);
        window.localStorage.removeItem(recoveryStorageKey);
      },
      { progressStorageKey: progressKey, recoveryStorageKey: recoveryKey },
    );

    await primaryPage.goto("/profile");
    await expect(
      primaryPage.getByRole("heading", {
        name: "Move this browser record into your account",
      }),
    ).toBeVisible();
    await expect(primaryPage.getByText(attemptId, { exact: true })).toBeVisible();
    await primaryPage
      .getByRole("button", { name: "Confirm and merge into my account" })
      .click();
    await expect(
      primaryPage.getByRole("heading", { name: "Progress is synchronized" }),
    ).toBeVisible();

    const recovery = await primaryPage.evaluate((key) => {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }, recoveryKey);
    if (
      !recovery ||
      recovery.state !== "completed" ||
      typeof recovery.importId !== "string" ||
      !recovery.mergedProgress
    ) {
      throw new Error("Learn did not retain a completed migration envelope.");
    }

    const after = progressBody(
      (
        await api<{
          progress?: { progress?: LearnerProgress; revision?: number };
        }>(primary, "/v1/me/progress")
      ).body,
    );
    if (attemptCount(after.progress, attemptId) !== 1) {
      throw new Error(
        "The authoritative progress record does not contain exactly one acceptance attempt.",
      );
    }

    const replay = progressBody(
      (
        await api<{
          progress?: { progress?: LearnerProgress; revision?: number };
        }>(primary, "/v1/me/progress", {
          method: "POST",
          data: {
            importId: recovery.importId,
            source: "browser-local-v1",
            progress: recovery.mergedProgress,
          },
        })
      ).body,
    );
    if (
      replay.revision !== after.revision ||
      attemptCount(replay.progress, attemptId) !== 1
    ) {
      throw new Error(
        "Replaying the exact migration changed its revision or duplicated evidence.",
      );
    }

    await secondaryPage.goto("/profile");
    await expect
      .poll(async () => {
        const stored = await browserProgress(secondaryPage);
        return stored ? attemptCount(stored, attemptId) : 0;
      })
      .toBe(1);
    const secondSession = progressBody(
      (
        await api<{
          progress?: { progress?: LearnerProgress; revision?: number };
        }>(secondary, "/v1/me/progress")
      ).body,
    );
    if (
      secondSession.revision !== after.revision ||
      attemptCount(secondSession.progress, attemptId) !== 1
    ) {
      throw new Error(
        "The second session did not retrieve the authoritative migrated record.",
      );
    }

    const exported = (
      await api<{
        export?: {
          progress?: { progress?: LearnerProgress; revision?: number };
        };
      }>(secondary, "/v1/me/export")
    ).body.export?.progress;
    if (
      !exported?.progress ||
      exported.revision !== after.revision ||
      attemptCount(exported.progress, attemptId) !== 1
    ) {
      throw new Error(
        "The account export did not contain the authoritative migrated evidence.",
      );
    }

    const exportDownloadPromise = primaryPage.waitForEvent("download");
    await primaryPage
      .getByRole("button", { name: "Verify and download account export" })
      .click();
    const exportDownload = await exportDownloadPromise;
    const exportPath = await exportDownload.path();
    if (!exportPath) {
      throw new Error("The verified account export was not downloaded.");
    }
    const downloaded = JSON.parse(await readFile(exportPath, "utf8"));
    if (
      downloaded?.progress?.revision !== after.revision ||
      attemptCount(downloaded.progress.progress, attemptId) !== 1
    ) {
      throw new Error(
        "The downloaded account export did not match the authoritative migrated record.",
      );
    }
    await expect(primaryPage.getByText(/server export matches/i)).toBeVisible();
    await expect(
      primaryPage.getByText(`Revision ${after.revision} verified`),
    ).toBeVisible();

    if (acceptance.backupDecision === "remove-after-verified-export") {
      await primaryPage
        .getByLabel(/I understand that removing this retained backup/i)
        .check();
      await primaryPage
        .getByRole("button", { name: "Remove retained browser backup" })
        .click();
      const removed = await primaryPage.evaluate(
        (key) => window.localStorage.getItem(key),
        recoveryKey,
      );
      if (removed !== null) {
        throw new Error("The explicit browser-backup removal did not complete.");
      }
    } else {
      await primaryPage.reload();
      await expect(
        primaryPage.getByRole("heading", {
          name: "Retained migration evidence",
        }),
      ).toBeVisible();
      const retained = await primaryPage.evaluate((key) => {
        const value = window.localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      }, recoveryKey);
      if (
        retained?.verifiedRevision !== after.revision ||
        typeof retained?.verifiedExportAt !== "string"
      ) {
        throw new Error(
          "The retained browser backup does not contain export-verification evidence.",
        );
      }
    }

    await testInfo.attach("production-progress-acceptance.json", {
      body: Buffer.from(
        `${JSON.stringify(
          {
            schemaVersion: 1,
            runId: acceptance.runId,
            occurredAt: acceptance.occurredAt,
            attemptId,
            importId: recovery.importId,
            revision: after.revision,
            backupDecision: acceptance.backupDecision,
            authoritativeAttemptCount: attemptCount(
              after.progress,
              attemptId,
            ),
            replayAttemptCount: attemptCount(replay.progress, attemptId),
            secondSessionAttemptCount: attemptCount(
              secondSession.progress,
              attemptId,
            ),
            exportAttemptCount: attemptCount(
              exported.progress,
              attemptId,
            ),
          },
          null,
          2,
        )}\n`,
      ),
      contentType: "application/json",
    });
  } finally {
    await Promise.allSettled([primary.close(), secondary.close()]);
  }
});
