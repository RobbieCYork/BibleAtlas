import AccountSettingsBody from "./AccountSettings";
import BackButton from "./BackButton";

interface SettingsViewProps {
  userId: string;
  /** Returns to whatever was on screen when Settings was opened. */
  onClose: () => void;
}

/** Full-screen "Settings" for a real account, opened from the account menu. App draws it over whatever
 * the reader was on (a panel, Timeline, Games, My Profile) and leaves that mounted, so Back lands
 * exactly where they were. Borrows My Profile's frame (.myprofile-*), which carries the skin and
 * text-size rules for this shape of page. */
export default function SettingsView({ userId, onClose }: SettingsViewProps) {
  return (
    <section className="myprofile-root settings-root" aria-label="Settings">
      <header className="myprofile-header">
        <BackButton onClick={onClose} ariaLabel="Close Settings" />
        <h2 className="myprofile-title">Settings</h2>
      </header>
      <div className="myprofile-body">
        <div className="myprofile-body-inner">
          <AccountSettingsBody userId={userId} />
        </div>
      </div>
    </section>
  );
}
