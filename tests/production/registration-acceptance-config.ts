import { accessSync, constants } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export const REGISTRATION_ACCEPTANCE_CONFIRMATION =
  "I_UNDERSTAND_THIS_USES_A_PRIVATE_PRODUCTION_REGISTRATION_RECEIPT";

export interface RegistrationAcceptanceConfig {
  apiOrigin: string;
  learnOrigin: string;
  requestedAt: string;
  runId: string;
  statePath: string;
}

function required(environment: NodeJS.ProcessEnv, name: string) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function productionOrigin(value: string, name: string) {
  const url = new URL(value);
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

export function readRegistrationAcceptanceConfig(
  environment: NodeJS.ProcessEnv = process.env,
  repositoryRoot = process.cwd(),
): RegistrationAcceptanceConfig {
  if (
    environment.PROJECT42_REGISTRATION_ACCEPTANCE_CONFIRMATION !==
    REGISTRATION_ACCEPTANCE_CONFIRMATION
  ) {
    throw new Error(
      "Production registration acceptance is disabled. Supply the exact receipt-use confirmation.",
    );
  }

  const stateValue = required(
    environment,
    "PROJECT42_REGISTRATION_ACCEPTANCE_STATE",
  );
  if (!isAbsolute(stateValue)) {
    throw new Error(
      "PROJECT42_REGISTRATION_ACCEPTANCE_STATE must be an absolute path outside the repository.",
    );
  }
  const statePath = resolve(stateValue);
  const repositoryRelative = relative(resolve(repositoryRoot), statePath);
  if (
    repositoryRelative === "" ||
    (!repositoryRelative.startsWith("..") && !isAbsolute(repositoryRelative))
  ) {
    throw new Error(
      "PROJECT42_REGISTRATION_ACCEPTANCE_STATE must be stored outside the repository.",
    );
  }
  accessSync(statePath, constants.R_OK);

  const requestedAt = required(
    environment,
    "PROJECT42_REGISTRATION_ACCEPTANCE_REQUESTED_AT",
  );
  const requestedAtDate = new Date(requestedAt);
  if (
    Number.isNaN(requestedAtDate.valueOf()) ||
    requestedAtDate.toISOString() !== requestedAt
  ) {
    throw new Error(
      "PROJECT42_REGISTRATION_ACCEPTANCE_REQUESTED_AT must be a canonical ISO-8601 UTC timestamp.",
    );
  }

  const runId = required(environment, "PROJECT42_REGISTRATION_ACCEPTANCE_RUN_ID");
  if (!/^[a-z0-9](?:[a-z0-9-]{6,62}[a-z0-9])$/.test(runId)) {
    throw new Error(
      "PROJECT42_REGISTRATION_ACCEPTANCE_RUN_ID must contain 8-64 lowercase letters, digits, or internal hyphens.",
    );
  }

  return {
    apiOrigin: productionOrigin(
      required(environment, "PROJECT42_REGISTRATION_ACCEPTANCE_API_ORIGIN"),
      "PROJECT42_REGISTRATION_ACCEPTANCE_API_ORIGIN",
    ),
    learnOrigin: productionOrigin(
      required(environment, "PROJECT42_REGISTRATION_ACCEPTANCE_LEARN_ORIGIN"),
      "PROJECT42_REGISTRATION_ACCEPTANCE_LEARN_ORIGIN",
    ),
    requestedAt,
    runId,
    statePath,
  };
}
