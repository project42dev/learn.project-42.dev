import type {
  AssessmentAttempt,
  CapstoneSubmission,
  EarnedBadge,
  LearnerProgress,
} from "@project42/platform";

export interface ProgressMigrationConflict {
  id: string;
  kind: "assessment-attempt" | "capstone-submission";
  message: string;
}

export interface ProgressMigrationCounts {
  attempts: number;
  badges: number;
  capstoneSubmissions: number;
  completedModules: number;
  startedPaths: number;
}

export interface ProgressMigrationPreview {
  conflicts: ProgressMigrationConflict[];
  local: ProgressMigrationCounts;
  merged: ProgressMigrationCounts;
  remote: ProgressMigrationCounts;
  mergedProgress: LearnerProgress;
  localAdditions: ProgressMigrationCounts;
  duplicateAttempts: number;
  duplicateCapstoneSubmissions: number;
  requiresMigration: boolean;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function mergeImmutableRecords<T extends { id: string }>(
  local: T[],
  remote: T[],
  kind: ProgressMigrationConflict["kind"],
): {
  conflicts: ProgressMigrationConflict[];
  duplicates: number;
  records: T[];
} {
  const records = new Map(remote.map((record) => [record.id, record]));
  const conflicts: ProgressMigrationConflict[] = [];
  let duplicates = 0;

  for (const record of local) {
    const existing = records.get(record.id);
    if (!existing) {
      records.set(record.id, record);
      continue;
    }
    if (canonical(existing) === canonical(record)) {
      duplicates += 1;
      continue;
    }
    conflicts.push({
      id: record.id,
      kind,
      message:
        kind === "assessment-attempt"
          ? `Assessment attempt ${record.id} has different evidence in the browser and account.`
          : `Capstone submission ${record.id} has different evidence in the browser and account.`,
    });
  }

  return {
    conflicts,
    duplicates,
    records: [...records.values()],
  };
}

function mergeBadges(local: EarnedBadge[], remote: EarnedBadge[]): EarnedBadge[] {
  const badges = new Map(remote.map((badge) => [badge.id, badge]));
  for (const badge of local) {
    const existing = badges.get(badge.id);
    if (!existing) {
      badges.set(badge.id, badge);
      continue;
    }
    badges.set(badge.id, {
      ...existing,
      earnedAt:
        existing.earnedAt.localeCompare(badge.earnedAt) <= 0
          ? existing.earnedAt
          : badge.earnedAt,
      evidenceModuleIds: uniqueSorted([
        ...existing.evidenceModuleIds,
        ...badge.evidenceModuleIds,
      ]),
    });
  }
  return [...badges.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function latestRecentModule(
  local: LearnerProgress["recentModule"],
  remote: LearnerProgress["recentModule"],
): LearnerProgress["recentModule"] {
  if (!local) return remote;
  if (!remote) return local;
  return local.visitedAt.localeCompare(remote.visitedAt) > 0 ? local : remote;
}

function counts(progress: LearnerProgress): ProgressMigrationCounts {
  return {
    attempts: progress.attempts.length,
    badges: progress.badges.length,
    capstoneSubmissions: progress.capstoneSubmissions?.length ?? 0,
    completedModules: progress.completedModuleIds.length,
    startedPaths: progress.startedPathIds.length,
  };
}

function additions(
  local: LearnerProgress,
  remote: LearnerProgress,
): ProgressMigrationCounts {
  const remoteAttemptIds = new Set(remote.attempts.map((attempt) => attempt.id));
  const remoteBadgeIds = new Set(remote.badges.map((badge) => badge.id));
  const remoteCapstoneIds = new Set(
    (remote.capstoneSubmissions ?? []).map((submission) => submission.id),
  );
  const remoteModules = new Set(remote.completedModuleIds);
  const remotePaths = new Set(remote.startedPathIds);
  return {
    attempts: local.attempts.filter((attempt) => !remoteAttemptIds.has(attempt.id))
      .length,
    badges: local.badges.filter((badge) => !remoteBadgeIds.has(badge.id)).length,
    capstoneSubmissions: (local.capstoneSubmissions ?? []).filter(
      (submission) => !remoteCapstoneIds.has(submission.id),
    ).length,
    completedModules: local.completedModuleIds.filter(
      (moduleId) => !remoteModules.has(moduleId),
    ).length,
    startedPaths: local.startedPathIds.filter((pathId) => !remotePaths.has(pathId))
      .length,
  };
}

export function hasLearningEvidence(progress: LearnerProgress): boolean {
  return (
    progress.startedPathIds.length > 0 ||
    progress.completedModuleIds.length > 0 ||
    progress.attempts.length > 0 ||
    (progress.capstoneSubmissions?.length ?? 0) > 0 ||
    progress.badges.length > 0 ||
    Boolean(progress.recentModule)
  );
}

export function createProgressMigrationPreview(
  local: LearnerProgress,
  remote: LearnerProgress,
): ProgressMigrationPreview {
  const attempts = mergeImmutableRecords<AssessmentAttempt>(
    local.attempts,
    remote.attempts,
    "assessment-attempt",
  );
  const capstones = mergeImmutableRecords<CapstoneSubmission>(
    local.capstoneSubmissions ?? [],
    remote.capstoneSubmissions ?? [],
    "capstone-submission",
  );
  const updatedAt =
    local.updatedAt.localeCompare(remote.updatedAt) > 0
      ? local.updatedAt
      : remote.updatedAt;
  const recentModule = latestRecentModule(
    local.recentModule,
    remote.recentModule,
  );
  const mergedProgress: LearnerProgress = {
    schemaVersion: 1,
    displayName:
      remote.displayName.trim() && remote.displayName !== "Explorer"
        ? remote.displayName
        : local.displayName,
    startedPathIds: uniqueSorted([
      ...remote.startedPathIds,
      ...local.startedPathIds,
    ]),
    completedModuleIds: uniqueSorted([
      ...remote.completedModuleIds,
      ...local.completedModuleIds,
    ]),
    attempts: attempts.records.sort((left, right) =>
      left.completedAt.localeCompare(right.completedAt) ||
      left.id.localeCompare(right.id),
    ),
    capstoneSubmissions: capstones.records.sort((left, right) =>
      left.submittedAt.localeCompare(right.submittedAt) ||
      left.id.localeCompare(right.id),
    ),
    badges: mergeBadges(local.badges, remote.badges),
    ...(recentModule ? { recentModule } : {}),
    updatedAt,
  };
  const normalizedRemote: LearnerProgress = {
    ...remote,
    capstoneSubmissions: remote.capstoneSubmissions ?? [],
  };

  return {
    conflicts: [...attempts.conflicts, ...capstones.conflicts],
    local: counts(local),
    merged: counts(mergedProgress),
    remote: counts(remote),
    mergedProgress,
    localAdditions: additions(local, remote),
    duplicateAttempts: attempts.duplicates,
    duplicateCapstoneSubmissions: capstones.duplicates,
    requiresMigration:
      canonical(mergedProgress) !== canonical(normalizedRemote),
  };
}

export function needsProgressMigration(
  preview: ProgressMigrationPreview,
): boolean {
  return (
    preview.conflicts.length > 0 ||
    preview.requiresMigration
  );
}

export async function createProgressImportId(
  progress: LearnerProgress,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical(progress)),
  );
  return `browser-local-v1-${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}
