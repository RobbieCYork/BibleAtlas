export const Directory = { Cache: "CACHE" };
export const Filesystem = {
  async writeFile(o) { globalThis.__shareCalls.push({ wrote: o.path }); return { uri: "file:///cache/" + o.path }; },
  async deleteFile() {},
};
