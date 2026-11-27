import { useEffect, useState } from "react";
import Icon from "./Icon";
import { formatWhen, type AdminGuestSummary, type AdminOverview } from "../lib/adminApi";
import { fetchRegisteredSummary, type RegisteredSummary } from "../lib/usageApi";

/* The first thing on the Users tab: real accounts, counted over the whole database — never over the
 * list below it, which is searched and capped. Same definitions as the Usage reports graphs.
 * See fetchRegisteredSummary() for how each number is computed in each world. */
export default function RegisteredAccountsCard({
  overview,
  guests,
}: {
  overview: AdminOverview | null;
  guests: AdminGuestSummary | null;
}) {
  const [s, setS] = useState<RegisteredSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchRegisteredSummary({ overview, guests })
      .then((r) => live && setS(r))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Couldn't count registered accounts."));
    return () => {
      live = false;
    };
    // Fetch once per mount; the prefetched values only save round trips in the fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="admin-registered-card" aria-label="Registered accounts">
      <div className="admin-guest-head">
        <span className="admin-guest-title">
          <Icon name="people" inline /> Registered accounts
          {s && <span className="admin-badge">{s.total.toLocaleString()}</span>}
        </span>
      </div>
      {error && <p className="auth-status auth-error">{error}</p>}
      {!s && !error && <p className="admin-note">Counting…</p>}
      {s && (
        <>
          <span className="admin-guest-figures">
            <span>
              <strong>{s.new_24h}</strong> new in 24h
            </span>
            <span>
              <strong>{s.new_7d}</strong> new in 7d
            </span>
            <span>
              <strong>{s.active_7d}</strong> active in 7d
            </span>
            <span>
              Newest join{" "}
              {s.newest_joined_at === undefined
                ? "— older than the 200 newest accounts"
                : s.newest_joined_at === null
                  ? "— none yet"
                  : formatWhen(s.newest_joined_at)}
            </span>
          </span>
          <p className="admin-note">
            People who signed up with an email. Counted across every account in the database, so searching the list below
            doesn't change these numbers. Accounts left from the retired “Continue as Guest” are not counted.
            {s.source === "full"
              ? ` Includes the team${s.team ? ` (${s.team})` : ""}. Active = opened the app or did anything the app records in the last 7 days.`
              : " Includes the team. Until the database step (migration 054): total and new are exact (all accounts minus the old guest ones); active = registered accounts last seen in the last 7 days."}
          </p>
        </>
      )}
    </section>
  );
}
