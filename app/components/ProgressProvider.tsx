"use client";

import {
  createEmptyProgress,
  recordAssessmentAttempt,
  recordCapstoneSubmission,
  recordModuleVisit,
  starterCatalog,
  type AssessmentResult,
  type CapstoneCriterionScore,
  type LearnerProgress,
} from "@project42/platform";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  canonicalProgressValue,
  createProgressImportId,
  createProgressMigrationPreview,
  hasLearningEvidence,
  needsProgressMigration,
  parseProgressMigrationRecovery,
  type ProgressMigrationPreview,
  type ProgressMigrationRecoveryEnvelope,
} from "../lib/progressMigration";
import {
  deviceLocalProgressKey,
  readDeviceLocalProgress,
  type DeviceLocalProgressRecovery,
} from "../lib/deviceLocalProgress";
import { useAuth } from "./AuthProvider";

const migrationRecoveryKey = "project42.progress.migration.recovery.v1";
type StorageStatus = "ready" | "unavailable" | "write-error";
type SyncStatus =
  | "local-only"
  | "recovery-needed"
  | "checking"
  | "migration-available"
  | "syncing"
  | "synced"
  | "blocked"
  | "error";

interface ProgressContextValue {
  progress: LearnerProgress;
  migrationPreview: ProgressMigrationPreview | null;
  localRecordRecovery: DeviceLocalProgressRecovery | null;
  migrationRecovery: ProgressMigrationRecoveryEnvelope | null;
  hydrated: boolean;
  storageStatus: StorageStatus;
  syncStatus: SyncStatus;
  migrateLocalToAccount: () => Promise<void>;
  verifyMigrationExport: () => Promise<unknown>;
  removeMigrationRecovery: () => void;
  recordResult: (pathId: string, moduleId: string, result: AssessmentResult) => void;
  recordCapstone: (
    pathId: string,
    moduleId: string,
    artifactRefs: string[],
    criterionScores: CapstoneCriterionScore[],
    reflection: string,
  ) => void;
  recordVisit: (pathId: string, moduleId: string) => void;
  replaceProgress: (progress: LearnerProgress) => void;
  rename: (displayName: string) => void;
  reset: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

async function safeReadMigrationRecovery(): Promise<ProgressMigrationRecoveryEnvelope | null> {
  try {
    const raw = window.localStorage.getItem(migrationRecoveryKey);
    if (!raw) return null;
    return await parseProgressMigrationRecovery(
      JSON.parse(raw),
      starterCatalog,
    );
  } catch {
    return null;
  }
}

function timestampNotBefore(earliest: string): string {
  return new Date(Math.max(Date.now(), Date.parse(earliest))).toISOString();
}

function safeReadProgress(): {
  progress: LearnerProgress;
  storageStatus: StorageStatus;
  localRecordRecovery: DeviceLocalProgressRecovery | null;
} {
  try {
    const result = readDeviceLocalProgress(window.localStorage, starterCatalog);
    if (result.status === "missing") {
      return {
        progress: createEmptyProgress(),
        storageStatus: "ready",
        localRecordRecovery: null,
      };
    }
    if (result.status === "quarantined") {
      return {
        progress: createEmptyProgress(),
        storageStatus: "unavailable",
        localRecordRecovery: result.recovery,
      };
    }
    return {
      progress: result.progress,
      storageStatus: "ready",
      localRecordRecovery: null,
    };
  } catch {
    return {
      progress: createEmptyProgress(),
      storageStatus: "unavailable",
      localRecordRecovery: null,
    };
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { account, apiFetch } = useAuth();
  const [progress, setProgress] = useState<LearnerProgress>(() => createEmptyProgress());
  const [hydrated, setHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("ready");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local-only");
  const [migrationPreview, setMigrationPreview] =
    useState<ProgressMigrationPreview | null>(null);
  const [localRecordRecovery, setLocalRecordRecovery] =
    useState<DeviceLocalProgressRecovery | null>(null);
  const [migrationRecovery, setMigrationRecovery] =
    useState<ProgressMigrationRecoveryEnvelope | null>(null);
  const localPersistenceBlocked = useRef(false);
  const synchronizationEnabled = useRef(false);
  const lastSynchronized = useRef("");
  const currentProgress = useRef(progress);
  const remoteProgress = useRef<LearnerProgress | null>(null);

  useEffect(() => {
    currentProgress.current = progress;
  }, [progress]);

  useEffect(() => {
    let cancelled = false;
    const hydrationTimer = window.setTimeout(() => {
      const stored = safeReadProgress();
      void safeReadMigrationRecovery().then((storedMigrationRecovery) => {
        if (cancelled) return;
        localPersistenceBlocked.current = Boolean(stored.localRecordRecovery);
        setProgress(stored.progress);
        setStorageStatus(stored.storageStatus);
        setLocalRecordRecovery(stored.localRecordRecovery);
        setMigrationRecovery(storedMigrationRecovery);
        setHydrated(true);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(hydrationTimer);
    };
  }, []);

  useEffect(() => {
    if (
      !hydrated ||
      localRecordRecovery ||
      localPersistenceBlocked.current
    ) {
      return;
    }
    let nextStatus: StorageStatus = "ready";
    try {
      window.localStorage.setItem(
        deviceLocalProgressKey,
        JSON.stringify(progress),
      );
    } catch {
      nextStatus = "write-error";
    }
    const statusTimer = window.setTimeout(() => setStorageStatus(nextStatus), 0);
    return () => window.clearTimeout(statusTimer);
  }, [hydrated, localRecordRecovery, progress]);

  useEffect(() => {
    synchronizationEnabled.current = false;
    lastSynchronized.current = "";
    remoteProgress.current = null;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setMigrationPreview(null);
      if (!hydrated || !account) {
        setSyncStatus("local-only");
        return;
      }
      if (localRecordRecovery) {
        setSyncStatus("recovery-needed");
        return;
      }
      if (account.state !== "approved") {
        setSyncStatus("blocked");
        return;
      }

      setSyncStatus("checking");
      void apiFetch("/v1/me/progress", { signal: controller.signal })
        .then(async (response) => {
          const body = (await response.json()) as {
            progress?: {
              revision: number;
              progress: LearnerProgress;
            };
            error?: { message?: string };
          };
          if (!response.ok || !body.progress) {
            throw new Error(body.error?.message ?? "Account progress could not be loaded.");
          }
          const remote = body.progress;
          const local = currentProgress.current;
          remoteProgress.current = remote.progress;
          const preview = createProgressMigrationPreview(local, remote.progress);
          if (hasLearningEvidence(local) && needsProgressMigration(preview)) {
            setMigrationPreview(preview);
            setSyncStatus("migration-available");
            return;
          }
          if (remote.revision > 0) {
            const normalized = {
              ...remote.progress,
              capstoneSubmissions: remote.progress.capstoneSubmissions ?? [],
            };
            lastSynchronized.current = JSON.stringify(normalized);
            setProgress(normalized);
          } else {
            lastSynchronized.current = JSON.stringify(local);
          }
          setMigrationPreview(null);
          synchronizationEnabled.current = true;
          setSyncStatus("synced");
        })
        .catch((caught) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setSyncStatus("error");
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [account, apiFetch, hydrated, localRecordRecovery]);

  useEffect(() => {
    if (
      !hydrated ||
      !account ||
      account.state !== "approved" ||
      !synchronizationEnabled.current
    ) {
      return;
    }
    const serialized = JSON.stringify(progress);
    if (serialized === lastSynchronized.current) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSyncStatus("syncing");
      void apiFetch("/v1/me/progress", {
        method: "PUT",
        signal: controller.signal,
        body: JSON.stringify({
          importId: crypto.randomUUID(),
          source: "browser-local-v1",
          progress,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = (await response.json()) as { error?: { message?: string } };
            throw new Error(body.error?.message ?? "Progress could not be synchronized.");
          }
          lastSynchronized.current = serialized;
          setSyncStatus("synced");
        })
        .catch((caught) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setSyncStatus("error");
        });
    }, 800);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [account, apiFetch, hydrated, progress]);

  const recordResult = useCallback(
    (pathId: string, moduleId: string, result: AssessmentResult) => {
      const completedAt = new Date().toISOString();
      const attemptId =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${moduleId}-${Date.now()}`;
      setProgress((current) =>
        recordAssessmentAttempt(current, starterCatalog, {
          attemptId,
          pathId,
          moduleId,
          completedAt,
          result,
        }),
      );
    },
    [],
  );

  const recordVisit = useCallback((pathId: string, moduleId: string) => {
    const visitedAt = new Date().toISOString();
    setProgress((current) =>
      recordModuleVisit(current, starterCatalog, {
        pathId,
        moduleId,
        visitedAt,
      }),
    );
  }, []);

  const recordCapstone = useCallback(
    (
      pathId: string,
      moduleId: string,
      artifactRefs: string[],
      criterionScores: CapstoneCriterionScore[],
      reflection: string,
    ) => {
      const submittedAt = new Date().toISOString();
      const submissionId =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${moduleId}-capstone-${Date.now()}`;
      setProgress((current) =>
        recordCapstoneSubmission(current, starterCatalog, {
          submissionId,
          pathId,
          moduleId,
          submittedAt,
          artifactRefs,
          criterionScores,
          reflection,
        }),
      );
    },
    [],
  );

  const rename = useCallback((displayName: string) => {
    setProgress((current) => ({
      ...current,
      displayName: displayName.trim() || "Explorer",
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const replaceProgress = useCallback(
    (replacement: LearnerProgress) => {
      const next = structuredClone(replacement);
      if (account?.state === "approved" && remoteProgress.current) {
        const preview = createProgressMigrationPreview(
          next,
          remoteProgress.current,
        );
        if (needsProgressMigration(preview)) {
          setProgress(next);
          synchronizationEnabled.current = false;
          setMigrationPreview(preview);
          setSyncStatus("migration-available");
          return;
        }
        const authoritative = structuredClone(remoteProgress.current);
        setProgress(authoritative);
        lastSynchronized.current = JSON.stringify(authoritative);
        setMigrationPreview(null);
        setSyncStatus("synced");
        return;
      }
      setProgress(next);
    },
    [account],
  );

  const reset = useCallback(() => {
    setProgress(createEmptyProgress());
  }, []);

  const migrateLocalToAccount = useCallback(async () => {
    if (!account || account.state !== "approved") {
      throw new Error("An approved account is required.");
    }
    if (!migrationPreview) {
      throw new Error("No browser progress is waiting to be migrated.");
    }
    if (migrationPreview.conflicts.length > 0) {
      throw new Error(
        "Resolve the conflicting assessment or capstone evidence before importing.",
      );
    }
    const accountProgress = remoteProgress.current;
    if (!accountProgress) {
      throw new Error("The account progress record is not available.");
    }
    setSyncStatus("syncing");
    const importId = await createProgressImportId(progress);
    try {
      const createdAt =
        migrationRecovery?.state === "pending" &&
        migrationRecovery.importId === importId
          ? migrationRecovery.createdAt
          : new Date().toISOString();
      const pendingRecovery: ProgressMigrationRecoveryEnvelope = {
        schemaVersion: 1,
        importId,
        localProgress: progress,
        remoteProgress: accountProgress,
        mergedProgress: migrationPreview.mergedProgress,
        createdAt,
        state: "pending",
      };
      window.localStorage.setItem(
        migrationRecoveryKey,
        JSON.stringify(pendingRecovery),
      );
      setMigrationRecovery(pendingRecovery);
      const response = await apiFetch("/v1/me/progress", {
        method: "POST",
        body: JSON.stringify({
          importId,
          source: "browser-local-v1",
          progress: migrationPreview.mergedProgress,
        }),
      });
      const body = (await response.json()) as {
        progress?: {
          revision: number;
          progress: LearnerProgress;
        };
        error?: { message?: string };
      };
      if (!response.ok || !body.progress) {
        throw new Error(body.error?.message ?? "Progress could not be migrated.");
      }
      const synchronized = {
        ...body.progress.progress,
        capstoneSubmissions: body.progress.progress.capstoneSubmissions ?? [],
      };
      const completedRecovery: ProgressMigrationRecoveryEnvelope = {
        schemaVersion: 1,
        importId,
        localProgress: progress,
        remoteProgress: accountProgress,
        mergedProgress: synchronized,
        createdAt: pendingRecovery.createdAt,
        completedAt: timestampNotBefore(pendingRecovery.createdAt),
        state: "completed",
      };
      window.localStorage.setItem(
        migrationRecoveryKey,
        JSON.stringify(completedRecovery),
      );
      setMigrationRecovery(completedRecovery);
      remoteProgress.current = synchronized;
      lastSynchronized.current = JSON.stringify(synchronized);
      currentProgress.current = synchronized;
      setProgress(synchronized);
      setMigrationPreview(null);
      synchronizationEnabled.current = true;
      setSyncStatus("synced");
    } catch (caught) {
      setSyncStatus("migration-available");
      throw caught;
    }
  }, [account, apiFetch, migrationPreview, migrationRecovery, progress]);

  const verifyMigrationExport = useCallback(async (): Promise<unknown> => {
    if (!account || account.state !== "approved") {
      throw new Error("An approved account is required.");
    }
    if (!migrationRecovery || migrationRecovery.state !== "completed") {
      throw new Error("A completed browser migration backup is required.");
    }
    const response = await apiFetch("/v1/me/export");
    const body = (await response.json()) as {
      export?: unknown;
      error?: { code?: string; message?: string };
    };
    if (!response.ok || !body.export) {
      if (body.error?.code === "recent_authentication_required") {
        throw new Error(
          "Sign out and sign in again before verifying this sensitive export.",
        );
      }
      throw new Error(
        body.error?.message ?? "The account export could not be verified.",
      );
    }
    const exported = body.export;
    if (
      !exported ||
      typeof exported !== "object" ||
      !("progress" in exported) ||
      !exported.progress ||
      typeof exported.progress !== "object" ||
      !("revision" in exported.progress) ||
      typeof exported.progress.revision !== "number" ||
      !Number.isInteger(exported.progress.revision) ||
      exported.progress.revision < 1 ||
      !("progress" in exported.progress) ||
      canonicalProgressValue(exported.progress.progress) !==
        canonicalProgressValue(migrationRecovery.mergedProgress)
    ) {
      throw new Error(
        "The account export does not match the retained browser migration record.",
      );
    }
    const verified: ProgressMigrationRecoveryEnvelope = {
      ...migrationRecovery,
      verifiedExportAt: timestampNotBefore(migrationRecovery.completedAt),
      verifiedRevision: exported.progress.revision,
    };
    window.localStorage.setItem(
      migrationRecoveryKey,
      JSON.stringify(verified),
    );
    setMigrationRecovery(verified);
    return exported;
  }, [account, apiFetch, migrationRecovery]);

  const removeMigrationRecovery = useCallback(() => {
    window.localStorage.removeItem(migrationRecoveryKey);
    setMigrationRecovery(null);
  }, []);

  const value = useMemo(
    () => ({
      progress,
      migrationPreview,
      localRecordRecovery,
      migrationRecovery,
      hydrated,
      storageStatus,
      syncStatus,
      migrateLocalToAccount,
      verifyMigrationExport,
      removeMigrationRecovery,
      recordResult,
      recordCapstone,
      recordVisit,
      replaceProgress,
      rename,
      reset,
    }),
    [
      progress,
      migrationPreview,
      localRecordRecovery,
      migrationRecovery,
      hydrated,
      storageStatus,
      syncStatus,
      migrateLocalToAccount,
      verifyMigrationExport,
      removeMigrationRecovery,
      recordResult,
      recordCapstone,
      recordVisit,
      replaceProgress,
      rename,
      reset,
    ],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error("useProgress must be used inside ProgressProvider");
  return context;
}
