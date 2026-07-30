import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  supabase,
  displayFor,
  isMissingStudyTripTableError,
  type FriendRequest,
  type GroupJoinRequest,
  type GroupMember,
  type GroupMessage,
  type GroupStudyTrip,
  type GroupStudyTripStop,
  type GroupStudyTripStopNote,
  type GroupSummary,
  type Profile,
} from "../lib/supabase";
import ViewSwitcher, { type FriendsView } from "./ViewSwitcher";
import BackButton from "./BackButton";
import { locations } from "../data/locations";
import { pois } from "../data/pois";
import { BOOKS } from "../data/bibleBooks";

type Screen = "list" | "create" | "detail";
type DetailTab = "chat" | "members" | "trips";

/** A trip stop's location_id resolved against both static datasets — locations first, matching how
 * seasonal walk stops resolve (no stop id exists in both datasets today). Null when the id matches
 * neither (e.g. a dataset entry was renamed after the stop was saved). */
function resolveStopPlace(
  locationId: string
): { id: string; name: string; isPoi: boolean } | null {
  const loc = locations.find((l) => l.id === locationId);
  if (loc) return { id: loc.id, name: loc.name, isPoi: false };
  const poi = pois.find((p) => p.id === locationId);
  if (poi) return { id: poi.id, name: poi.name, isPoi: true };
  return null;
}

/** Whether a scripture_ref string parses as a real "Book Chapter[:Verse[-Verse]]" reference the
 * Bible panel can load — gates the stop's "Read" button so a typo'd ref doesn't offer a dead jump. */
function scriptureRefParses(ref: string | null): boolean {
  if (!ref) return false;
  const match = ref.trim().match(/^(.*?)\s+(\d+)(?::(\d+)(?:-\d+)?)?$/);
  if (!match) return false;
  const book = BOOKS.find((b) => b.name.toLowerCase() === match[1].trim().toLowerCase());
  if (!book) return false;
  const chapter = parseInt(match[2], 10);
  return chapter >= 1 && chapter <= book.chapters;
}

interface GroupsPanelProps {
  session: Session | null;
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
  /** Study-trip stop actions, threaded from App.tsx — same paths the Bible panel's place links use
   * (focus the map on a location/POI) and openVerse (load a reference into the Bible panel). */
  onSelectLocation?: (id: string) => void;
  onSelectPoi?: (id: string) => void;
  onGoToReference?: (reference: string) => void;
}

export default function GroupsPanel({
  session,
  expand,
  style,
  hidden,
  openViewNonce,
  onSelectView,
  friendsBadgeCount,
  messagesBadgeCount,
  groupsBadgeCount,
  onSelectLocation,
  onSelectPoi,
  onGoToReference,
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
    fetchFriendOptions();
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

  /** Same as handleAddMember but for the friend-picker list, which already has the user's id and
   * doesn't need the email/phone lookup step. */
  const handleAddFriendAsMember = async (friendId: string) => {
    if (!activeGroupId) return;
    setAddingMember(true);
    setAddMemberStatus(null);
    const { error: addErr } = await supabase.rpc("add_group_member", { p_group_id: activeGroupId, p_member_id: friendId });
    setAddingMember(false);
    if (addErr) {
      setAddMemberStatus("Couldn't add them — they may already be a member.");
      return;
    }
    setAddMemberStatus("Added!");
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
          <BackButton
            onClick={() => {
              setScreen("list");
              setActiveGroupId(null);
            }}
            ariaLabel="Back to groups list"
          />
          <h3>{activeGroup.name}</h3>
        </div>

        <div className="group-detail-tabs">
          <button type="button" className={detailTab === "chat" ? "active" : ""} onClick={() => setDetailTab("chat")}>
            Chat
          </button>
          <button type="button" className={detailTab === "members" ? "active" : ""} onClick={() => setDetailTab("members")}>
            Members ({members.length})
            {isAdmin && joinRequests.length > 0 && <span className="friends-list-item-badge">{joinRequests.length}</span>}
          </button>
          <button type="button" className={detailTab === "trips" ? "active" : ""} onClick={() => setDetailTab("trips")}>
            Study Trips
          </button>
        </div>

        {detailTab === "trips" && (
          <StudyTripsTab
            key={activeGroup.group_id}
            groupId={activeGroup.group_id}
            userId={userId}
            isAdmin={isAdmin}
            profiles={profiles}
            fetchProfilesFor={fetchProfilesFor}
            onSelectLocation={onSelectLocation}
            onSelectPoi={onSelectPoi}
            onGoToReference={onGoToReference}
          />
        )}

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

                {(() => {
                  const memberIds = new Set(members.map((m) => m.user_id));
                  const addableFriends = friendOptions.filter((f) => !memberIds.has(f.id));
                  if (addableFriends.length === 0) return null;
                  return (
                    <div className="group-friend-add-list">
                      <span className="group-friend-add-list-label">Add from friends</span>
                      {addableFriends.map((f) => (
                        <button
                          type="button"
                          key={f.id}
                          className="group-friend-add-row"
                          disabled={addingMember}
                          onClick={() => handleAddFriendAsMember(f.id)}
                        >
                          <span>{displayFor(f)}</span>
                          <span aria-hidden="true">＋</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}

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
          <BackButton onClick={() => setScreen("list")} ariaLabel="Back to groups list" />
          <h3>New Group</h3>
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

// ---------------------------------------------------------------------------------------------
// Study Trips tab — geography-native group study trips (a leader-curated, ordered walk through
// places on the map, with a shared note thread under each stop). Kept as its own component,
// keyed on groupId by the caller, so all trip state resets cleanly when switching groups.
// ---------------------------------------------------------------------------------------------

interface StudyTripsTabProps {
  groupId: string;
  userId: string | undefined;
  isAdmin: boolean;
  profiles: Record<string, Profile>;
  fetchProfilesFor: (ids: string[]) => void;
  onSelectLocation?: (id: string) => void;
  onSelectPoi?: (id: string) => void;
  onGoToReference?: (reference: string) => void;
}

/** Blank editable fields for one stop — shared by the add form and the per-stop edit form. */
interface StopDraft {
  label: string;
  scripture: string;
  description: string;
}

const EMPTY_STOP_DRAFT: StopDraft = { label: "", scripture: "", description: "" };

function StudyTripsTab({
  groupId,
  userId,
  isAdmin,
  profiles,
  fetchProfilesFor,
  onSelectLocation,
  onSelectPoi,
  onGoToReference,
}: StudyTripsTabProps) {
  const [trips, setTrips] = useState<GroupStudyTrip[]>([]);
  const [stopCounts, setStopCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  // True once any trip query fails with a missing-table error — the migration hasn't been applied
  // yet, so the whole tab degrades to one quiet notice instead of crashing or spamming errors.
  const [unavailable, setUnavailable] = useState(false);

  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [stops, setStops] = useState<GroupStudyTripStop[]>([]);
  const [notesByStop, setNotesByStop] = useState<Record<string, GroupStudyTripStopNote[]>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteFor, setSavingNoteFor] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteBody, setEditNoteBody] = useState("");

  const [showNewTrip, setShowNewTrip] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState("");
  const [newTripDescription, setNewTripDescription] = useState("");
  const [creatingTrip, setCreatingTrip] = useState(false);

  const [editingTrip, setEditingTrip] = useState(false);
  const [editTripTitle, setEditTripTitle] = useState("");
  const [editTripDescription, setEditTripDescription] = useState("");
  const [savingTrip, setSavingTrip] = useState(false);
  const [confirmingDeleteTrip, setConfirmingDeleteTrip] = useState(false);

  const [showAddStop, setShowAddStop] = useState(false);
  const [stopSearch, setStopSearch] = useState("");
  const [stopSearchOpen, setStopSearchOpen] = useState(false);
  const [pickedPlace, setPickedPlace] = useState<{ id: string; name: string } | null>(null);
  const [addStopDraft, setAddStopDraft] = useState<StopDraft>(EMPTY_STOP_DRAFT);
  const [savingStop, setSavingStop] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editStopDraft, setEditStopDraft] = useState<StopDraft>(EMPTY_STOP_DRAFT);
  // Guards the up/down/delete buttons while a renumber is in flight — a second click mid-write
  // would race the two-phase position update and could leave duplicate positions behind.
  const [reordering, setReordering] = useState(false);

  const activeTrip = trips.find((t) => t.id === activeTripId) ?? null;

  /** Logs unexpected trip errors once and flips the tab to its quiet notice for missing tables. */
  const handleTripError = (error: { code?: string; message?: string }, context: string) => {
    if (isMissingStudyTripTableError(error)) setUnavailable(true);
    else console.error(`Study trips: ${context}:`, error.message);
  };

  const fetchTrips = async () => {
    const { data, error } = await supabase
      .from("group_study_trips")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (error) {
      handleTripError(error, "failed to load trips");
      setLoading(false);
      return;
    }
    const rows = (data as GroupStudyTrip[] | null) ?? [];
    setTrips(rows);
    fetchProfilesFor(rows.map((t) => t.created_by));
    if (rows.length > 0) {
      const { data: stopData } = await supabase
        .from("group_study_trip_stops")
        .select("trip_id")
        .in("trip_id", rows.map((t) => t.id));
      const counts: Record<string, number> = {};
      (((stopData as { trip_id: string }[] | null) ?? [])).forEach((s) => {
        counts[s.trip_id] = (counts[s.trip_id] ?? 0) + 1;
      });
      setStopCounts(counts);
    } else {
      setStopCounts({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const fetchStopsAndNotes = async (tripId: string) => {
    const { data, error } = await supabase
      .from("group_study_trip_stops")
      .select("*")
      .eq("trip_id", tripId)
      .order("position", { ascending: true });
    if (error) {
      handleTripError(error, "failed to load stops");
      return;
    }
    const stopRows = (data as GroupStudyTripStop[] | null) ?? [];
    setStops(stopRows);
    if (stopRows.length === 0) {
      setNotesByStop({});
      return;
    }
    const { data: noteData, error: noteError } = await supabase
      .from("group_study_trip_stop_notes")
      .select("*")
      .in("stop_id", stopRows.map((s) => s.id))
      .order("created_at", { ascending: true });
    if (noteError) {
      handleTripError(noteError, "failed to load stop notes");
      return;
    }
    const noteRows = (noteData as GroupStudyTripStopNote[] | null) ?? [];
    const grouped: Record<string, GroupStudyTripStopNote[]> = {};
    noteRows.forEach((n) => {
      (grouped[n.stop_id] ??= []).push(n);
    });
    setNotesByStop(grouped);
    fetchProfilesFor(noteRows.map((n) => n.author_id));
  };

  const openTrip = (tripId: string) => {
    setActiveTripId(tripId);
    setStops([]);
    setNotesByStop({});
    setNoteDrafts({});
    setEditingTrip(false);
    setConfirmingDeleteTrip(false);
    setShowAddStop(false);
    setEditingStopId(null);
    setEditingNoteId(null);
    fetchStopsAndNotes(tripId);
  };

  const backToTripList = () => {
    setActiveTripId(null);
    fetchTrips(); // refresh stop counts after any edits inside the trip
  };

  // --- Trip create / edit / delete (leaders only; RLS enforces server-side too) ---

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newTripTitle.trim()) return;
    setCreatingTrip(true);
    const { data, error } = await supabase
      .from("group_study_trips")
      .insert({
        group_id: groupId,
        created_by: userId,
        title: newTripTitle.trim(),
        description: newTripDescription.trim() || null,
      })
      .select()
      .single();
    setCreatingTrip(false);
    if (error || !data) {
      if (error) handleTripError(error, "failed to create trip");
      return;
    }
    const trip = data as GroupStudyTrip;
    setTrips((prev) => [...prev, trip]);
    setShowNewTrip(false);
    setNewTripTitle("");
    setNewTripDescription("");
    openTrip(trip.id);
  };

  const startEditTrip = () => {
    if (!activeTrip) return;
    setEditTripTitle(activeTrip.title);
    setEditTripDescription(activeTrip.description ?? "");
    setEditingTrip(true);
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTripId || !editTripTitle.trim()) return;
    setSavingTrip(true);
    const { error } = await supabase
      .from("group_study_trips")
      .update({
        title: editTripTitle.trim(),
        description: editTripDescription.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeTripId);
    setSavingTrip(false);
    if (error) {
      handleTripError(error, "failed to save trip");
      return;
    }
    setTrips((prev) =>
      prev.map((t) =>
        t.id === activeTripId
          ? { ...t, title: editTripTitle.trim(), description: editTripDescription.trim() || null }
          : t
      )
    );
    setEditingTrip(false);
  };

  const handleDeleteTrip = async () => {
    if (!activeTripId) return;
    const { error } = await supabase.from("group_study_trips").delete().eq("id", activeTripId);
    if (error) {
      handleTripError(error, "failed to delete trip");
      return;
    }
    setTrips((prev) => prev.filter((t) => t.id !== activeTripId));
    setConfirmingDeleteTrip(false);
    setActiveTripId(null);
  };

  // --- Stops (leaders only) ---

  /** Combined location + POI matches for the add-stop search — same matching idiom as SearchBar
   * (case-insensitive substring over name + alternateNames, capped at 8). Locations listed first,
   * mirroring the resolve order. */
  const stopSearchResults = useMemo(() => {
    const q = stopSearch.trim().toLowerCase();
    if (!q) return [];
    const matches: { id: string; name: string; detail: string }[] = [];
    locations.forEach((loc) => {
      const names = [loc.name, ...(loc.alternateNames ?? [])].map((n) => n.toLowerCase());
      if (names.some((n) => n.includes(q))) matches.push({ id: loc.id, name: loc.name, detail: loc.category });
    });
    pois.forEach((poi) => {
      const names = [poi.name, ...(poi.alternateNames ?? [])].map((n) => n.toLowerCase());
      if (names.some((n) => n.includes(q))) matches.push({ id: poi.id, name: poi.name, detail: poi.tag });
    });
    return matches.slice(0, 8);
  }, [stopSearch]);

  /** Persists client-side renumbered positions. Two phases (park high, then land) because position
   * is unique per trip — a straight swap would transiently collide inside the batch. If either phase
   * partially fails, the optimistic UI can no longer be trusted (some rows may be parked at 1000+ with
   * no retry/rollback), so re-fetch the trip's stops from the server to resync instead of leaving stale
   * client state around to collide with a later add-stop. */
  const persistPositions = async (next: GroupStudyTripStop[], previous: GroupStudyTripStop[]) => {
    const changed = next.filter((s) => previous.find((p) => p.id === s.id)?.position !== s.position);
    if (changed.length === 0) return;
    const parkResults = await Promise.all(
      changed.map((s) =>
        supabase.from("group_study_trip_stops").update({ position: s.position + 1000 }).eq("id", s.id)
      )
    );
    const landResults = await Promise.all(
      changed.map((s) =>
        supabase.from("group_study_trip_stops").update({ position: s.position }).eq("id", s.id)
      )
    );
    const failed = [...parkResults, ...landResults].some((r) => r.error);
    if (failed && activeTripId) {
      handleTripError({ message: "failed to reorder stops" }, "failed to reorder stops");
      await fetchStopsAndNotes(activeTripId);
    }
  };

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTripId || !pickedPlace) return;
    setSavingStop(true);
    const { data, error } = await supabase
      .from("group_study_trip_stops")
      .insert({
        trip_id: activeTripId,
        position: stops.length + 1,
        location_id: pickedPlace.id,
        label: addStopDraft.label.trim() || null,
        scripture_ref: addStopDraft.scripture.trim() || null,
        description: addStopDraft.description.trim() || null,
      })
      .select()
      .single();
    setSavingStop(false);
    if (error || !data) {
      if (error) handleTripError(error, "failed to add stop");
      return;
    }
    setStops((prev) => [...prev, data as GroupStudyTripStop]);
    setPickedPlace(null);
    setStopSearch("");
    setAddStopDraft(EMPTY_STOP_DRAFT);
  };

  const startEditStop = (stop: GroupStudyTripStop) => {
    setEditingStopId(stop.id);
    setEditStopDraft({
      label: stop.label ?? "",
      scripture: stop.scripture_ref ?? "",
      description: stop.description ?? "",
    });
  };

  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStopId) return;
    setSavingStop(true);
    const patch = {
      label: editStopDraft.label.trim() || null,
      scripture_ref: editStopDraft.scripture.trim() || null,
      description: editStopDraft.description.trim() || null,
    };
    const { error } = await supabase.from("group_study_trip_stops").update(patch).eq("id", editingStopId);
    setSavingStop(false);
    if (error) {
      handleTripError(error, "failed to save stop");
      return;
    }
    setStops((prev) => prev.map((s) => (s.id === editingStopId ? { ...s, ...patch } : s)));
    setEditingStopId(null);
  };

  const handleMoveStop = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (reordering || target < 0 || target >= stops.length) return;
    setReordering(true);
    const next = [...stops];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((s, i) => ({ ...s, position: i + 1 }));
    setStops(renumbered);
    await persistPositions(renumbered, stops);
    setReordering(false);
  };

  const handleDeleteStop = async (stopId: string) => {
    if (reordering) return;
    setReordering(true);
    const { error } = await supabase.from("group_study_trip_stops").delete().eq("id", stopId);
    if (error) {
      handleTripError(error, "failed to delete stop");
      setReordering(false);
      return;
    }
    const remaining = stops.filter((s) => s.id !== stopId);
    const renumbered = remaining.map((s, i) => ({ ...s, position: i + 1 }));
    setStops(renumbered);
    await persistPositions(renumbered, remaining);
    setReordering(false);
  };

  // --- Stop notes (any member) ---

  const handleAddNote = async (stopId: string) => {
    const body = (noteDrafts[stopId] ?? "").trim();
    if (!userId || !body) return;
    setSavingNoteFor(stopId);
    const { data, error } = await supabase
      .from("group_study_trip_stop_notes")
      .insert({ stop_id: stopId, author_id: userId, body })
      .select()
      .single();
    setSavingNoteFor(null);
    if (error || !data) {
      if (error) handleTripError(error, "failed to add note");
      return;
    }
    setNotesByStop((prev) => ({ ...prev, [stopId]: [...(prev[stopId] ?? []), data as GroupStudyTripStopNote] }));
    setNoteDrafts((prev) => ({ ...prev, [stopId]: "" }));
  };

  const handleSaveNote = async (note: GroupStudyTripStopNote) => {
    const body = editNoteBody.trim();
    if (!body) return;
    const { error } = await supabase
      .from("group_study_trip_stop_notes")
      .update({ body, updated_at: new Date().toISOString() })
      .eq("id", note.id);
    if (error) {
      handleTripError(error, "failed to save note");
      return;
    }
    setNotesByStop((prev) => ({
      ...prev,
      [note.stop_id]: (prev[note.stop_id] ?? []).map((n) => (n.id === note.id ? { ...n, body } : n)),
    }));
    setEditingNoteId(null);
  };

  const handleDeleteNote = async (note: GroupStudyTripStopNote) => {
    const { error } = await supabase.from("group_study_trip_stop_notes").delete().eq("id", note.id);
    if (error) {
      handleTripError(error, "failed to delete note");
      return;
    }
    setNotesByStop((prev) => ({
      ...prev,
      [note.stop_id]: (prev[note.stop_id] ?? []).filter((n) => n.id !== note.id),
    }));
  };

  const handleViewOnMap = (stop: GroupStudyTripStop) => {
    const place = resolveStopPlace(stop.location_id);
    if (!place) return;
    if (place.isPoi) onSelectPoi?.(place.id);
    else onSelectLocation?.(place.id);
  };

  // --- Render ---

  if (unavailable) {
    return (
      <div className="group-members-scroll">
        <p className="trip-unavailable">Study trips will be available after the next database update.</p>
      </div>
    );
  }

  // Trip detail — ordered stops, per-stop notes, and (for leaders) the stop editor.
  if (activeTrip) {
    const stopDraftFields = (draft: StopDraft, setDraft: (d: StopDraft) => void) => (
      <>
        <input
          type="text"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          placeholder="Label (optional — defaults to the place name)"
          maxLength={80}
        />
        <input
          type="text"
          value={draft.scripture}
          onChange={(e) => setDraft({ ...draft, scripture: e.target.value })}
          placeholder="Scripture ref (optional, e.g. Acts 16:12)"
        />
        {draft.scripture.trim() !== "" && !scriptureRefParses(draft.scripture) && (
          <p className="trip-ref-warning">
            This doesn't parse as a "Book Chapter:Verse" reference — the stop's Read button will be hidden.
          </p>
        )}
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="What to look for at this stop (optional)"
          rows={3}
          maxLength={2000}
        />
      </>
    );

    return (
      <div className="group-members-scroll">
        <button type="button" className="friends-back trip-back" onClick={backToTripList} aria-label="Back to study trips">
          ← All trips
        </button>

        {editingTrip ? (
          <form className="group-info-edit-form" onSubmit={handleSaveTrip}>
            <input
              type="text"
              value={editTripTitle}
              onChange={(e) => setEditTripTitle(e.target.value)}
              placeholder="Trip title"
              required
              maxLength={80}
            />
            <textarea
              value={editTripDescription}
              onChange={(e) => setEditTripDescription(e.target.value)}
              placeholder="Short description (optional)"
              rows={2}
              maxLength={300}
            />
            <div className="group-info-edit-actions">
              <button type="submit" disabled={savingTrip || !editTripTitle.trim()}>
                {savingTrip ? "…" : "Save"}
              </button>
              <button type="button" className="friends-decline" onClick={() => setEditingTrip(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="trip-detail-header">
            <h4 className="trip-detail-title">{activeTrip.title}</h4>
            {activeTrip.description && <p className="group-description">{activeTrip.description}</p>}
            <p className="trip-list-meta">
              Created by{" "}
              {activeTrip.created_by === userId
                ? "you"
                : profiles[activeTrip.created_by]
                  ? displayFor(profiles[activeTrip.created_by])
                  : "a group leader"}
            </p>
            {isAdmin && (
              <div className="trip-detail-admin-actions">
                <button type="button" className="trip-action-button" onClick={startEditTrip}>
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  className="trip-action-button trip-action-danger"
                  onClick={() => (confirmingDeleteTrip ? handleDeleteTrip() : setConfirmingDeleteTrip(true))}
                >
                  {confirmingDeleteTrip ? "Confirm delete trip" : "Delete trip"}
                </button>
              </div>
            )}
          </div>
        )}

        {stops.length === 0 && (
          <p className="comment-status">
            {isAdmin ? "No stops yet — add the first one below." : "No stops yet — a group leader can add some."}
          </p>
        )}

        <ol className="trip-stop-list">
          {stops.map((stop, index) => {
            const place = resolveStopPlace(stop.location_id);
            const stopNotes = notesByStop[stop.id] ?? [];
            const editingThis = editingStopId === stop.id;
            return (
              <li key={stop.id} className="trip-stop">
                <div className="trip-stop-header">
                  <span className="trip-stop-position" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="trip-stop-titles">
                    <span className="trip-stop-name">{stop.label || place?.name || stop.location_id}</span>
                    {stop.label && place && place.name !== stop.label && (
                      <span className="trip-stop-place">📍 {place.name}</span>
                    )}
                    {stop.scripture_ref && <span className="trip-stop-ref">📖 {stop.scripture_ref}</span>}
                  </div>
                </div>

                {editingThis ? (
                  <form className="trip-stop-form" onSubmit={handleSaveStop}>
                    {stopDraftFields(editStopDraft, setEditStopDraft)}
                    <div className="group-info-edit-actions">
                      <button type="submit" disabled={savingStop}>
                        {savingStop ? "…" : "Save"}
                      </button>
                      <button type="button" className="friends-decline" onClick={() => setEditingStopId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {stop.description && <p className="trip-stop-desc">{stop.description}</p>}
                    <div className="trip-stop-actions">
                      <button
                        type="button"
                        className="trip-action-button"
                        onClick={() => handleViewOnMap(stop)}
                        disabled={!place}
                        title={place ? undefined : "This stop's place is no longer in the atlas"}
                      >
                        🗺️ View on map
                      </button>
                      {scriptureRefParses(stop.scripture_ref) && onGoToReference && (
                        <button
                          type="button"
                          className="trip-action-button"
                          onClick={() => onGoToReference(stop.scripture_ref!)}
                        >
                          📖 Read
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            className="trip-action-button"
                            onClick={() => handleMoveStop(index, -1)}
                            disabled={reordering || index === 0}
                            aria-label="Move stop up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="trip-action-button"
                            onClick={() => handleMoveStop(index, 1)}
                            disabled={reordering || index === stops.length - 1}
                            aria-label="Move stop down"
                          >
                            ↓
                          </button>
                          <button type="button" className="trip-action-button" onClick={() => startEditStop(stop)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="trip-action-button trip-action-danger"
                            onClick={() => handleDeleteStop(stop.id)}
                            disabled={reordering}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}

                <div className="trip-stop-notes">
                  {stopNotes.map((note) => {
                    const own = note.author_id === userId;
                    const author = profiles[note.author_id];
                    return (
                      <div key={note.id} className="trip-note">
                        <span className="trip-note-author">{own ? "You" : author ? displayFor(author) : "Someone"}</span>
                        {editingNoteId === note.id ? (
                          <>
                            <textarea
                              value={editNoteBody}
                              onChange={(e) => setEditNoteBody(e.target.value)}
                              rows={2}
                              maxLength={4000}
                            />
                            <div className="trip-note-actions">
                              <button type="button" onClick={() => handleSaveNote(note)} disabled={!editNoteBody.trim()}>
                                Save
                              </button>
                              <button type="button" onClick={() => setEditingNoteId(null)}>
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="trip-note-body">{note.body}</p>
                            {(own || isAdmin) && (
                              <div className="trip-note-actions">
                                {own && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingNoteId(note.id);
                                      setEditNoteBody(note.body);
                                    }}
                                  >
                                    Edit
                                  </button>
                                )}
                                <button type="button" onClick={() => handleDeleteNote(note)}>
                                  Delete
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                  {userId && (
                    <form
                      className="trip-note-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddNote(stop.id);
                      }}
                    >
                      <textarea
                        value={noteDrafts[stop.id] ?? ""}
                        onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [stop.id]: e.target.value }))}
                        placeholder="Add a note for the group…"
                        rows={1}
                        maxLength={4000}
                      />
                      <button type="submit" disabled={savingNoteFor === stop.id || !(noteDrafts[stop.id] ?? "").trim()}>
                        {savingNoteFor === stop.id ? "…" : "Add"}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {isAdmin &&
          (showAddStop ? (
            <form className="trip-stop-form trip-add-stop-form" onSubmit={handleAddStop}>
              <span className="group-friend-add-list-label">New stop</span>
              {pickedPlace ? (
                <div className="trip-picked-place">
                  <span>📍 {pickedPlace.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPickedPlace(null);
                      setStopSearch("");
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="trip-stop-search">
                  <input
                    type="text"
                    value={stopSearch}
                    onChange={(e) => {
                      setStopSearch(e.target.value);
                      setStopSearchOpen(true);
                    }}
                    onFocus={() => setStopSearchOpen(true)}
                    onBlur={() => setTimeout(() => setStopSearchOpen(false), 150)}
                    placeholder="Search places & points of interest…"
                    autoFocus
                  />
                  {stopSearchOpen && stopSearch.trim() !== "" && (
                    <ul className="trip-search-results">
                      {stopSearchResults.length > 0 ? (
                        stopSearchResults.map((r) => (
                          <li key={r.id} onMouseDown={() => setPickedPlace({ id: r.id, name: r.name })}>
                            <span className="search-result-name">{r.name}</span>
                            <span className="search-result-category">{r.detail}</span>
                          </li>
                        ))
                      ) : (
                        <li className="trip-search-results-empty">No results found</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
              {stopDraftFields(addStopDraft, setAddStopDraft)}
              <div className="group-info-edit-actions">
                <button type="submit" disabled={savingStop || !pickedPlace}>
                  {savingStop ? "…" : "Add stop"}
                </button>
                <button
                  type="button"
                  className="friends-decline"
                  onClick={() => {
                    setShowAddStop(false);
                    setPickedPlace(null);
                    setStopSearch("");
                    setAddStopDraft(EMPTY_STOP_DRAFT);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="friends-invite-link-button" onClick={() => setShowAddStop(true)}>
              ➕ Add a stop
            </button>
          ))}
      </div>
    );
  }

  // Trip list — plus the "New trip" form for leaders.
  return (
    <div className="group-members-scroll">
      {isAdmin &&
        (showNewTrip ? (
          <form className="group-info-edit-form" onSubmit={handleCreateTrip}>
            <input
              type="text"
              value={newTripTitle}
              onChange={(e) => setNewTripTitle(e.target.value)}
              placeholder="Trip title (e.g. Paul's Second Journey)"
              required
              maxLength={80}
              autoFocus
            />
            <textarea
              value={newTripDescription}
              onChange={(e) => setNewTripDescription(e.target.value)}
              placeholder="Short description (optional)"
              rows={2}
              maxLength={300}
            />
            <div className="group-info-edit-actions">
              <button type="submit" disabled={creatingTrip || !newTripTitle.trim()}>
                {creatingTrip ? "…" : "Create trip"}
              </button>
              <button type="button" className="friends-decline" onClick={() => setShowNewTrip(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="friends-invite-link-button" onClick={() => setShowNewTrip(true)}>
            ➕ New trip
          </button>
        ))}

      {loading && <p className="comment-status">Loading…</p>}
      {!loading && trips.length === 0 && (
        <p className="comment-status">
          {isAdmin
            ? "No study trips yet — create one to walk your group through the places behind a passage."
            : "No study trips yet — a group leader can create one."}
        </p>
      )}

      <ul className="friends-list">
        {trips.map((t) => {
          const count = stopCounts[t.id] ?? 0;
          const creator =
            t.created_by === userId ? "you" : profiles[t.created_by] ? displayFor(profiles[t.created_by]) : "a leader";
          return (
            <li key={t.id} className="friends-list-item friends-list-item-clickable" onClick={() => openTrip(t.id)}>
              <div className="message-preview">
                <span className="message-preview-name">{t.title}</span>
                {t.description && <span className="message-preview-text">{t.description}</span>}
                <span className="trip-list-meta">
                  {count} {count === 1 ? "stop" : "stops"} · by {creator}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
