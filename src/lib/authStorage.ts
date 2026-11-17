// Where Supabase keeps the signed-in session.
//
// Browser: exactly what it always was. localStorage when "Remember me" is on, sessionStorage when it
// is off. Nothing in this file touches Capacitor in a browser, and the Preferences plugin is loaded
// with a dynamic import so a browser never downloads it.
//
// Native (iOS / Android app): the OS may reclaim WebView localStorage under storage pressure, which
// would sign people out at random. Capacitor's own guidance is to keep anything that matters in the
// Preferences plugin (UserDefaults / SharedPreferences), so the session lives there. A session
// written by an earlier build into localStorage is migrated on first read, then removed.
import { Capacitor } from "@capacitor/core";

const REMEMBER_ME_KEY = "bible-atlas-remember-me";

export const isNativeAuthStorage = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/** Whether the current login session should persist across restarts or only for this session. */
export function getRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setRememberMe(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, String(remember));
  } catch {
    /* storage blocked: default (remember) applies */
  }
}

type AuthStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

const browserStorage: AuthStorage = {
  getItem: (key) => (getRememberMe() ? window.localStorage : window.sessionStorage).getItem(key),
  setItem: (key, value) => {
    const remember = getRememberMe();
    (remember ? window.localStorage : window.sessionStorage).setItem(key, value);
    (remember ? window.sessionStorage : window.localStorage).removeItem(key);
  },
  removeItem: (key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

const prefs = () => import("@capacitor/preferences").then((m) => m.Preferences);

const nativeStorage: AuthStorage = {
  async getItem(key) {
    // "Remember me" off: keep it for this app run only, as the browser does.
    if (!getRememberMe()) return window.sessionStorage.getItem(key);
    const P = await prefs();
    const { value } = await P.get({ key });
    if (value !== null && value !== undefined) return value;
    // One-time migration from the pre-Preferences build. Write first, remove only after the write
    // succeeded, so a failure here can never lose the session.
    let legacy: string | null = null;
    try {
      legacy = window.localStorage.getItem(key);
    } catch {
      /* ignore */
    }
    if (legacy !== null) {
      await P.set({ key, value: legacy });
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return legacy;
    }
    return null;
  },
  async setItem(key, value) {
    if (!getRememberMe()) {
      window.sessionStorage.setItem(key, value);
      const P = await prefs();
      await P.remove({ key });
      return;
    }
    const P = await prefs();
    await P.set({ key, value });
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  async removeItem(key) {
    const P = await prefs();
    await P.remove({ key });
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const authStorage: AuthStorage = isNativeAuthStorage() ? nativeStorage : browserStorage;
