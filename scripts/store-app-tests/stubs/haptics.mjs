export const ImpactStyle = { Light: "LIGHT", Medium: "MEDIUM" };
export const NotificationType = { Success: "SUCCESS", Error: "ERROR" };
export const Haptics = {
  async impact(o) { globalThis.__hap.push("impact:" + o.style); },
  async notification(o) { globalThis.__hap.push("notify:" + o.type); },
};
