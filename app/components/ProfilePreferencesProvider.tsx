"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface ProfilePreferences {
  locale: string;
  timeZone: string;
  reducedMotion: boolean;
  highContrast: boolean;
}

interface ProfilePreferencesContextValue {
  preferences: ProfilePreferences;
  ready: boolean;
  applySessionPreferences: (preferences: ProfilePreferences) => boolean;
  savePreferences: (preferences: ProfilePreferences) => { persisted: boolean };
  resetPreferences: () => { persisted: boolean };
  formatDate: (value: string | number | Date) => string;
  formatDateTime: (value: string | number | Date) => string;
}

const storageKey = "project42.profile-preferences.v1";
const serverDefaults: ProfilePreferences = {
  locale: "en-US",
  timeZone: "UTC",
  reducedMotion: false,
  highContrast: false,
};

const ProfilePreferencesContext =
  createContext<ProfilePreferencesContextValue | null>(null);

function canonicalLocale(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    return Intl.getCanonicalLocales(value.trim())[0] ?? null;
  } catch {
    return null;
  }
}

function canonicalTimeZone(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: value.trim(),
    }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

function browserDefaults(): ProfilePreferences {
  const resolved = new Intl.DateTimeFormat().resolvedOptions();
  return {
    locale: canonicalLocale(resolved.locale) ?? serverDefaults.locale,
    timeZone: canonicalTimeZone(resolved.timeZone) ?? serverDefaults.timeZone,
    reducedMotion: false,
    highContrast: false,
  };
}

function parseStoredPreferences(
  value: string | null,
  defaults: ProfilePreferences,
): ProfilePreferences | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<ProfilePreferences>;
    const locale = canonicalLocale(candidate.locale);
    const timeZone = canonicalTimeZone(candidate.timeZone);
    if (!locale || !timeZone) return null;
    return {
      locale,
      timeZone,
      reducedMotion:
        typeof candidate.reducedMotion === "boolean"
          ? candidate.reducedMotion
          : defaults.reducedMotion,
      highContrast:
        typeof candidate.highContrast === "boolean"
          ? candidate.highContrast
          : defaults.highContrast,
    };
  } catch {
    return null;
  }
}

export function validateProfilePreferences(
  candidate: ProfilePreferences,
): ProfilePreferences | null {
  const locale = canonicalLocale(candidate.locale);
  const timeZone = canonicalTimeZone(candidate.timeZone);
  if (!locale || !timeZone) return null;
  return {
    locale,
    timeZone,
    reducedMotion: candidate.reducedMotion,
    highContrast: candidate.highContrast,
  };
}

export function ProfilePreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preferences, setPreferences] =
    useState<ProfilePreferences>(serverDefaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const defaults = browserDefaults();
    let stored: ProfilePreferences | null = null;
    try {
      stored = parseStoredPreferences(
        window.localStorage.getItem(storageKey),
        defaults,
      );
    } catch {
      // Storage can be unavailable in privacy modes. In-memory preferences still work.
    }
    const timer = window.setTimeout(() => {
      setPreferences(stored ?? defaults);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (preferences.reducedMotion) {
      root.dataset.project42ReducedMotion = "true";
    } else {
      delete root.dataset.project42ReducedMotion;
    }
    if (preferences.highContrast) {
      root.dataset.project42HighContrast = "true";
    } else {
      delete root.dataset.project42HighContrast;
    }
  }, [preferences]);

  const applySessionPreferences = useCallback(
    (next: ProfilePreferences): boolean => {
      const validated = validateProfilePreferences(next);
      if (!validated) return false;
      setPreferences(validated);
      return true;
    },
    [],
  );

  const savePreferences = useCallback(
    (next: ProfilePreferences): { persisted: boolean } => {
      setPreferences(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        return { persisted: true };
      } catch {
        return { persisted: false };
      }
    },
    [],
  );

  const value = useMemo<ProfilePreferencesContextValue>(() => {
    function format(
      input: string | number | Date,
      options: Intl.DateTimeFormatOptions,
    ): string {
      const date = new Date(input);
      if (Number.isNaN(date.valueOf())) return "Date unavailable";
      try {
        return new Intl.DateTimeFormat(preferences.locale, {
          ...options,
          timeZone: preferences.timeZone,
        }).format(date);
      } catch {
        return new Intl.DateTimeFormat(serverDefaults.locale, {
          ...options,
          timeZone: serverDefaults.timeZone,
        }).format(date);
      }
    }

    return {
      preferences,
      ready,
      applySessionPreferences,
      savePreferences,
      resetPreferences: () => savePreferences(browserDefaults()),
      formatDate: (input) => format(input, { dateStyle: "medium" }),
      formatDateTime: (input) =>
        format(input, { dateStyle: "medium", timeStyle: "short" }),
    };
  }, [applySessionPreferences, preferences, ready, savePreferences]);

  return (
    <ProfilePreferencesContext.Provider value={value}>
      {children}
    </ProfilePreferencesContext.Provider>
  );
}

export function useProfilePreferences(): ProfilePreferencesContextValue {
  const context = useContext(ProfilePreferencesContext);
  if (!context) {
    throw new Error(
      "useProfilePreferences must be used inside ProfilePreferencesProvider",
    );
  }
  return context;
}
