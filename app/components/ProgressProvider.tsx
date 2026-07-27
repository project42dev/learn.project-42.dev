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
import { useAuth } from "./AuthProvider";

const storageKey = "project42.progress.v1";
type StorageStatus = "ready" | "unavailable" | "write-error";
type SyncStatus =
  | "local-only"
  | "checking"
  | "migration-available"
  | "syncing"
  | "synced"
  | "blocked"
  | "error";

interface ProgressContextValue {
  progress: LearnerProgress;
  hydrated: boolean;
  storageStatus: StorageStatus;
  syncStatus: SyncStatus;
  migrateLocalToAccount: () => Promise<void>;
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

function safeReadProgress(): {
  progress: LearnerProgress;
  storageStatus: StorageStatus;
} {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { progress: createEmptyProgress(), storageStatus: "ready" };
    const parsed = JSON.parse(raw) as Partial<LearnerProgress>;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.attempts)) {
      return { progress: createEmptyProgress(), storageStatus: "unavailable" };
    }
    return {
      progress: {
        ...(parsed as LearnerProgress),
        capstoneSubmissions: parsed.capstoneSubmissions ?? [],
      },
      storageStatus: "ready",
    };
  } catch {
    return { progress: createEmptyProgress(), storageStatus: "unavailable" };
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { account, apiFetch } = useAuth();
  const [progress, setProgress] = useState<LearnerProgress>(() => createEmptyProgress());
  const [hydrated, setHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("ready");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local-only");
  const synchronizationEnabled = useRef(false);
  const lastSynchronized = useRef("");
  const currentProgress = useRef(progress);

  useEffect(() => {
    currentProgress.current = progress;
  }, [progress]);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const stored = safeReadProgress();
      setProgress(stored.progress);
      setStorageStatus(stored.storageStatus);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let nextStatus: StorageStatus = "ready";
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      nextStatus = "write-error";
    }
    const statusTimer = window.setTimeout(() => setStorageStatus(nextStatus), 0);
    return () => window.clearTimeout(statusTimer);
  }, [hydrated, progress]);

  useEffect(() => {
    synchronizationEnabled.current = false;
    lastSynchronized.current = "";
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!hydrated || !account) {
        setSyncStatus("local-only");
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
          const localHasProgress =
            local.completedModuleIds.length > 0 ||
            local.attempts.length > 0 ||
            (local.capstoneSubmissions?.length ?? 0) > 0 ||
            local.badges.length > 0;
          if (remote.revision === 0 && localHasProgress) {
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
  }, [account, apiFetch, hydrated]);

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

  const replaceProgress = useCallback((replacement: LearnerProgress) => {
    setProgress(structuredClone(replacement));
  }, []);

  const reset = useCallback(() => {
    setProgress(createEmptyProgress());
  }, []);

  const migrateLocalToAccount = useCallback(async () => {
    if (!account || account.state !== "approved") {
      throw new Error("An approved account is required.");
    }
    setSyncStatus("syncing");
    const serialized = JSON.stringify(progress);
    const response = await apiFetch("/v1/me/progress", {
      method: "POST",
      body: JSON.stringify({
        importId: crypto.randomUUID(),
        source: "browser-local-v1",
        progress,
      }),
    });
    if (!response.ok) {
      setSyncStatus("error");
      const body = (await response.json()) as { error?: { message?: string } };
      throw new Error(body.error?.message ?? "Progress could not be migrated.");
    }
    lastSynchronized.current = serialized;
    synchronizationEnabled.current = true;
    setSyncStatus("synced");
  }, [account, apiFetch, progress]);

  const value = useMemo(
    () => ({
      progress,
      hydrated,
      storageStatus,
      syncStatus,
      migrateLocalToAccount,
      recordResult,
      recordCapstone,
      recordVisit,
      replaceProgress,
      rename,
      reset,
    }),
    [
      progress,
      hydrated,
      storageStatus,
      syncStatus,
      migrateLocalToAccount,
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
