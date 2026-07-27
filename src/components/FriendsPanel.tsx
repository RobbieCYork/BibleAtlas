import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type FriendRequest, type Message, type Profile } from "../lib/supabase";

interface FriendsPanelProps {
  session: Session | null;
  onClose: () => void;
  expand?: boolean;
  style?: React.CSSProperties;
  hidden?: boolean;
}

export default function FriendsPanel({ session, onClose, expand, style, hidden }: FriendsPanelProps) {
  const userId = session?.user.id;
  const canUseFriends = !!session && !session.user.is_anonymous;

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchRequestsAndProfiles = async () => {
    if (!userId) return;
    setLoading(true);
    const { data: reqData } = await supabase
      .from("friend_requests")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    const reqs = (reqData as FriendRequest[] | null) ?? [];
    setRequests(reqs);

    const otherIds = [...new Set(reqs.map((r) => (r.sender_id === userId ? r.receiver_id : r.sender_id)))];
    if (otherIds.length > 0) {
      const { data: profileData } = await supabase.from("profiles").select("*").in("id", otherIds);
      const map: Record<string, Profile> = {};
      ((profileData as Profile[] | null) ?? []).forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequestsAndProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const incomingPending = requests.filter((r) => r.receiver_id === userId && r.status === "pending");
  const outgoingPending = requests.filter((r) => r.sender_id === userId && r.status === "pending");
  const friends = requests.filter((r) => r.status === "accepted");

  const friendIdFor = (r: FriendRequest) => (r.sender_id === userId ? r.receiver_id : r.sender_id);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !addEmail.trim()) return;
    setAdding(true);
    setAddStatus(null);
    const { data: foundId, error: lookupErr } = await supabase.rpc("find_user_id_by_email", {
      lookup_email: addEmail.trim(),
    });
    if (lookupErr || !foundId) {
      setAddStatus("No account found with that email.");
      setAdding(false);
      return;
    }
    if (foundId === userId) {
      setAddStatus("That's your own email.");
      setAdding(false);
      return;
    }
    const { error: insertErr } = await supabase
      .from("friend_requests")
      .insert({ sender_id: userId, receiver_id: foundId, status: "pending" });
    setAdding(false);
    if (insertErr) {
      setAddStatus("You already have a pending or accepted connection with this person.");
      return;
    }
    setAddStatus("Friend request sent!");
    setAddEmail("");
    fetchRequestsAndProfiles();
  };

  const handleRespond = async (requestId: string, status: "accepted" | "declined") => {
    await supabase.from("friend_requests").update({ status, responded_at: new Date().toISOString() }).eq("id", requestId);
    fetchRequestsAndProfiles();
  };

  const handleCancelOrRemove = async (requestId: string) => {
    await supabase.from("friend_requests").delete().eq("id", requestId);
    if (activeFriendId && friends.find((r) => r.id === requestId && friendIdFor(r) === activeFriendId)) {
      setActiveFriendId(null);
    }
    fetchRequestsAndProfiles();
  };

  const fetchMessages = async (friendId: string) => {
    if (!userId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });
    setMessages((data as Message[] | null) ?? []);
    // Mark any of the friend's messages to us as read.
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", friendId)
      .eq("receiver_id", userId)
      .is("read_at", null);
  };

  useEffect(() => {
    if (activeFriendId) fetchMessages(activeFriendId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFriendId]);

  // Live updates for the open conversation, so a reply shows up without reopening the thread.
  useEffect(() => {
    if (!activeFriendId || !userId) return;
    const channel = supabase
      .channel(`messages-${userId}-${activeFriendId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          const belongsToThisThread =
            (m.sender_id === userId && m.receiver_id === activeFriendId) ||
            (m.sender_id === activeFriendId && m.receiver_id === userId);
          if (belongsToThisThread) setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeFriendId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !activeFriendId || !messageBody.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: userId, receiver_id: activeFriendId, body: messageBody.trim() })
      .select()
      .single();
    setSending(false);
    if (!error && data) {
      setMessages((prev) => [...prev, data as Message]);
      setMessageBody("");
    }
  };

  if (activeFriendId) {
    const friendProfile = profiles[activeFriendId];
    return (
      <div className={`friends-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`} style={expand ? undefined : style}>
        <div className="bible-panel-header no-print">
          <button type="button" className="friends-back" onClick={() => setActiveFriendId(null)} aria-label="Back to friends list">
            ← Back
          </button>
          <h3>{friendProfile?.email ?? "Conversation"}</h3>
          <button className="panel-close" onClick={onClose} aria-label="Close Friends panel">
            ×
          </button>
        </div>
        <div className="message-list">
          {messages.length === 0 && <p className="comment-status">No messages yet — say hello!</p>}
          {messages.map((m) => (
            <div key={m.id} className={`message-bubble-row ${m.sender_id === userId ? "message-own" : ""}`}>
              <div className="message-bubble">{m.body}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form className="comment-form message-form" onSubmit={handleSendMessage}>
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Type a message…"
            rows={2}
            maxLength={4000}
          />
          <button type="submit" disabled={sending || !messageBody.trim()}>
            {sending ? "…" : "Send"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`friends-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`} style={expand ? undefined : style}>
      <div className="bible-panel-header no-print">
        <h3>Friends</h3>
        <button className="panel-close" onClick={onClose} aria-label="Close Friends panel">
          ×
        </button>
      </div>

      {!canUseFriends && (
        <p className="bible-status no-print">
          {session?.user.is_anonymous ? "Log in with an account (not just as a guest) to add friends and message them." : "Log in to add friends and message them."}
        </p>
      )}

      {canUseFriends && (
        <>
          <form className="friends-add-form" onSubmit={handleAddFriend}>
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="Friend's email"
              required
            />
            <button type="submit" disabled={adding || !addEmail.trim()}>
              {adding ? "…" : "Add"}
            </button>
          </form>
          {addStatus && <p className="comment-status">{addStatus}</p>}

          {loading && <p className="comment-status">Loading…</p>}

          {incomingPending.length > 0 && (
            <div className="friends-section">
              <h4>Requests</h4>
              <ul className="friends-list">
                {incomingPending.map((r) => (
                  <li key={r.id} className="friends-list-item">
                    <span>{profiles[r.sender_id]?.email ?? "Someone"}</span>
                    <div className="friends-request-actions">
                      <button type="button" onClick={() => handleRespond(r.id, "accepted")}>
                        Accept
                      </button>
                      <button type="button" className="friends-decline" onClick={() => handleRespond(r.id, "declined")}>
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {outgoingPending.length > 0 && (
            <div className="friends-section">
              <h4>Sent Requests</h4>
              <ul className="friends-list">
                {outgoingPending.map((r) => (
                  <li key={r.id} className="friends-list-item">
                    <span>{profiles[r.receiver_id]?.email ?? "Someone"}</span>
                    <button type="button" className="friends-decline" onClick={() => handleCancelOrRemove(r.id)}>
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="friends-section">
            <h4>Friends</h4>
            {friends.length === 0 && <p className="comment-status">No friends yet — add one by email above.</p>}
            <ul className="friends-list">
              {friends.map((r) => {
                const fid = friendIdFor(r);
                return (
                  <li key={r.id} className="friends-list-item friends-list-item-clickable" onClick={() => setActiveFriendId(fid)}>
                    <span>{profiles[fid]?.email ?? "Friend"}</span>
                    <span className="friends-message-hint">Message →</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
