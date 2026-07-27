import { useState } from "react";
import { supabase } from "../lib/supabase";

interface DisplayNameGateProps {
  userId: string;
  onSaved: () => void;
}

/** Blocks the app for real accounts created before display names existed, until they set one — a
 * one-time prompt, not shown again once profiles.display_name is set. New signups never see this;
 * they set their name in the signup form itself. */
export default function DisplayNameGate({ userId, onSaved }: DisplayNameGateProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", userId);
    setSaving(false);
    if (err) {
      setError(err.code === "23505" ? "That name is taken — try another." : "Couldn't save — try again.");
      return;
    }
    onSaved();
  };

  return (
    <div className="display-name-gate-overlay">
      <div className="display-name-gate-card">
        <h3>What should friends call you?</h3>
        <p>Pick a display name — this is what shows up in Friends and Messages instead of your email.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display Name"
            autoFocus
            required
          />
          <button type="submit" disabled={saving || !name.trim()}>
            {saving ? "…" : "Continue"}
          </button>
        </form>
        {error && <p className="auth-status auth-error">{error}</p>}
      </div>
    </div>
  );
}
