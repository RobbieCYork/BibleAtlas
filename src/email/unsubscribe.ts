/**
 * The unsubscribe page linked from every Capstone Bible invite email (sql/049, CAN-SPAM). A separate
 * Vite page (email/unsubscribe.html), NOT the app: no Supabase client, no session, no login. It reads
 * the 64-hex token from the URL FRAGMENT (which no server ever sees), removes it from the address bar,
 * and POSTs it to the group-invite-unsubscribe Edge Function. Nothing happens until a button is
 * pressed, so a link scanner that opens the page unsubscribes no one.
 */
const status = document.getElementById("status") as HTMLParagraphElement;
const choose = document.getElementById("choose") as HTMLDivElement;
const buttons = [document.getElementById("all"), document.getElementById("class")] as HTMLButtonElement[];

const token = (new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "").toLowerCase();
if (window.location.hash) history.replaceState(null, "", window.location.pathname);

const base = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");

if (!/^[0-9a-f]{64}$/.test(token) || !base) {
  choose.hidden = true;
  status.textContent = "This unsubscribe link is incomplete. Use the link from the email, or write to admin@capstonebible.com and we will remove your address.";
}

async function go(scope: "all" | "class") {
  buttons.forEach((b) => (b.disabled = true));
  status.textContent = "Working…";
  try {
    const res = await fetch(`${base}/functions/v1/group-invite-unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, scope }),
    });
    if (!res.ok) throw new Error(String(res.status));
    choose.hidden = true;
    status.textContent =
      scope === "all"
        ? "Done. Capstone Bible won't send invitations to this address again."
        : "Done. You won't get more reminders for that class or group.";
  } catch {
    buttons.forEach((b) => (b.disabled = false));
    status.textContent = "That didn't work. Please try again, or write to admin@capstonebible.com and we will remove your address.";
  }
}

buttons[0]?.addEventListener("click", () => void go("all"));
buttons[1]?.addEventListener("click", () => void go("class"));
