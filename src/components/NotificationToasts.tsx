import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, displayFor, type Profile } from "../lib/supabase";

interface Toast {
  id: string;
  icon: string;
  title: string;
  body: string;
  /** Which Friends/Messages/Groups list tapping this toast should open. */
  view: "friends" | "messages" | "groups";
}

const AUTO_DISMISS_MS = 6000;

/** In-app-only notifications for new messages and friend requests — a banner that appears while the
 * app is open, not a system push (that would need a service worker + a server-side sender this app
 * has no deploy pipeline for, and wouldn't work in a plain Safari tab on iPhone at all). The badge
 * counts elsewhere (App.tsx's pendingFriendRequests/unreadMessages) already update live off the same
 * kind of Realtime subscription; this just adds an attention-grabbing surface on top of that so a new
 * message doesn't go unnoticed until the reader happens to glance at the nav bar. */
export default function NotificationToasts({
  session,
  onOpenFriends,
}: {
  session: Session | null;
  onOpenFriends: (view: "friends" | "messages" | "groups") => void;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const profileCache = useRef<Record<string, Profile>>({});

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const push = (toast: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  };

  const nameFor = async (userId: string): Promise<string> => {
    const cached = profileCache.current[userId];
    if (cached) return displayFor(cached);
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      profileCache.current[userId] = data as Profile;
      return displayFor(data as Profile);
    }
    return "Someone";
  };

  useEffect(() => {
    if (!session || session.user.is_anonymous) return;
    const userId = session.user.id;

    const messagesChannel = supabase
      .channel(`notify-messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          const body = (payload.new as { body: string; sender_id: string }).body;
          const name = await nameFor((payload.new as { sender_id: string }).sender_id);
          push({ icon: "💬", title: `New message from ${name}`, body, view: "messages" });
        }
      )
      .subscribe();

    const requestsChannel = supabase
      .channel(`notify-friend-requests-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          const name = await nameFor((payload.new as { sender_id: string }).sender_id);
          push({ icon: "👥", title: "New friend request", body: `${name} wants to connect`, view: "friends" });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friend_requests", filter: `sender_id=eq.${userId}` },
        async (payload) => {
          const row = payload.new as { status: string; receiver_id: string };
          if (row.status !== "accepted") return;
          const name = await nameFor(row.receiver_id);
          push({ icon: "🎉", title: "Friend request accepted", body: `${name} accepted your request`, view: "friends" });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(requestsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (toasts.length === 0) return null;

  return (
    <div className="notification-toast-stack">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="notification-toast"
          onClick={() => {
            dismiss(t.id);
            onOpenFriends(t.view);
          }}
        >
          <span className="notification-toast-icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="notification-toast-text">
            <span className="notification-toast-title">{t.title}</span>
            <span className="notification-toast-body">{t.body}</span>
          </span>
          <button
            type="button"
            className="notification-toast-close"
            onClick={(e) => {
              e.stopPropagation();
              dismiss(t.id);
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
