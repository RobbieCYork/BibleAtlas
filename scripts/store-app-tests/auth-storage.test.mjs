import { load, fakeStorage, check, done } from "./bundle.mjs";
const KEY = "sb-x-auth-token";
async function fresh(native) {
  globalThis.__native = native;
  globalThis.__prefs = new Map();
  globalThis.window = { localStorage: fakeStorage(), sessionStorage: fakeStorage() };
  globalThis.localStorage = window.localStorage;
  return load("src/lib/authStorage.ts");
}
// Browser: identical behaviour to the pre-change code.
let m = await fresh(false);
await m.authStorage.setItem(KEY, "S1");
check("browser: remember -> localStorage", window.localStorage.getItem(KEY) === "S1" && globalThis.__prefs.size === 0);
check("browser: get is synchronous", m.authStorage.getItem(KEY) === "S1");
m.setRememberMe(false);
m.authStorage.setItem(KEY, "S2");
check("browser: no-remember -> sessionStorage, local cleared", window.sessionStorage.getItem(KEY) === "S2" && window.localStorage.getItem(KEY) === null);
m.authStorage.removeItem(KEY);
check("browser: remove clears both", window.sessionStorage.getItem(KEY) === null);
// Native.
m = await fresh(true);
window.localStorage.setItem(KEY, "OLD");
check("native: migrates legacy localStorage session", (await m.authStorage.getItem(KEY)) === "OLD" && globalThis.__prefs.get(KEY) === "OLD" && window.localStorage.getItem(KEY) === null);
check("native: second read comes from Preferences", (await m.authStorage.getItem(KEY)) === "OLD");
await m.authStorage.setItem(KEY, "NEW");
check("native: set writes Preferences only", globalThis.__prefs.get(KEY) === "NEW" && window.localStorage.getItem(KEY) === null);
await m.authStorage.removeItem(KEY);
check("native: remove clears Preferences", !globalThis.__prefs.has(KEY) && (await m.authStorage.getItem(KEY)) === null);
m.setRememberMe(false);
await m.authStorage.setItem(KEY, "TMP");
check("native: no-remember stays out of Preferences", !globalThis.__prefs.has(KEY) && window.sessionStorage.getItem(KEY) === "TMP");
done();
