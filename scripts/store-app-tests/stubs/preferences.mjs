export const Preferences = {
  async get({ key }) { return { value: globalThis.__prefs.has(key) ? globalThis.__prefs.get(key) : null }; },
  async set({ key, value }) { globalThis.__prefs.set(key, value); },
  async remove({ key }) { globalThis.__prefs.delete(key); },
};
