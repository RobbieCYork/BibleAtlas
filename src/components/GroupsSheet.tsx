import { useCallback, useEffect, useMemo, useState } from "react";
import "./Groups.css";
import {
  addGroupSeats,
  consumeGroupsReturn,
  createGroupClass,
  fetchMyClasses,
  fetchRoster,
  joinClassByCode,
  leaveClass,
  prepareLogo,
  startGroupCheckout,
  uploadOrgLogo,
  type MyClass,
  type RosterRow,
} from "../lib/groups";
import { GROUP_AGREEMENT_IS_DRAFT, GROUP_AGREEMENT_TEXT } from "../lib/groupAgreement";
import {
  cap,
  groupEstimate,
  groupWording,
  GROUP_MAX_SEATS,
  GROUP_MIN_SEATS,
  type GroupInterval,
  type GroupKind,
} from "../lib/groupWording";

/**
 * Capstone Plus for Groups (sql/047): "My classes & groups", join with a code, and "Start a group".
 * Rendered only when groups_status() says the switch is on (AuthButton checks useGroupsEnabled), and
 * lazy-loaded so none of it is in the main bundle. Every word that differs between a school class and
 * a church group comes from groupWording(kind).
 */
export default function GroupsSheet({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<"list" | "start">("list");
  const [classes, setClasses] = useState<MyClass[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setClasses(await fetchMyClasses());
  }, []);

  useEffect(() => {
    const ret = consumeGroupsReturn();
    if (ret === "success") setNotice("Thank you! Your payment was received. Your class or group opens as soon as Stripe confirms it.");
    if (ret === "cancel") setNotice("Checkout was cancelled. Nothing was charged.");
    void reload();
  }, [reload]);

  return (
    <div className="report-sheet groups-sheet" role="dialog" aria-label="Classes and groups">
      <div className="report-sheet-head">
        <button type="button" className="auth-back-link" onClick={view === "start" ? () => setView("list") : onClose}>
          ← Back
        </button>
        <h3 className="report-sheet-title">{view === "start" ? "Start a class or group" : "Classes & Groups"}</h3>
      </div>
      <div className="report-sheet-body">
        {notice && (
          <p className="auth-status groups-notice" role="status">
            {notice}
          </p>
        )}
        {view === "list" ? (
          <ClassList classes={classes} onStart={() => setView("start")} onChanged={reload} />
        ) : (
          <StartGroupForm />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------- the list
function ClassList({ classes, onStart, onChanged }: { classes: MyClass[] | null; onStart: () => void; onChanged: () => Promise<void> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    setJoined(null);
    try {
      const r = await joinClassByCode(code);
      setJoined(`You joined ${r.name}. Capstone Plus is included while you're in it.`);
      setCode("");
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const leading = (classes ?? []).filter((c) => c.role !== "member");
  const inIt = (classes ?? []).filter((c) => c.role === "member");

  return (
    <div className="groups-list" data-tier="plus">
      <p className="report-intro">
        Capstone Plus for a whole class or small group. The teacher or leader pays per seat, and everyone in it gets Capstone Plus.
      </p>

      {classes === null && <p className="report-intro">Loading…</p>}

      {leading.length > 0 && (
        <section className="groups-section" aria-label="Classes and groups you lead">
          <h4 className="groups-h">You lead</h4>
          {leading.map((c) => (
            <StaffCard key={c.classId} c={c} onChanged={onChanged} />
          ))}
        </section>
      )}

      {inIt.length > 0 && (
        <section className="groups-section" aria-label="Classes and groups you are in">
          <h4 className="groups-h">You're in</h4>
          {inIt.map((c) => (
            <MemberCard key={c.classId} c={c} onChanged={onChanged} />
          ))}
        </section>
      )}

      <section className="groups-section groups-join">
        <h4 className="groups-h">Join with a code</h4>
        <p className="groups-small">
          Your teacher or leader can see your answers and scores on their assignments. They can't see your notes, highlights, prayer
          list, messages or anything else you do in Capstone Bible.
        </p>
        <div className="groups-join-row">
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Class or group code"
            placeholder="6-letter code"
            value={code}
            maxLength={8}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="button" className="paid-teaser-button" disabled={busy || code.replace(/[^A-Za-z0-9]/g, "").length !== 6} onClick={() => void join()}>
            {busy ? "Joining…" : "Join"}
          </button>
        </div>
        {error && (
          <p className="plus-error" role="alert">
            {error}
          </p>
        )}
        {joined && <p className="auth-status">{joined}</p>}
      </section>

      <section className="groups-section">
        <button type="button" className="paid-teaser-button groups-start" onClick={onStart}>
          Start a class or group
        </button>
      </section>
    </div>
  );
}

function statusLabel(c: MyClass): string {
  if (c.status === "draft") return "Waiting for payment";
  if (c.status === "active") return "Open";
  if (c.status === "ended") return "Ended";
  return cap(c.status);
}

function StaffCard({ c, onChanged }: { c: MyClass; onChanged: () => Promise<void> }) {
  const w = groupWording(c.kind);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [add, setAdd] = useState(5);
  const isOwner = c.role === "owner";

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      await startGroupCheckout(c.classId);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  const addSeats = async () => {
    setBusy(true);
    setError(null);
    try {
      await addGroupSeats(c.classId, add);
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="groups-card" data-class-id={c.classId}>
      <div className="groups-card-head">
        <strong className="groups-card-name">{c.name}</strong>
        <span className={`groups-pill groups-pill--${c.status}`}>{statusLabel(c)}</span>
      </div>
      <p className="groups-small">
        {c.orgName} · {cap(w.unit)} · {c.role === "owner" ? w.admin : w.coAdmin}
      </p>
      {c.status === "active" && (
        <p className="groups-small groups-seats">
          {c.seatsUsed ?? 0} of {c.seatsPurchased ?? 0} seats taken · code <code className="groups-code">{c.joinCode}</code>
        </p>
      )}
      {c.status === "draft" && isOwner && (
        <>
          <p className="groups-small">{groupEstimate(c.seatsRequested ?? GROUP_MIN_SEATS, c.billingInterval ?? "month")} (estimate)</p>
          <button type="button" className="paid-teaser-button" disabled={busy} onClick={() => void pay()}>
            {busy ? "Opening…" : "Continue to payment"}
          </button>
        </>
      )}
      {c.status === "active" && isOwner && (
        <div className="groups-addseats">
          <label>
            Add seats{" "}
            <input type="number" min={1} max={GROUP_MAX_SEATS} value={add} onChange={(e) => setAdd(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
          </label>
          <button type="button" className="paid-teaser-button paid-teaser-button--quiet" disabled={busy} onClick={() => void addSeats()}>
            {busy ? "Adding…" : "Add"}
          </button>
          <p className="groups-small">Added seats are prorated on your next invoice.</p>
        </div>
      )}
      {c.status === "active" && (
        <button
          type="button"
          className="auth-back-link groups-roster-toggle"
          onClick={async () => setRoster(roster ? null : await fetchRoster(c.classId))}
        >
          {roster ? `Hide ${w.participants}` : `Show ${w.participants}`}
        </button>
      )}
      {roster && (
        <ul className="groups-roster">
          {roster.length === 0 && <li className="groups-small">No {w.participants} yet.</li>}
          {roster.map((r) => (
            <li key={r.userId}>
              {r.displayName ?? `A Capstone ${w.participant}`}
              {r.seatState !== "active" && <span className="groups-small"> (left)</span>}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="plus-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

function MemberCard({ c, onChanged }: { c: MyClass; onChanged: () => Promise<void> }) {
  const w = groupWording(c.kind);
  const [busy, setBusy] = useState(false);
  return (
    <article className="groups-card" data-class-id={c.classId}>
      <div className="groups-card-head">
        <strong className="groups-card-name">{c.name}</strong>
        <span className={`groups-pill groups-pill--${c.status}`}>{statusLabel(c)}</span>
      </div>
      <p className="groups-small">
        {c.orgName}
        {c.leaderName ? ` · ${w.admin}: ${c.leaderName}` : ""}
      </p>
      <p className="groups-small">Capstone Plus is included while you're in this {w.unit}.</p>
      <button
        type="button"
        className="auth-back-link"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(`Leave ${c.name}? You'll lose the Capstone Plus that comes with it.`)) return;
          setBusy(true);
          try {
            await leaveClass(c.classId);
            await onChanged();
          } finally {
            setBusy(false);
          }
        }}
      >
        Leave this {w.unit}
      </button>
    </article>
  );
}

// ------------------------------------------------------------------------------------- start
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function StartGroupForm() {
  const [kind, setKind] = useState<GroupKind | null>(null);
  const w = kind ? groupWording(kind) : null;
  const [f, setF] = useState({
    orgName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "United States",
    phone: "",
    className: "",
    description: "",
    startsOn: today(),
    endsOn: "",
    ongoing: false,
    seats: 10,
    interval: "month" as GroupInterval,
    typedName: "",
    accepted: false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const [logo, setLogo] = useState<{ blob: Blob; url: string } | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ classId: string; logoWarning: string | null } | null>(null);

  useEffect(() => () => (logo ? URL.revokeObjectURL(logo.url) : undefined), [logo]);

  const problems = useMemo(() => {
    const p: string[] = [];
    if (!kind) p.push("Choose a school class or a church group.");
    if (!f.orgName.trim()) p.push(`Enter the ${w ? w.organisation.toLowerCase() : "organisation"}'s name.`);
    if (!f.addressLine1.trim() || !f.city.trim()) p.push("Enter the street address and city.");
    if (!f.phone.trim()) p.push("Enter a phone number.");
    if (!f.className.trim()) p.push(`Give the ${w ? w.unit : "class or group"} a name.`);
    if (!f.ongoing && !f.endsOn) p.push(`Choose an end date, or tick "No end date".`);
    if (!f.ongoing && f.endsOn && f.endsOn < f.startsOn) p.push("The end date is before the start date.");
    if (!Number.isInteger(f.seats) || f.seats < GROUP_MIN_SEATS || f.seats > GROUP_MAX_SEATS)
      p.push(`Seats must be ${GROUP_MIN_SEATS} to ${GROUP_MAX_SEATS}.`);
    if (!f.accepted) p.push("Tick the agreement.");
    if (f.typedName.trim().length < 2) p.push("Type your full name to sign.");
    return p;
  }, [kind, f, w]);

  const submit = async () => {
    if (!kind || problems.length) return;
    setBusy(true);
    setError(null);
    try {
      const g = await createGroupClass({
        kind,
        orgName: f.orgName.trim(),
        addressLine1: f.addressLine1.trim(),
        addressLine2: f.addressLine2.trim(),
        city: f.city.trim(),
        region: f.region.trim(),
        postalCode: f.postalCode.trim(),
        country: f.country.trim(),
        phone: f.phone.trim(),
        className: f.className.trim(),
        description: f.description.trim(),
        startsOn: f.startsOn,
        endsOn: f.ongoing ? null : f.endsOn,
        seats: f.seats,
        interval: f.interval,
        typedName: f.typedName.trim(),
        accepted: f.accepted,
      });
      let logoWarning: string | null = null;
      if (logo) {
        try {
          await uploadOrgLogo(g.orgId, logo.blob);
        } catch (e) {
          logoWarning = (e as Error).message;
        }
      }
      setCreated({ classId: g.classId, logoWarning });
      try {
        await startGroupCheckout(g.classId);
      } catch (e) {
        // The class exists (draft) — payment can be retried from the list.
        setError(`${(e as Error).message} Your ${w?.unit ?? "class"} is saved; you can pay from Classes & Groups.`);
        setBusy(false);
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <form
      className="groups-form"
      data-tier="plus"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset className="groups-fieldset">
        <legend className="groups-h">What are you starting?</legend>
        <div className="groups-choice">
          {(["school", "church"] as GroupKind[]).map((k) => {
            const kw = groupWording(k);
            return (
              <label key={k} className={`groups-choice-card${kind === k ? " is-selected" : ""}`}>
                <input type="radio" name="group-kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
                <strong>{kw.choiceTitle}</strong>
                <span className="groups-small">{kw.choiceBlurb}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {w && (
        <>
          <fieldset className="groups-fieldset">
            <legend className="groups-h">Your {w.organisation.toLowerCase()}</legend>
            <Field label={`${w.organisation} name`} value={f.orgName} max={120} onChange={(v) => set("orgName", v)} autoComplete="organization" />
            <Field label="Street address" value={f.addressLine1} max={200} onChange={(v) => set("addressLine1", v)} autoComplete="address-line1" />
            <Field label="Address line 2 (optional)" value={f.addressLine2} max={200} onChange={(v) => set("addressLine2", v)} autoComplete="address-line2" />
            <div className="groups-row">
              <Field label="City" value={f.city} max={100} onChange={(v) => set("city", v)} autoComplete="address-level2" />
              <Field label="State / region" value={f.region} max={100} onChange={(v) => set("region", v)} autoComplete="address-level1" />
            </div>
            <div className="groups-row">
              <Field label="Postal code" value={f.postalCode} max={30} onChange={(v) => set("postalCode", v)} autoComplete="postal-code" />
              <Field label="Country" value={f.country} max={100} onChange={(v) => set("country", v)} autoComplete="country-name" />
            </div>
            <Field label="Phone" value={f.phone} max={40} type="tel" onChange={(v) => set("phone", v)} autoComplete="tel" />
            <label className="report-field">
              <span className="report-field-label">Logo (optional): PNG, JPEG or WebP, up to 2 MB</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Logo"
                onChange={async (e) => {
                  setLogoError(null);
                  const file = e.target.files?.[0];
                  if (!file) return setLogo(null);
                  try {
                    const blob = await prepareLogo(file);
                    setLogo({ blob, url: URL.createObjectURL(blob) });
                  } catch (err) {
                    setLogo(null);
                    setLogoError((err as Error).message);
                  }
                }}
              />
              {logo && <img className="groups-logo-preview" src={logo.url} alt="Logo preview" />}
              {logoError && (
                <span className="plus-error" role="alert">
                  {logoError}
                </span>
              )}
            </label>
          </fieldset>

          <fieldset className="groups-fieldset">
            <legend className="groups-h">Your {w.unit}</legend>
            <Field label={`${cap(w.unit)} name`} value={f.className} max={120} onChange={(v) => set("className", v)} />
            <label className="report-field">
              <span className="report-field-label">Description (optional)</span>
              <textarea rows={3} maxLength={2000} value={f.description} onChange={(e) => set("description", e.target.value)} />
            </label>
            <div className="groups-row">
              <Field label="Starts" type="date" value={f.startsOn} onChange={(v) => set("startsOn", v)} />
              {!f.ongoing && <Field label={w.end} type="date" value={f.endsOn} onChange={(v) => set("endsOn", v)} />}
            </div>
            <label className="groups-check">
              <input type="checkbox" checked={f.ongoing} onChange={(e) => set("ongoing", e.target.checked)} /> No end date
            </label>
            {!f.ongoing && <p className="groups-small">Billing stops automatically at the end date.</p>}
          </fieldset>

          <fieldset className="groups-fieldset">
            <legend className="groups-h">Seats and payment</legend>
            <label className="report-field">
              <span className="report-field-label">
                Seats ({GROUP_MIN_SEATS} to {GROUP_MAX_SEATS}). One per {w.participant}. Your own Capstone Plus is included.
              </span>
              <input
                type="number"
                min={GROUP_MIN_SEATS}
                max={GROUP_MAX_SEATS}
                value={f.seats}
                aria-label="Seats"
                onChange={(e) => set("seats", Math.floor(Number(e.target.value) || 0))}
              />
            </label>
            <div className="groups-choice groups-choice--inline" role="radiogroup" aria-label="Billing">
              {(["month", "year"] as GroupInterval[]).map((iv) => (
                <label key={iv} className={`groups-choice-card${f.interval === iv ? " is-selected" : ""}`}>
                  <input type="radio" name="group-interval" checked={f.interval === iv} onChange={() => set("interval", iv)} />
                  <strong>{iv === "month" ? "Monthly" : "Yearly"}</strong>
                  <span className="groups-small">{groupEstimate(f.seats, iv)}</span>
                </label>
              ))}
            </div>
            <p className="groups-small">Estimate. Stripe shows the exact amount, including any tax, before you pay.</p>

            <div className="groups-choice" role="radiogroup" aria-label="Who pays">
              <label className="groups-choice-card is-selected">
                <input type="radio" name="group-payer" checked readOnly />
                <strong>I'll pay for everyone</strong>
                <span className="groups-small">One subscription for all the seats.</span>
              </label>
              <label className="groups-choice-card is-disabled" aria-disabled="true">
                <input type="radio" name="group-payer" disabled />
                <strong>Each {w.participant} pays</strong>
                <span className="groups-small">Coming soon</span>
              </label>
            </div>
          </fieldset>

          <fieldset className="groups-fieldset">
            <legend className="groups-h">Agreement</legend>
            {GROUP_AGREEMENT_IS_DRAFT && <p className="groups-draft">DRAFT FOR COUNSEL: not final terms.</p>}
            <pre className="groups-agreement" tabIndex={0} aria-label="Agreement text">
              {GROUP_AGREEMENT_TEXT}
            </pre>
            <label className="groups-check">
              <input type="checkbox" checked={f.accepted} onChange={(e) => set("accepted", e.target.checked)} /> I have read and agree to
              this agreement.
            </label>
            <Field label="Type your full name to sign" value={f.typedName} max={120} onChange={(v) => set("typedName", v)} autoComplete="name" />
          </fieldset>
        </>
      )}

      {kind && problems.length > 0 && (
        <ul className="groups-problems" aria-label="Still needed">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {error && (
        <p className="plus-error" role="alert">
          {error}
        </p>
      )}
      {created?.logoWarning && <p className="groups-small">{created.logoWarning}</p>}
      {kind && (
        <button type="submit" className="paid-teaser-button groups-submit" disabled={busy || problems.length > 0}>
          {busy ? "Saving…" : "Continue to payment"}
        </button>
      )}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="report-field">
      <span className="report-field-label">{label}</span>
      <input type={type} value={value} maxLength={max} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
