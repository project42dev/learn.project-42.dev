import { accessSync, constants, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export const PRODUCTION_PROGRESS_ACCEPTANCE_CONFIRMATION =
  "I_UNDERSTAND_THIS_WRITES_IMMUTABLE_PRODUCTION_LEARNER_DATA";

export type BackupDecision = "retain" | "remove-after-verified-export";

export interface ProductionProgressAcceptanceConfig {
  accountId: string;
  apiOrigin: string;
  backupDecision: BackupDecision;
  learnOrigin: string;
  occurredAt: string;
  primaryStatePath: string;
  runId: string;
  secondaryStatePath: string;
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function secureOrigin(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTPS origin.`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1"
  ) {
    throw new Error(`${name} must be an absolute production HTTPS origin.`);
  }
  return url.origin;
}

function privateStatePath(value: string, name: string, repositoryRoot: string) {
  if (!isAbsolute(value)) {
    throw new Error(`${name} must be an absolute path outside the repository.`);
  }
  const absolute = resolve(value);
  accessSync(absolute, constants.R_OK);
  const realStatePath = realpathSync(absolute);
  const realRepositoryRoot = realpathSync(resolve(repositoryRoot));
  const repositoryRelative = relative(realRepositoryRoot, realStatePath);
  if (
    repositoryRelative === "" ||
    (!repositoryRelative.startsWith("..") && !isAbsolute(repositoryRelative))
  ) {
    throw new Error(`${name} must be stored outside the repository.`);
  }
  return realStatePath;
}

export function readProductionProgressAcceptanceConfig(
  environment: NodeJS.ProcessEnv = process.env,
  repositoryRoot = process.cwd(),
): ProductionProgressAcceptanceConfig {
  if (
    environment.PROJECT42_PROGRESS_ACCEPTANCE_CONFIRMATION !==
    PRODUCTION_PROGRESS_ACCEPTANCE_CONFIRMATION
  ) {
    throw new Error(
      "Production progress acceptance is disabled. Supply the exact mutation confirmation.",
    );
  }

  const primaryStatePath = privateStatePath(
    required(environment, "PROJECT42_PROGRESS_ACCEPTANCE_PRIMARY_STATE"),
    "PROJECT42_PROGRESS_ACCEPTANCE_PRIMARY_STATE",
    repositoryRoot,
  );
  const secondaryStatePath = privateStatePath(
    required(environment, "PROJECT42_PROGRESS_ACCEPTANCE_SECONDARY_STATE"),
    "PROJECT42_PROGRESS_ACCEPTANCE_SECONDARY_STATE",
    repositoryRoot,
  );
  if (primaryStatePath.toLowerCase() === secondaryStatePath.toLowerCase()) {
    throw new Error("Two distinct authenticated browser state files are required.");
  }

  const accountId = required(
    environment,
    "PROJECT42_PROGRESS_ACCEPTANCE_ACCOUNT_ID",
  );
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,255}$/.test(accountId)) {
    throw new Error(
      "PROJECT42_PROGRESS_ACCEPTANCE_ACCOUNT_ID must be an opaque account identifier.",
    );
  }

  const runId = required(environment, "PROJECT42_PROGRESS_ACCEPTANCE_RUN_ID");
  if (!/^[a-z0-9](?:[a-z0-9-]{6,62}[a-z0-9])$/.test(runId)) {
    throw new Error(
      "PROJECT42_PROGRESS_ACCEPTANCE_RUN_ID must contain 8-64 lowercase letters, digits, or internal hyphens.",
    );
  }

  const occurredAt = required(
    environment,
    "PROJECT42_PROGRESS_ACCEPTANCE_OCCURRED_AT",
  );
  const occurredAtDate = new Date(occurredAt);
  if (
    Number.isNaN(occurredAtDate.valueOf()) ||
    occurredAtDate.toISOString() !== occurredAt
  ) {
    throw new Error(
      "PROJECT42_PROGRESS_ACCEPTANCE_OCCURRED_AT must be a canonical ISO-8601 UTC timestamp.",
    );
  }

  const backupDecision = required(
    environment,
    "PROJECT42_PROGRESS_ACCEPTANCE_BACKUP_DECISION",
  );
  if (
    backupDecision !== "retain" &&
    backupDecision !== "remove-after-verified-export"
  ) {
    throw new Error(
      "PROJECT42_PROGRESS_ACCEPTANCE_BACKUP_DECISION must be retain or remove-after-verified-export.",
    );
  }

  return {
    accountId,
    apiOrigin: secureOrigin(
      required(environment, "PROJECT42_PROGRESS_ACCEPTANCE_API_ORIGIN"),
      "PROJECT42_PROGRESS_ACCEPTANCE_API_ORIGIN",
    ),
    backupDecision,
    learnOrigin: secureOrigin(
      required(environment, "PROJECT42_PROGRESS_ACCEPTANCE_LEARN_ORIGIN"),
      "PROJECT42_PROGRESS_ACCEPTANCE_LEARN_ORIGIN",
    ),
    occurredAt,
    primaryStatePath,
    runId,
    secondaryStatePath,
  };
}
