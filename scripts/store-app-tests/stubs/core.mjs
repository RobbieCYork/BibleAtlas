// Test stub for @capacitor/core. `globalThis.__native` flips native on and off.
export const Capacitor = {
  isNativePlatform: () => !!globalThis.__native,
  getPlatform: () => (globalThis.__native ? "ios" : "web"),
};
