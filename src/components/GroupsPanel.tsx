import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  supabase,
  displayFor,
  type FriendRequest,
  type GroupJoinRequest,
  type GroupMember,
  type GroupMessage,
  type GroupSummary,
  type Profile,
} from "../lib/supabase";
import ViewSwitcher, { type FriendsView } from "./ViewSwitcher";

type Screen = "list" | "create" | "detail";
type DetailTab = "chat" | "members";

interface GroupsPanelProps {
  session: Session | null;
  onClose: () => void;
  expand?: boolean;
  style?: React.CSSProperties;
  hidden?: boolean;
  /** Increments every time Groups is (re-)selected from the nav — resets back to the list screen,
   * matching how Friends/Messages reset to their own top-level list on re-selection. */
  openViewNonce?: number;
  /** Passed straight through from FriendsPanel so the in-panel switcher works here too. */
  onSelectView?: (view: FriendsView) => void;
  friendsBadgeCount?: number;
  messagesBadgeCount?: number;
  groupsBadgeCount?: number;
}

export default function GroupsPanel({
  session,
  onClose,
  expand,
  style,
  hidden,
  openViewNonce,
  onSelectView,
  friendsBadgeCount,
  messagesBadgeCount,
  groupsBadgeCount,
}: GroupsPanelProps) {
  const userId = session?.user.id;
  const canUse = !!session && !session.user.is_anonymous;

  const [screen, setScreen] = useState<Screen>("list");
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("chat");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  const [addMemberContact, setAddMemberContact] = useState("");
  const [addMemberStatus, setAddMemberStatus] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [friendOptions, setFriendOptions] = useState<Profile[]>([]);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const activeGroup = groups.find((g) => g.group_id === activeGroupId);
  const myRole = activeGroup?.my_role;
  const isAdmin = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const fetchProfilesFor = async (ids: string[]) => {
    const missing = ids.filter((id) => !profiles[id]);
    if (missing.length === 0) return;
    const { data } = await supabase.from("profiles").select("*").in("id", missing);
    const found = (data as Profile[] | null) ?? [];
    if (found.length === 0) return;
    setProfiles((prev) => {
      const next = { ...prev };
      found.forEach((p) => (next[p.id] = p));
      return next;
    });
  };

  const fetchGroups = async () => {
    if (!userId) return;
    const { data } = await supabase.rpc("list_my_groups");
    const rows = (data as GroupSummary[] | null) ?? [];
    setGroups(rows);
    const senderIds = rows.map((g) => g.last_sender_id).filter((id): id is string => !!id);
    if (senderIds.length > 0) fetchProfilesFor(senderIds);
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Resets to the group list every time Groups is re-selected from the nav.
  useEffect(() => {
    if (openViewNonce === undefined) return;
    setScreen("list");
    setActiveGroupId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openViewNonce]);

  // A new group you're added to, a kick, a promotion, or any group message anywhere should refresh
  // the list's unread counts/ordering — mirrors the same broad-subscribe-then-refetch pattern used
  // for friend requests and 1:1 messages elsewhere in this panel.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`groups-overview-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_messages" }, fetchGroups)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, fetchGroups)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchGroupDetail = async (groupId: string, admin: boolean) => {
    const { data: memberData } = await supabase.from("group_members").select("*").eq("group_id", groupId);
    const memberRows = (memberData as GroupMember[] | null) ?? [];
    setMembers(memberRows);
    fetchProfilesFor(memberRows.map((m) => m.user_id));

    if (admin) {
      const { data: reqData } = await supabase
        .from("group_join_requests")
        .select("*")
        .eq("group_id", groupId)
        .eq("status", "pending");
      const reqRows = (reqData as GroupJoinRequest[] | null) ?? [];
      setJoinRequests(reqRows);
      fetchProfilesFor(reqRows.map((r) => r.user_id));
    } else {
      setJoinRequests([]);
    }
  };

  const fetchGroupMessages = async (groupId: string) => {
    const { data } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    const rows = (data as GroupMessage[] | null) ?? [];
    setGroupMessages(rows);
    fetchProfilesFor(rows.map((m) => m.sender_id));
    if (userId) {
      await supabase.from("group_message_reads").upsert({ group_id: groupId, user_id: userId, last_read_at: new Date().toISOString() });
    }
  };

  const openGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    setDetailTab("chat");
    setEditingInfo(false);
    setConfirmingDelete(false);
    setScreen("detail");
    const g = groups.find((x) => x.group_id === groupId);
    fetchGroupDetail(groupId, g?.my_role === "owner" || g?.my_role === "admin");
    fetchGroupMessages(groupId);
  };

  // Live updates for the open group's chat, member list, and (for admins) join requests.
  useEffect(() => {
    if (!activeGroupId || !userId || screen !== "detail") return;
    const channel = supabase
      .channel(`group-detail-${activeGroupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, (payload) => {
        const m = payload.new as GroupMessage;
        if (m.group_id !== activeGroupId) return;
        setGroupMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        fetchProfilesFor([m.sender_id]);
        if (m.sender_id !== userId) {
          supabase.from("group_message_reads").upsert({ group_id: activeGroupId, user_id: userId, last_read_at: new Date().toISOString() });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => {
        fetchGroupDetail(activeGroupId, isAdmin);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_join_requests" }, () => {
        if (isAdmin) fetchGroupDetail(activeGroupId, true);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId, userId, screen, isAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !activeGroupId || !messageBody.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("group_messages")
      .insert({ group_id: activeGroupId, sender_id: userId, body: messageBody.trim() })
      .select()
      .single();
    setSending(false);
    if (!error && data) {
      setGroupMessages((prev) => [...prev, data as GroupMessage]);
      setMessageBody("");
    }
  };

  /** Same one-pin-per-conversation mirroring as FriendsPanel's handleTogglePin. */
  const handleToggleGroupPin = async (message: GroupMessage) => {
    if (message.pinned) {
      await supabase.rpc("unpin_group_message", { p_message_id: message.id });
      setGroupMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, pinned: false } : m)));
    } else {
      await supabase.rpc("pin_group_message", { p_message_id: message.id });
      setGroupMessages((prev) => prev.map((m) => ({ ...m, pinned: m.id === message.id })));
    }
  };

  const fetchFriendOptions = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("friend_requests")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted");
    const rows = (data as FriendRequest[] | null) ?? [];
    const friendIds = rows.map((r) => (r.sender_id === userId ? r.receiver_id : r.sender_id));
    if (friendIds.length === 0) {
      setFriendOptions([]);
      return;
    }
    const { data: profileData } = await supabase.from("profiles").select("*").in("id", friendIds);
    setFriendOptions((profileData as Profile[] | null) ?? []);
  };

  const startCreate = () => {
    setNewName("");
    setNewDescription("");
    setSelectedFriendIds(new Set());
    setCreateError(null);
    fetchFriendOptions();
    setScreen("create");
  };

  const toggleFriendSelected = (id: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    const { data, error } = await supabase.rpc("create_group", {
      p_name: newName.trim(),
      p_description: newDescription.trim() || null,
      p_member_ids: [...selectedFriendIds],
    });
    setCreating(false);
    if (error || !data) {
      setCreateError("Couldn't create the group — try again.");
      return;
    }
    await fetchGroups();
    openGroup(data as string);
  };

  const handleCopyInviteLink = async () => {
    if (!activeGroupId) return;
    const link = `${window.location.origin}${window.location.pathname}?joinGroup=${activeGroupId}`;
    try {
      await navigator.clipboard.writeText(link);
      setInviteStatus("Invite link copied — anyone who opens it can request to join (an admin still has to approve them).");
    } catch {
      setInviteStatus(link);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = addMemberContact.trim();
    if (!activeGroupId || !query) return;
    setAddingMember(true);
    setAddMemberStatus(null);
    const isEmail = query.includes("@");
    const { data: foundId, error: lookupErr } = isEmail
      ? await supabase.rpc("find_user_id_by_email", { lookup_email: query })
      : await supabase.rpc("find_user_by_contact", { query: query.replace(/\D/g, "") });
    if (lookupErr || !foundId) {
      setAddMemberStatus(isEmail ? "No account found with that email." : "No account found with that phone number.");
      setAddingMember(false);
      return;
    }
    const { error: addErr } = await supabase.rpc("add_group_member", { p_group_id: activeGroupId, p_member_id: foundId });
    setAddingMember(false);
    if (addErr) {
      setAddMemberStatus("Couldn't add them — they may already be a member.");
      return;
    }
    setAddMemberStatus("Added!");
    setAddMemberContact("");
    fetchGroupDetail(activeGroupId, true);
  };

  const handleKick = async (memberUserId: string) => {
    if (!activeGroupId) return;
    await supabase.from("group_members").delete().eq("group_id", activeGroupId).eq("user_id", memberUserId);
    fetchGroupDetail(activeGroupId, isAdmin);
  };

  const handleSetAdmin = async (memberUserId: string, makeAdmin: boolean) => {
    if (!activeGroupId) return;
    await supabase.rpc("set_group_admin", { p_group_id: activeGroupId, p_member_id: memberUserId, p_is_admin: makeAdmin });
    fetchGroupDetail(activeGroupId, isAdmin);
  };

  const handleRespondToJoinRequest = async (requestId: string, approve: boolean) => {
    if (!activeGroupId) return;
    await supabase.rpc("respond_to_join_request", { p_request_id: requestId, p_approve: approve });
    fetchGroupDetail(activeGroupId, true);
    fetchGroups();
  };

  const handleLeaveGroup = async () => {
    if (!activeGroupId || !userId) return;
    await supabase.from("group_members").delete().eq("group_id", activeGroupId).eq("user_id", userId);
    setScreen("list");
    setActiveGroupId(null);
    fetchGroups();
  };

  const handleDeleteGroup = async () => {
    if (!activeGroupId) return;
    await supabase.from("groups").delete().eq("id", activeGroupId);
    setScreen("list");
    setActiveGroupId(null);
    setConfirmingDelete(false);
    fetchGroups();
  };

  const startEditingInfo = () => {
    if (!activeGroup) return;
    setEditName(activeGroup.name);
    setEditDescription(activeGroup.description ?? "");
    setEditingInfo(true);
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId || !editName.trim()) return;
    setSavingInfo(true);
    await supabase
      .from("groups")
      .update({ name: editName.trim(), description: editDescription.trim() || null })
      .eq("id", activeGroupId);
    setSavingInfo(false);
    setEditingInfo(false);
    fetchGroups();
  };

  const groupList = [...groups].sort((a, b) => {
    if (a.unread_count > 0 !== b.unread_count > 0) return a.unread_count > 0 ? -1 : 1;
    if (a.last_message_at && b.last_message_at) return b.last_message_at.localeCompare(a.last_message_at);
    if (a.last_message_at) return -1;
    if (b.last_message_at) return 1;
    return 0;
  });

  const roleLabel = (role: string) => (role === "owner" ? "Owner" : role === "admin" ? "Admin" : null);

  // --- Detail screen (chat + members tabs for one group) ---
  if (screen === "detail" && activeGroup) {
    return (
      <div className={`friends-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`} style={expand ? undefined : style}>
        <div className="bible-panel-header no-print">
          <button
            type="button"
            className="friends-back"
            onClick={() => {
              setScreen("list");
              setActiveGroupId(null);
            }}
            aria-label="Back to groups list"
          >
            ← Back
          </button>
          <h3>{activeGroup.name}</h3>
          <button className="panel-close" onClick={onClose} aria-label="Close Friends panel">
            ×
          </button>
        </div>

        <div className="group-detail-tabs">
          <button type="button" className={detailTab === "chat" ? "active" : ""} onClick={() => setDetailTab("chat")}>
            Chat
          </button>
          <button type="button" className={detailTab === "members" ? "active" : ""} onClick={() => setDetailTab("members")}>
            Members ({members.length})
            {isAdmin && joinRequests.length > 0 && <span className="friends-list-item-badge">{joinRequests.length}</span>}
          </button>
        </div>

        {detailTab === "chat" && (
          <>
            {(() => {
              const pinnedMessage = groupMessages.find((m) => m.pinned);
              if (!pinnedMessage) return null;
              const pinnedSender = profiles[pinnedMessage.sender_id];
              return (
                <div className="pinned-message-banner">
                  <span className="pinned-message-icon" aria-hidden="true">📌</span>
                  <span className="pinned-message-text">
                    {pinnedMessage.sender_id !== userId && pinnedSender && `${displayFor(pinnedSender)}: `}
                    {pinnedMessage.body}
                  </span>
                  <button type="button" onClick={() => handleToggleGroupPin(pinnedMessage)} aria-label="Unpin message">
                    Unpin
                  </button>
                </div>
              );
            })()}
            <div className="message-list">
              {groupMessages.length === 0 && <p className="comment-status">No messages yet — say hello!</p>}
              {groupMessages.map((m) => {
                const own = m.sender_id === userId;
                const senderProfile = profiles[m.sender_id];
                return (
                  <div key={m.id} className={`message-bubble-row ${own ? "message-own" : ""}`}>
                    <div className="group-message-stack">
                      {!own && <span className="group-message-sender">{senderProfile ? displayFor(senderProfile) : "Someone"}</span>}
                      <div className="message-bubble">
                        {m.body}
                        <button
                          type="button"
                          className={`message-pin-toggle ${m.pinned ? "message-pin-toggle-active" : ""}`}
                          onClick={() => handleToggleGroupPin(m)}
                          aria-label={m.pinned ? "Unpin message" : "Pin message"}
                          title={m.pinned ? "Unpin message" : "Pin message"}
                        >
                          📌
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form className="comment-form message-form" onSubmit={handleSendGroupMessage}>
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
          </>
        )}

        {detailTab === "members" && (
          <div className="group-members-scroll">
            {editingInfo ? (
              <form className="group-info-edit-form" onSubmit={handleSaveInfo}>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Group name" required maxLength={80} />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Short description (optional)"
                  rows={2}
                  maxLength={300}
                />
                <div className="group-info-edit-actions">
                  <button type="submit" disabled={savingInfo || !editName.trim()}>
                    {savingInfo ? "…" : "Save"}
                  </button>
                  <button type="button" className="friends-decline" onClick={() => setEditingInfo(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="group-info-display">
                {activeGroup.description && <p className="group-description">{activeGroup.description}</p>}
                {isAdmin && (
                  <button type="button" className="friends-invite-link-button" onClick={startEditingInfo}>
                    ✏️ Edit name &amp; description
                  </button>
                )}
              </div>
            )}

            {isAdmin && (
              <>
                <button type="button" className="friends-invite-link-button" onClick={handleCopyInviteLink}>
                  🔗 Copy invite link
                </button>
                {inviteStatus && <p className="comment-status">{inviteStatus}</p>}

                <form className="friends-add-form" onSubmit={handleAddMember}>
                  <input
                    type="text"
                    value={addMemberContact}
                    onChange={(e) => setAddMemberContact(e.target.value)}
                    placeholder="Add by email or phone"
                    required
                  />
                  <button type="submit" disabled={addingMember || !addMemberContact.trim()}>
                    {addingMember ? "…" : "Add"}
                  </button>
                </form>
                {addMemberStatus && <p className="comment-status">{addMemberStatus}</p>}
              </>
            )}

            {isAdmin && joinRequests.length > 0 && (
              <div className="friends-section">
                <h4>Join Requests</h4>
                <ul className="friends-list">
                  {joinRequests.map((r) => (
                    <li key={r.id} className="friends-list-item">
                      <span>{profiles[r.user_id] ? displayFor(profiles[r.user_id]) : "Someone"}</span>
                      <div className="friends-request-actions">
                        <button type="button" onClick={() => handleRespondToJoinRequest(r.id, true)}>
                          Approve
                        </button>
                        <button type="button" className="friends-decline" onClick={() => handleRespondToJoinRequest(r.id, false)}>
                          Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="friends-section">
              <h4>Members</h4>
              <ul className="friends-list">
                {members.map((m) => {
                  const p = profiles[m.user_id];
                  const label = roleLabel(m.role);
                  const isMe = m.user_id === userId;
                  return (
                    <li key={m.user_id} className="friends-list-item group-member-item">
                      <span>
                        {p ? displayFor(p) : "Someone"}
                        {isMe && " (you)"}
                        {label && <span className="group-role-badge">{label}</span>}
                      </span>
                      {!isMe && (
                        <div className="friends-request-actions">
                          {isOwner && m.role !== "owner" && (
                            <button type="button" onClick={() => handleSetAdmin(m.user_id, m.role !== "admin")}>
                              {m.role === "admin" ? "Remove Admin" : "Make Admin"}
                            </button>
                          )}
                          {isAdmin && m.role === "member" && (
                            <button type="button" className="friends-decline" onClick={() => handleKick(m.user_id)}>
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="group-danger-zone">
              <button type="button" className="friends-decline" onClick={handleLeaveGroup}>
                Leave Group
              </button>
              {isOwner && (
                <button
                  type="button"
                  className="friends-decline"
                  onClick={() => (confirmingDelete ? handleDeleteGroup() : setConfirmingDelete(true))}
                >
                  {confirmingDelete ? "Confirm Delete Group" : "Delete Group"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Create screen ---
  if (screen === "create") {
    return (
      <div className={`friends-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`} style={expand ? undefined : style}>
        <div className="bible-panel-header no-print">
          <button type="button" className="friends-back" onClick={() => setScreen("list")} aria-label="Back to groups list">
            ← Back
          </button>
          <h3>New Group</h3>
          <button className="panel-close" onClick={onClose} aria-label="Close Friends panel">
            ×
          </button>
        </div>
        <form className="group-create-form" onSubmit={handleCreateGroup}>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Group name" required maxLength={80} autoFocus />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Short description (optional)"
            rows={2}
            maxLength={300}
          />
          <p className="friends-invite-hint">Add friends now, or skip and invite people later.</p>
          {friendOptions.length === 0 ? (
            <p className="comment-status">You don't have any friends to add yet — you can still create the group and invite people later.</p>
          ) : (
            <ul className="friends-list group-friend-picker">
              {friendOptions.map((p) => (
                <li key={p.id} className="friends-list-item friends-list-item-clickable" onClick={() => toggleFriendSelected(p.id)}>
                  <label>
                    <input type="checkbox" checked={selectedFriendIds.has(p.id)} onChange={() => toggleFriendSelected(p.id)} />
                    {displayFor(p)}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {createError && <p className="auth-status auth-error">{createError}</p>}
          <button type="submit" disabled={creating || !newName.trim()}>
            {creating ? "…" : "Create Group"}
          </button>
        </form>
      </div>
    );
  }

  // --- List screen ---
  return (
    <div className={`friends-panel ${expand ? "panel-expand" : ""} ${hidden ? "bible-panel-hidden" : ""}`} style={expand ? undefined : style}>
      <div className="bible-panel-header no-print">
        <h3>Groups</h3>
        <button className="panel-close" onClick={onClose} aria-label="Close Friends panel">
          ×
        </button>
      </div>
      <ViewSwitcher
        active="groups"
        onSelectView={onSelectView}
        friendsBadge={friendsBadgeCount}
        messagesBadge={messagesBadgeCount}
        groupsBadge={groupsBadgeCount}
      />

      {!canUse && (
        <p className="bible-status no-print">
          {session?.user.is_anonymous ? "Log in with an account (not just as a guest) to use groups." : "Log in to use groups."}
        </p>
      )}

      {canUse && (
        <>
          <button type="button" className="friends-invite-link-button" onClick={startCreate}>
            ➕ New Group
          </button>

          {groupList.length === 0 && <p className="comment-status">No groups yet — start one above.</p>}
          <ul className="friends-list">
            {groupList.map((g) => (
              <li key={g.group_id} className="friends-list-item friends-list-item-clickable" onClick={() => openGroup(g.group_id)}>
                <div className="message-preview">
                  <span className="message-preview-name">{g.name}</span>
                  <span className="message-preview-text">
                    {g.last_message
                      ? `${g.last_sender_id === userId ? "You: " : ""}${g.last_message}`
                      : g.description || "No messages yet — say hello!"}
                  </span>
                </div>
                {g.unread_count > 0 && <span className="friends-list-item-badge">{g.unread_count}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
