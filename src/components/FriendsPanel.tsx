import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, displayFor, type FriendRequest, type GroupSummary, type Message, type Profile } from "../lib/supabase";
import GroupsPanel from "./GroupsPanel";
import FriendProfileView from "./FriendProfileView";
import ViewSwitcher, { type FriendsView } from "./ViewSwitcher";

interface ConversationSummary {
  friendId: string;
  lastMessage: Message | null;
  unreadCount: number;
}

interface FriendsPanelProps {
  session: Session | null;
  expand?: boolean;
  style?: React.CSSProperties;
  hidden?: boolean;
  /** Which top-level list to show — set by the mobile "More" sheet's Friends/Messages/Groups entries. */
  openView?: FriendsView;
  /** Increments every time the panel is (re-)opened from the nav, so re-tapping the same entry while
   * this panel is already open still jumps back to that view's list instead of a no-op. */
  openViewNonce?: number;
  /** Requests a view change from the parent — the in-panel switcher (rendered here and in
   * GroupsPanel) calls this so Messages/Groups are reachable on desktop too, where there's no mobile
   * "More" sheet to navigate from. Routes back through the parent (rather than a local setView) so
   * openView/openViewNonce stay the single source of truth either way it was triggered. */
  onSelectView?: (view: FriendsView) => void;
  /** Badge counts for the in-panel view switcher — same numbers the mobile "More" sheet shows,
   * passed down from App.tsx so both surfaces agree. */
  friendsBadgeCount?: number;
  messagesBadgeCount?: number;
  groupsBadgeCount?: number;
  /** Study-trip actions passed straight through to GroupsPanel — the same App.tsx paths the Bible
   * panel's place links and openVerse use, so a trip stop can focus the map and load a passage. */
  onSelectLocation?: (id: string) => void;
  onSelectPoi?: (id: string) => void;
  onGoToReference?: (reference: string) => void;
}

export default function FriendsPanel({
  session,
  expand,
  style,
  hidden,
  openView,
  openViewNonce,
  onSelectView,
  friendsBadgeCount,
  messagesBadgeCount,
  groupsBadgeCount,
  onSelectLocation,
  onSelectPoi,
  onGoToReference,
}: FriendsPanelProps) {
  const userId = session?.user.id;
  const canUseFriends = !!session && !session.user.is_anonymous;

  const [view, setView] = useState<FriendsView>("friends");
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [addContact, setAddContact] = useState("");
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  // Separate from activeFriendId (which opens the message thread) — set from a friend row's "View
  // Profile" action, so profile-viewing and messaging are two distinct destinations from the same list.
  const [activeProfileFriendId, setActiveProfileFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /** Groups the "Add to Group" menu can offer — only ones this account can add members to (owner or
   * admin). Fetched lazily on first use, not on mount, since most sessions never open the menu. */
  const [adminGroups, setAdminGroups] = useState<GroupSummary[] | null>(null);
  const [addToGroupOpenFor, setAddToGroupOpenFor] = useState<string | null>(null);
  const [addToGroupStatus, setAddToGroupStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    if (openViewNonce === undefined) return;
    setView(openView ?? "friends");
    setActiveFriendId(null);
    setActiveProfileFriendId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openViewNonce]);

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

  // Live updates so a new incoming request (or the other side accepting/declining one you sent)
  // shows up immediately — the panel stays mounted in the background (see App.tsx), so without this
  // it could otherwise sit stale until something else happened to trigger a refetch.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`friend-requests-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => {
        fetchRequestsAndProfiles();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const incomingPending = requests.filter((r) => r.receiver_id === userId && r.status === "pending");
  const outgoingPending = requests.filter((r) => r.sender_id === userId && r.status === "pending");
  const friends = requests.filter((r) => r.status === "accepted");

  const friendIdFor = (r: FriendRequest) => (r.sender_id === userId ? r.receiver_id : r.sender_id);

  /** One row per friend with any message history — most recent message and how many are unread.
   * Friends with no messages yet aren't included here; the Messages list adds them in separately so
   * a brand-new friend still shows up as a place to start a conversation. */
  const fetchConversations = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true });
    const msgs = (data as Message[] | null) ?? [];
    const byFriend = new Map<string, ConversationSummary>();
    msgs.forEach((m) => {
      const friendId = m.sender_id === userId ? m.receiver_id : m.sender_id;
      const entry = byFriend.get(friendId) ?? { friendId, lastMessage: null, unreadCount: 0 };
      entry.lastMessage = m; // fetched oldest-first, so the last one written wins as "most recent"
      if (m.receiver_id === userId && !m.read_at) entry.unreadCount += 1;
      byFriend.set(friendId, entry);
    });
    setConversations([...byFriend.values()]);
  };

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Live updates for the Messages overview list — a new message (from either side) or a read-receipt
  // update should reorder/re-badge the list without needing to reopen the panel.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`messages-overview-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /** Every friend, each paired with their conversation summary if one exists, sorted so unread
   * conversations come first, then by most recent activity, with never-messaged friends at the end. */
  const conversationList: ConversationSummary[] = friends
    .map((r) => {
      const friendId = friendIdFor(r);
      const existing = conversations.find((c) => c.friendId === friendId);
      return existing ?? { friendId, lastMessage: null, unreadCount: 0 };
    })
    .sort((a, b) => {
      if (a.unreadCount > 0 !== b.unreadCount > 0) return a.unreadCount > 0 ? -1 : 1;
      if (a.lastMessage && b.lastMessage) return b.lastMessage.created_at.localeCompare(a.lastMessage.created_at);
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return 0;
    });

  /** Sends a friend request to `foundId`, sharing the not-found/self/duplicate handling between the
   * manual email-or-phone form and an auto-applied invite link. */
  const sendRequestTo = async (foundId: string): Promise<string> => {
    if (foundId === userId) return "That's your own contact info.";
    const { error: insertErr } = await supabase
      .from("friend_requests")
      .insert({ sender_id: userId, receiver_id: foundId, status: "pending" });
    if (insertErr) return "You already have a pending or accepted connection with this person.";
    fetchRequestsAndProfiles();
    return "Friend request sent!";
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = addContact.trim();
    if (!userId || !query) return;
    setAdding(true);
    setAddStatus(null);
    // Emails and phone numbers are looked up separately (rather than one combined query) so a phone
    // search normalizes to digits-only first, matching how phone numbers are stored.
    const isEmail = query.includes("@");
    const { data: foundId, error: lookupErr } = isEmail
      ? await supabase.rpc("find_user_id_by_email", { lookup_email: query })
      : await supabase.rpc("find_user_by_contact", { query: query.replace(/\D/g, "") });
    if (lookupErr || !foundId) {
      setAddStatus(isEmail ? "No account found with that email." : "No account found with that phone number.");
      setAdding(false);
      return;
    }
    setAddStatus(await sendRequestTo(foundId));
    setAdding(false);
    setAddContact("");
  };

  const handleCopyInviteLink = async () => {
    if (!userId) return;
    const link = `${window.location.origin}${window.location.pathname}?invite=${userId}`;
    try {
      await navigator.clipboard.writeText(link);
      setInviteStatus("Invite link copied — send it however you like (text, email, anything).");
    } catch {
      setInviteStatus(link);
    }
  };

  const handleToggleAddToGroup = async (friendId: string) => {
    if (addToGroupOpenFor === friendId) {
      setAddToGroupOpenFor(null);
      return;
    }
    setAddToGroupOpenFor(friendId);
    if (adminGroups === null) {
      const { data } = await supabase.rpc("list_my_groups");
      const rows = (data as GroupSummary[] | null) ?? [];
      setAdminGroups(rows.filter((g) => g.my_role === "owner" || g.my_role === "admin"));
    }
  };

  const handleAddFriendToGroup = async (friendId: string, groupId: string, groupName: string) => {
    const { error } = await supabase.rpc("add_group_member", { p_group_id: groupId, p_member_id: friendId });
    setAddToGroupStatus((prev) => ({
      ...prev,
      [friendId]: error ? "Couldn't add — they may already be a member." : `Added to ${groupName}!`,
    }));
    if (!error) setAddToGroupOpenFor(null);
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

  /** Pinning is one-per-conversation server-side (pin_message unpins whatever else was pinned), so
   * the optimistic update mirrors that by clearing every other message's pinned flag locally too. */
  const handleTogglePin = async (message: Message) => {
    if (message.pinned) {
      await supabase.rpc("unpin_message", { p_message_id: message.id });
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, pinned: false } : m)));
    } else {
      await supabase.rpc("pin_message", { p_message_id: message.id });
      setMessages((prev) => prev.map((m) => ({ ...m, pinned: m.id === message.id })));
    }
  };

  if (view === "groups") {
    return (
      <GroupsPanel
        session={session}
        expand={expand}
        style={style}
        hidden={hidden}
        openViewNonce={openViewNonce}
        onSelectView={onSelectView}
        friendsBadgeCount={friendsBadgeCount}
        messagesBadgeCount={messagesBadgeCount}
        groupsBadgeCount={groupsBadgeCount}
        onSelectLocation={onSelectLocation}
        onSelectPoi={onSelectPoi}
        onGoToReference={onGoToReference}
      />
    );
  }

  if (activeProfileFriendId) {
    return (
      <FriendProfileView
        friendId={activeProfileFriendId}
        viewerId={userId}
        onBack={() => setActiveProfileFriendId(null)}
        onMessage={() => {
          const fid = activeProfileFriendId;
          setActiveProfileFriendId(null);
          setActiveFriendId(fid);
        }}
        expand={expand}
        style={style}
        hidden={hidden}
      />
    );
  }

  if (activeFriendId) {
    const friendProfile = profiles[activeFriendId];
    const pinnedMessage = messages.find((m) => m.pinned);
    return (
      <div className={`friends-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`} style={expand ? undefined : style}>
        <div className="bible-panel-header no-print">
          <button type="button" className="friends-back" onClick={() => setActiveFriendId(null)} aria-label="Back to friends list">
            ← Back
          </button>
          <h3>{friendProfile ? displayFor(friendProfile) : "Conversation"}</h3>
        </div>
        {pinnedMessage && (
          <div className="pinned-message-banner">
            <span className="pinned-message-icon" aria-hidden="true">📌</span>
            <span className="pinned-message-text">{pinnedMessage.body}</span>
            <button type="button" onClick={() => handleTogglePin(pinnedMessage)} aria-label="Unpin message">
              Unpin
            </button>
          </div>
        )}
        <div className="message-list">
          {messages.length === 0 && <p className="comment-status">No messages yet — say hello!</p>}
          {messages.map((m) => (
            <div key={m.id} className={`message-bubble-row ${m.sender_id === userId ? "message-own" : ""}`}>
              <div className="message-bubble">
                {m.body}
                <button
                  type="button"
                  className={`message-pin-toggle ${m.pinned ? "message-pin-toggle-active" : ""}`}
                  onClick={() => handleTogglePin(m)}
                  aria-label={m.pinned ? "Unpin message" : "Pin message"}
                  title={m.pinned ? "Unpin message" : "Pin message"}
                >
                  📌
                </button>
              </div>
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
        <h3>{view === "messages" ? "Messages" : "Friends"}</h3>
      </div>
      <ViewSwitcher
        active={view}
        onSelectView={onSelectView}
        friendsBadge={friendsBadgeCount}
        messagesBadge={messagesBadgeCount}
        groupsBadge={groupsBadgeCount}
      />

      {!canUseFriends && (
        <p className="bible-status no-print">
          {session?.user.is_anonymous ? "Log in with an account (not just as a guest) to add friends and message them." : "Log in to add friends and message them."}
        </p>
      )}

      {canUseFriends && view === "messages" && (
        <div className="friends-section">
          {conversationList.length === 0 && (
            <p className="comment-status">No conversations yet — add a friend, then say hello.</p>
          )}
          <ul className="friends-list">
            {conversationList.map((c) => (
              <li
                key={c.friendId}
                className="friends-list-item friends-list-item-clickable"
                onClick={() => setActiveFriendId(c.friendId)}
              >
                <div className="message-preview">
                  <span className="message-preview-name">{profiles[c.friendId] ? displayFor(profiles[c.friendId]) : "Friend"}</span>
                  <span className="message-preview-text">
                    {c.lastMessage
                      ? `${c.lastMessage.sender_id === userId ? "You: " : ""}${c.lastMessage.body}`
                      : "No messages yet — say hello!"}
                  </span>
                </div>
                {c.unreadCount > 0 && <span className="friends-list-item-badge">{c.unreadCount}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canUseFriends && view === "friends" && (
        <>
          <form className="friends-add-form" onSubmit={handleAddFriend}>
            <input
              type="text"
              value={addContact}
              onChange={(e) => setAddContact(e.target.value)}
              placeholder="Friend's email or phone number"
              required
            />
            <button type="submit" disabled={adding || !addContact.trim()}>
              {adding ? "…" : "Add"}
            </button>
          </form>
          {addStatus && <p className="comment-status">{addStatus}</p>}

          <button type="button" className="friends-invite-link-button" onClick={handleCopyInviteLink}>
            🔗 Copy invite link
          </button>
          {inviteStatus && <p className="comment-status">{inviteStatus}</p>}
          <p className="friends-invite-hint">
            Not on the app yet? Send them your invite link instead — opening it and logging in connects you
            automatically.
          </p>

          {loading && <p className="comment-status">Loading…</p>}

          {incomingPending.length > 0 && (
            <div className="friends-section">
              <h4>Requests</h4>
              <ul className="friends-list">
                {incomingPending.map((r) => (
                  <li key={r.id} className="friends-list-item">
                    <span>{profiles[r.sender_id] ? displayFor(profiles[r.sender_id]) : "Someone"}</span>
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
                    <span>{profiles[r.receiver_id] ? displayFor(profiles[r.receiver_id]) : "Someone"}</span>
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
            {friends.length === 0 && <p className="comment-status">No friends yet — add one above, or send an invite link.</p>}
            <ul className="friends-list">
              {friends.map((r) => {
                const fid = friendIdFor(r);
                return (
                  <li key={r.id} className="friends-list-item friends-list-item-stack">
                    <div className="friends-list-item-row friends-list-item-clickable" onClick={() => setActiveProfileFriendId(fid)}>
                      <span className="auth-avatar" aria-hidden="true">
                        {profiles[fid]?.avatar_url ? (
                          <img src={profiles[fid].avatar_url} alt="" />
                        ) : profiles[fid] ? (
                          displayFor(profiles[fid]).charAt(0).toUpperCase()
                        ) : (
                          "?"
                        )}
                      </span>
                      <span>{profiles[fid] ? displayFor(profiles[fid]) : "Friend"}</span>
                    </div>
                    <div className="friends-list-item-actions">
                      <button type="button" className="friends-message-button" onClick={() => setActiveFriendId(fid)}>
                        💬 Message
                      </button>
                      <button
                        type="button"
                        className="friends-add-to-group-toggle"
                        onClick={() => handleToggleAddToGroup(fid)}
                      >
                        ＋ Group
                      </button>
                    </div>
                    {addToGroupOpenFor === fid && (
                      <div className="friends-add-to-group-menu">
                        {adminGroups === null && <p className="comment-status">Loading…</p>}
                        {adminGroups?.length === 0 && (
                          <p className="comment-status">You're not an admin of any group yet.</p>
                        )}
                        {adminGroups?.map((g) => (
                          <button type="button" key={g.group_id} onClick={() => handleAddFriendToGroup(fid, g.group_id, g.name)}>
                            {g.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {addToGroupStatus[fid] && <p className="comment-status">{addToGroupStatus[fid]}</p>}
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
