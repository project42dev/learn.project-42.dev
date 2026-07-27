"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AccountState = "pending" | "approved" | "suspended" | "revoked";
export type AccountRole = "learner" | "owner";

export interface Project42Account {
  id: string;
  installationId: string;
  identity: { issuer: string; subject: string };
  displayName: string | null;
  primaryEmail: string | null;
  emailVerified: boolean;
  state: AccountState;
  roles: AccountRole[];
  createdAt: string;
  updatedAt: string;
}

type AuthStatus =
  | "unavailable"
  | "loading"
  | "signed-out"
  | "signing-in"
  | "signed-in"
  | "error";

interface AuthContextValue {
  configured: boolean;
  status: AuthStatus;
  account: Project42Account | null;
  error: string | null;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  completeSignIn: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  signIn: (returnPath?: string) => Promise<void>;
  signOut: () => void;
}

interface OidcDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
}

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

const authority = process.env.NEXT_PUBLIC_PROJECT42_OIDC_AUTHORITY?.replace(/\/$/, "");
const clientId = process.env.NEXT_PUBLIC_PROJECT42_OIDC_CLIENT_ID;
const apiOrigin = process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN?.replace(/\/$/, "");
const scope =
  process.env.NEXT_PUBLIC_PROJECT42_OIDC_SCOPE ?? "openid profile email project42.api";
const configured = Boolean(authority && clientId && apiOrigin);
const tokenKey = "project42.auth.token.v1";
const flowKey = "project42.auth.flow.v1";

const AuthContext = createContext<AuthContextValue | null>(null);

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function randomValue(size = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64Url(new Uint8Array(digest));
}

async function discover(): Promise<OidcDiscovery> {
  if (!authority) throw new Error("OIDC authority is not configured.");
  const response = await fetch(`${authority}/.well-known/openid-configuration`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Identity provider metadata could not be loaded.");
  const value = (await response.json()) as Partial<OidcDiscovery>;
  if (!value.authorization_endpoint || !value.token_endpoint) {
    throw new Error("Identity provider metadata is missing required endpoints.");
  }
  return value as OidcDiscovery;
}

function readToken(): StoredToken | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(tokenKey) ?? "null") as StoredToken | null;
    if (
      !parsed ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now() + 30_000
    ) {
      sessionStorage.removeItem(tokenKey);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(tokenKey);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    configured ? "loading" : "unavailable",
  );
  const [account, setAccount] = useState<Project42Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!apiOrigin) throw new Error("Project 42 API is not configured.");
    const token = readToken();
    if (!token) throw new Error("Sign in is required.");
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token.accessToken}`);
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return fetch(`${apiOrigin}${path}`, { ...init, headers, cache: "no-store" });
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!configured) return;
    const token = readToken();
    if (!token) {
      setAccount(null);
      setStatus("signed-out");
      return;
    }
    setStatus("loading");
    try {
      const response = await apiFetch("/v1/session", { method: "POST" });
      const body = (await response.json()) as {
        account?: Project42Account;
        error?: { message?: string };
      };
      if (!response.ok || !body.account) {
        throw new Error(body.error?.message ?? "The account could not be loaded.");
      }
      setAccount(body.account);
      setError(null);
      setStatus("signed-in");
    } catch (caught) {
      setAccount(null);
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
      setStatus("error");
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!configured) return;
    const timer = window.setTimeout(() => void refreshAccount(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshAccount]);

  const signIn = useCallback(async (returnPath = "/account") => {
    if (!authority || !clientId) return;
    setStatus("signing-in");
    setError(null);
    const metadata = await discover();
    const verifier = randomValue(48);
    const state = randomValue();
    const redirectUri = `${window.location.origin}/auth/callback`;
    const safeReturnPath =
      returnPath.startsWith("/") && !returnPath.startsWith("//")
        ? returnPath
        : "/account";
    sessionStorage.setItem(
      flowKey,
      JSON.stringify({ verifier, state, redirectUri, returnPath: safeReturnPath }),
    );
    const target = new URL(metadata.authorization_endpoint);
    target.searchParams.set("client_id", clientId);
    target.searchParams.set("redirect_uri", redirectUri);
    target.searchParams.set("response_type", "code");
    target.searchParams.set("scope", scope);
    target.searchParams.set("state", state);
    target.searchParams.set("code_challenge", await pkceChallenge(verifier));
    target.searchParams.set("code_challenge_method", "S256");
    window.location.assign(target.toString());
  }, []);

  const completeSignIn = useCallback(async () => {
    if (!clientId) throw new Error("OIDC client is not configured.");
    const query = new URLSearchParams(window.location.search);
    const providerError = query.get("error");
    if (providerError) {
      throw new Error(query.get("error_description") ?? providerError);
    }
    const code = query.get("code");
    const returnedState = query.get("state");
    const rawFlow = sessionStorage.getItem(flowKey);
    sessionStorage.removeItem(flowKey);
    if (!code || !returnedState || !rawFlow) {
      throw new Error("The sign-in response is incomplete.");
    }
    const flow = JSON.parse(rawFlow) as {
      verifier: string;
      state: string;
      redirectUri: string;
      returnPath: string;
    };
    if (flow.state !== returnedState) {
      throw new Error("The sign-in state did not match.");
    }
    const metadata = await discover();
    const response = await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: flow.redirectUri,
        code_verifier: flow.verifier,
      }),
    });
    const value = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!response.ok || !value.access_token) {
      throw new Error(value.error_description ?? "The authorization code was rejected.");
    }
    sessionStorage.setItem(
      tokenKey,
      JSON.stringify({
        accessToken: value.access_token,
        expiresAt: Date.now() + Math.max(60, value.expires_in ?? 300) * 1_000,
      } satisfies StoredToken),
    );
    await refreshAccount();
    window.history.replaceState({}, "", flow.returnPath);
    window.location.replace(flow.returnPath);
  }, [refreshAccount]);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(flowKey);
    setAccount(null);
    setError(null);
    setStatus(configured ? "signed-out" : "unavailable");
  }, []);

  const value = useMemo(
    () => ({
      configured,
      status,
      account,
      error,
      apiFetch,
      completeSignIn,
      refreshAccount,
      signIn,
      signOut,
    }),
    [
      status,
      account,
      error,
      apiFetch,
      completeSignIn,
      refreshAccount,
      signIn,
      signOut,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
