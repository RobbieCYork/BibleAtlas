import {
  LINK_VISIBILITY_OPTIONS,
  SOCIAL_LINK_CONFIGS,
  displayUrl,
  safeHref,
  visibilityIcon,
  visibilityLabel,
  type LinkPlatform,
  type LinkVisibility,
  type ProfileLink,
} from "../lib/profileLinks";

const CONFIG_BY_PLATFORM = Object.fromEntries(SOCIAL_LINK_CONFIGS.map((c) => [c.platform, c]));

/** Read-only list of a profile's social links.
 *
 * On someone else's profile the rows that arrive here are already only the ones RLS let through, so
 * this component never has to decide what to hide — it draws what it was given. On the owner's own
 * profile it's given everything, and `showVisibility` adds the 🔒/👥/🌐 badge so the owner can see at
 * a glance who each link is reaching. */
export function ProfileLinksList({ links, showVisibility }: { links: ProfileLink[]; showVisibility?: boolean }) {
  if (links.length === 0) return null;
  return (
    <ul className="profile-links-list">
      {links.map((link) => {
        const config = CONFIG_BY_PLATFORM[link.platform];
        const href = safeHref(link.url);
        return (
          <li key={link.id} className="profile-links-item">
            <span className="profile-links-icon" aria-hidden="true">
              {config?.icon ?? "🔗"}
            </span>
            {/* No href at all when the stored URL doesn't survive re-validation — a bad row renders
             * as plain text rather than as a link that could carry a hostile scheme. */}
            {href ? (
              <a className="profile-links-url" href={href} target="_blank" rel="noopener noreferrer nofollow">
                {displayUrl(link.url)}
              </a>
            ) : (
              <span className="profile-links-url">{displayUrl(link.url)}</span>
            )}
            {showVisibility && (
              <span className="profile-links-badge" title={`Visible to: ${visibilityLabel(link.visibility)}`}>
                {visibilityIcon(link.visibility)} {visibilityLabel(link.visibility)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** One draft row per network, keyed by platform — the URL as typed plus who it's for. Lives in the
 * caller's state alongside the rest of the profile draft so Save/Cancel cover links too. */
export interface LinkDraft {
  url: string;
  visibility: LinkVisibility;
}
export type LinkDrafts = Record<string, LinkDraft>;

/** The editor: the fixed list of supported networks, each with a URL box and a "who can see this"
 * select. A row left blank simply isn't saved (and an existing one that's been blanked is deleted).
 *
 * This deliberately doesn't reuse InlineTextEditor — that component is a single free-text textarea
 * with its own Save/Cancel pair, and these rows are short single-line URLs with a second control
 * beside them, saved together with the rest of the profile by the page's one shared Save button. */
export function ProfileLinksEditor({
  drafts,
  errors,
  onChange,
}: {
  drafts: LinkDrafts;
  /** Keyed by platform — a per-row validation message from normalizeExternalUrl. */
  errors: Record<string, string>;
  onChange: (platform: LinkPlatform, next: LinkDraft) => void;
}) {
  return (
    <div className="profile-edit-section">
      <h4 className="profile-edit-section-heading">Social Links</h4>
      <p className="profile-field-hint">
        New links start at “Only me” — nothing you add here is shared until you change who can see it.
      </p>
      {SOCIAL_LINK_CONFIGS.map((config) => {
        const draft = drafts[config.platform] ?? { url: "", visibility: "private" as LinkVisibility };
        const error = errors[config.platform];
        return (
          <div key={config.platform} className="profile-link-edit-row">
            <div className="profile-edit-field-row">
              <span className="profile-links-icon" aria-hidden="true">
                {config.icon}
              </span>
              <input
                type="text"
                inputMode="url"
                value={draft.url}
                aria-label={`${config.label} link`}
                aria-invalid={error ? true : undefined}
                placeholder={config.placeholder}
                maxLength={500}
                onChange={(e) => onChange(config.platform, { ...draft, url: e.target.value })}
              />
              <select
                className="profile-link-visibility-select"
                value={draft.visibility}
                aria-label={`Who can see your ${config.label} link`}
                disabled={!draft.url.trim()}
                onChange={(e) => onChange(config.platform, { ...draft, visibility: e.target.value as LinkVisibility })}
              >
                {LINK_VISIBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.icon} {o.label}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="profile-link-edit-error">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}
