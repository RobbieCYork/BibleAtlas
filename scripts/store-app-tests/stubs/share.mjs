export const Share = { async share(o) { globalThis.__shareCalls.push(o); if (globalThis.__shareThrow) throw new Error(globalThis.__shareThrow); } };
