import { SKINS, setSkin, useStoredSkin, type SkinChoice } from "../lib/skin";

/** My Profile → Theme. The same heading and native select as "Bible version" above it.
 * A choice applies at once and is remembered on this device only (lib/skin.tsx). */
const OPTIONS: ReadonlyArray<{ id: SkinChoice; label: string }> = [
  { id: "default", label: "Default" },
  ...SKINS.map((s) => ({ id: s.id as SkinChoice, label: s.label })),
];

export default function SkinPicker() {
  const choice = useStoredSkin();
  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <label className="auth-settings-label" htmlFor="myprofile-theme">
        Theme
      </label>
      <select id="myprofile-theme" value={choice} onChange={(e) => setSkin(e.target.value as SkinChoice)}>
        {OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
