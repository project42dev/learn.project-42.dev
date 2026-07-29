import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyProgress,
  starterCatalog,
} from "@project42/platform";
import {
  buildProgressMigrationItems,
  buildProgressReconciliationPackage,
  createProgressMigrationPreview,
  parseProgressMigrationRecovery,
} from "../app/lib/progressMigration.ts";

function progressRecords() {
  const path = starterCatalog.paths[0];
  const [browserModuleId, accountModuleId] = path.moduleIds;
  const duplicateAttempt = {
    id: "shared-attempt",
    pathId: path.id,
    moduleId: browserModuleId,
    contentVersion: starterCatalog.contentVersion,
    scorePercent: 100,
    passed: true,
    completedAt: "2026-07-29T01:00:00.000Z",
  };
  const browser = {
    ...createEmptyProgress("Browser learner"),
    startedPathIds: [path.id],
    completedModuleIds: [browserModuleId],
    attempts: [
      duplicateAttempt,
      {
        ...duplicateAttempt,
        id: "browser-attempt",
        scorePercent: 80,
        completedAt: "2026-07-29T02:00:00.000Z",
      },
    ],
    updatedAt: "2026-07-29T02:00:00.000Z",
  };
  const account = {
    ...createEmptyProgress("Account learner"),
    startedPathIds: [path.id],
    completedModuleIds: [accountModuleId],
    attempts: [duplicateAttempt],
    updatedAt: "2026-07-29T01:30:00.000Z",
  };
  return { account, browser, accountModuleId, browserModuleId, path };
}

test("lists every browser record with an exact reconciliation disposition", () => {
  const { account, browser, accountModuleId, browserModuleId, path } =
    progressRecords();
  const preview = createProgressMigrationPreview(browser, account);
  const items = buildProgressMigrationItems(preview, starterCatalog);

  assert.deepEqual(
    items.map(({ kind, id, disposition }) => ({ kind, id, disposition })),
    [
      {
        kind: "started-path",
        id: path.id,
        disposition: "already-in-account",
      },
      {
        kind: "completed-module",
        id: browserModuleId,
        disposition: "will-add",
      },
      {
        kind: "assessment-attempt",
        id: "shared-attempt",
        disposition: "already-in-account",
      },
      {
        kind: "assessment-attempt",
        id: "browser-attempt",
        disposition: "will-add",
      },
    ],
  );
  assert.equal(preview.remoteOnly.completedModules, 1);
  assert.equal(preview.remoteProgress.completedModuleIds[0], accountModuleId);
});

test("builds a portable report with replace risk and projected transcript", () => {
  const { account, browser } = progressRecords();
  const preview = createProgressMigrationPreview(browser, account);
  const report = buildProgressReconciliationPackage(preview, starterCatalog, {
    generatedAt: "2026-07-29T03:00:00.000Z",
    importId: "browser-local-v1-report",
    state: "preview",
  });

  assert.equal(report.format, "project42/progress-reconciliation");
  assert.equal(report.mergeBehavior.replaceAvailable, false);
  assert.equal(report.mergeBehavior.replaceWouldRemove.completedModules, 1);
  assert.equal(report.records.browser.learner.attempts.length, 2);
  assert.equal(report.records.account.learner.attempts.length, 1);
  assert.equal(report.records.proposedMerge.learner.attempts.length, 2);
  assert.ok(
    report.transcriptProjection.some(
      (entry) => entry.pathId === starterCatalog.paths[0].id,
    ),
  );
  const serialized = JSON.stringify(report);
  for (const forbidden of [
    "accessToken",
    "primaryEmail",
    "issuer",
    "subject",
    "tenantId",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("accepts a valid retained backup and rejects tampered progress", () => {
  const { account, browser } = progressRecords();
  const preview = createProgressMigrationPreview(browser, account);
  const recovery = {
    schemaVersion: 1,
    importId: `browser-local-v1-${"a".repeat(64)}`,
    localProgress: browser,
    remoteProgress: account,
    mergedProgress: preview.mergedProgress,
    completedAt: "2026-07-29T03:00:00.000Z",
    state: "completed",
    verifiedExportAt: "2026-07-29T03:05:00.000Z",
    verifiedRevision: 3,
  };

  assert.deepEqual(
    parseProgressMigrationRecovery(recovery, starterCatalog),
    recovery,
  );
  assert.equal(
    parseProgressMigrationRecovery(
      {
        ...recovery,
        mergedProgress: account,
      },
      starterCatalog,
    ),
    null,
  );
  assert.equal(
    parseProgressMigrationRecovery(
      {
        ...recovery,
        verifiedRevision: undefined,
      },
      starterCatalog,
    ),
    null,
  );
});
