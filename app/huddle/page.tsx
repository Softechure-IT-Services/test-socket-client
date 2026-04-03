
// app/huddle/page.tsx
"use client";
// @ts-nocheck
import { useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { io, Socket } from "socket.io-client";
import type { IconType } from "react-icons";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import api from "@/lib/axios";
import {
  markStoredHuddleCallLeft,
  upsertStoredHuddleCall,
} from "@/lib/huddle-calls";
import {
  BsCameraVideoFill,
  BsCameraVideoOffFill,
  BsChatDotsFill,
  BsChevronUp,
  BsDisplay,
  BsLink45Deg,
  BsMicFill,
  BsMicMuteFill,
  BsPeopleFill,
  BsTelephoneXFill,
  BsXLg,
} from "react-icons/bs";


type LobbyMode =
  | "loading"
  | "join_now"
  | "ask_to_join"
  | "join_here_too"
  | "waiting"
  | "denied"
  | "invite_required";

type LobbyState = {
  mode: LobbyMode;
  title: string;
  description: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
};

type RoomMember = {
  socketId: string;
  userId: string | null;
  username: string;
};

type HuddleChatMessage = {
  id: string;
  socketId: string;
  userId: string | null;
  username: string;
  text: string;
  createdAt: string;
};

type HuddleSidebarView = "people" | "messages";

const MainPage: React.FC = () => {
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("meeting_id");
  const channelId = searchParams.get("channel_id");

  const { socket: authSocket, user, authReady, hasToken } = useAuth();
  const [guestSocket, setGuestSocket] = useState<Socket | null>(null);
  const socket = authSocket ?? guestSocket;
  const currentUserId = user?.id != null ? String(user.id) : null;
  const [roomParticipants, setRoomParticipants] = useState<RoomMember[]>([]);
  const [pendingAdmissions, setPendingAdmissions] = useState<RoomMember[]>([]);
  const [chatMessages, setChatMessages] = useState<HuddleChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [openSidebarView, setOpenSidebarView] = useState<HuddleSidebarView | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollHuddleChatToBottom = React.useCallback(
    (behavior: "auto" | "smooth" = "auto") => {
      const el = chatScrollRef.current;
      if (!el) return;

      requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior,
        });
      });
    },
    []
  );

  useEffect(() => {
    if (openSidebarView === "messages") {
      scrollHuddleChatToBottom("auto");
    }
  }, [chatMessages, openSidebarView, scrollHuddleChatToBottom]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [huddleAdminUserId, setHuddleAdminUserId] = useState<string | null>(null);
  const [huddleAdminUsername, setHuddleAdminUsername] = useState<string | null>(null);
  const [isChannelMember, setIsChannelMember] = useState(false);
  const [channelAccessReady, setChannelAccessReady] = useState(!channelId || !currentUserId);
  const [lobbyState, setLobbyState] = useState<LobbyState>({
    mode: "loading",
    title: "Preparing huddle",
    description: "Checking whether this huddle already has people inside.",
    primaryLabel: "Checking...",
    primaryDisabled: true,
  });
  const lobbyModeRef = useRef<LobbyMode>("loading");
  const usernameReadyRef = useRef(false);
  const previewReadyRef = useRef(false);
  const currentUsernameRef = useRef("");
  const activeRoomRef = useRef<string | null>(null);
  const isInCallRef = useRef(false);
  const channelAccessReadyRef = useRef(!channelId || !currentUserId);
  const resolvedChannelNameRef = useRef<string | null>(null);
  const isDmChannelRef = useRef(false);
  const huddleAdminUserIdRef = useRef<string | null>(null);
  const huddleAdminUsernameRef = useRef<string | null>(null);
  const canJoinWithoutAdmissionRef = useRef(false);
  const isHuddleAdminRef = useRef(false);
  const openSidebarViewRef = useRef<HuddleSidebarView | null>(null);
  const chatDraftRef = useRef("");
  const inspectRoomRef = useRef<(() => Promise<void>) | null>(null);
  const applyUsernameAndStartRef = useRef<((name: string) => Promise<void>) | null>(null);
  const primaryLobbyActionRef = useRef<(() => void) | null>(null);
  const cancelAdmissionRequestRef = useRef<(() => void) | null>(null);
  const admitParticipantRef = useRef<(socketId: string) => void>(() => {});
  const denyParticipantRef = useRef<(socketId: string) => void>(() => {});
  const sendChatMessageRef = useRef<(() => void) | null>(null);
  const kickParticipantRef = useRef<(socketId: string) => void>(() => {});

  const updateLobbyState = (next: LobbyState) => {
    lobbyModeRef.current = next.mode;
    setLobbyState(next);
  };

  const toggleSidebarView = (view: HuddleSidebarView) => {
    setOpenSidebarView((currentView) => (currentView === view ? null : view));
  };

  const isHuddleAdmin =
    currentUserId != null && huddleAdminUserId === currentUserId;
  const canJoinWithoutAdmission =
    !!channelId && !!currentUserId && isChannelMember;
  const shouldShowAuthLoader = !authReady || hasToken;
  const isPeopleSidebarOpen = openSidebarView === "people";
  const isMessagesSidebarOpen = openSidebarView === "messages";
  const unreadChatBadgeLabel = unreadChatCount > 99 ? "99+" : unreadChatCount;

  const updateHuddleAdminUserId = (userId: string | number | null | undefined) => {
    const normalizedUserId = userId != null ? String(userId) : null;
    huddleAdminUserIdRef.current = normalizedUserId;
    setHuddleAdminUserId(normalizedUserId);
    return normalizedUserId;
  };

  const updateHuddleAdminUsername = (username: string | null | undefined) => {
    const normalizedUsername =
      typeof username === "string" && username.trim() ? username.trim() : null;
    huddleAdminUsernameRef.current = normalizedUsername;
    setHuddleAdminUsername(normalizedUsername);
    return normalizedUsername;
  };

  const resolveHuddleDisplayName = (
    fallbackTitle?: string | null,
    startedByUsername?: string | null
  ) => {
    const normalizedFallback =
      typeof fallbackTitle === "string" && fallbackTitle.trim()
        ? fallbackTitle.trim()
        : null;

    if (channelId) {
      if (isDmChannelRef.current) {
        if (startedByUsername) return `Started by ${startedByUsername}`;
        if (normalizedFallback && normalizedFallback !== `Channel ${channelId}`) {
          return normalizedFallback;
        }
        return "Direct message";
      }

      return (
        resolvedChannelNameRef.current ||
        normalizedFallback ||
        `Channel ${channelId}`
      );
    }

    return (
      normalizedFallback ||
      (resolvedRoomIdRef.current ? `Room: ${resolvedRoomIdRef.current}` : "Room")
    );
  };

  const applyResolvedHuddleSession = (payload: any) => {
    const roomId = payload?.room_id ?? payload?.session?.meeting_id ?? null;
    const adminUserId = payload?.session?.started_by ?? payload?.started_by ?? null;
    const adminUsername =
      payload?.session?.started_by_username ??
      payload?.started_by_username ??
      null;

    if (roomId) {
      setResolvedRoomId(roomId);
      resolvedRoomIdRef.current = roomId;
    }

    updateHuddleAdminUserId(adminUserId);
    updateHuddleAdminUsername(adminUsername);
  };

  useEffect(() => {
    if (authSocket) {
      if (guestSocket) {
        guestSocket.disconnect();
        setGuestSocket(null);
      }
      return;
    }

    if (typeof window === "undefined") return;
    if (!authReady) return;
    if (hasToken) return;
    if (guestSocket) return;

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
    if (!serverUrl) return;

    const guest = io(serverUrl, {
      transports: ["websocket"],
      auth: { guest: true },
    });

    guest.on("connect_error", (err) => {
      console.error("Guest huddle socket error:", err.message);
    });

    setGuestSocket(guest);

    return () => {
      guest.disconnect();
    };
  }, [authReady, authSocket, hasToken]);

  // Clock for bottom bar
  const [meetingTime, setMeetingTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setMeetingTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── FIX 1: Resolve the real room ID from the server before joining ───────
  const [resolvedRoomId, setResolvedRoomId] = useState<string | null>(
    meetingId ?? null
  );
  const resolvedRoomIdRef = useRef<string | null>(meetingId ?? null);

  useEffect(() => {
    resolvedRoomIdRef.current = resolvedRoomId;
    if (!resolvedRoomId) return;
    void inspectRoomRef.current?.();
  }, [resolvedRoomId]);

  useEffect(() => {
    huddleAdminUserIdRef.current = huddleAdminUserId;
    huddleAdminUsernameRef.current = huddleAdminUsername;
    isHuddleAdminRef.current = isHuddleAdmin;
  }, [huddleAdminUserId, huddleAdminUsername, isHuddleAdmin]);

  useEffect(() => {
    channelAccessReadyRef.current = channelAccessReady;
    canJoinWithoutAdmissionRef.current = canJoinWithoutAdmission;
  }, [isChannelMember, channelAccessReady, canJoinWithoutAdmission]);

  useEffect(() => {
    openSidebarViewRef.current = openSidebarView;
    if (openSidebarView === "messages") {
      setUnreadChatCount(0);
    }
  }, [openSidebarView]);

  useEffect(() => {
    chatDraftRef.current = chatDraft;
  }, [chatDraft]);

  useEffect(() => {
    if (!channelId) {
      resolvedChannelNameRef.current = null;
      isDmChannelRef.current = false;
      setIsChannelMember(false);
      setChannelAccessReady(true);
      return;
    }

    if (!currentUserId) {
      resolvedChannelNameRef.current = null;
      isDmChannelRef.current = false;
      setIsChannelMember(false);
      setChannelAccessReady(true);
      return;
    }

    let cancelled = false;
    resolvedChannelNameRef.current = null;
    isDmChannelRef.current = false;
    setChannelAccessReady(false);

    api
      .get(`/channels/${channelId}`)
      .then(({ data }) => {
        if (cancelled) return;
        resolvedChannelNameRef.current =
          typeof data?.channel?.name === "string" && data.channel.name.trim()
            ? data.channel.name.trim()
            : null;
        isDmChannelRef.current = data?.channel?.is_dm === true;
        setIsChannelMember(data?.is_member === true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to resolve channel membership for huddle:", err);
        resolvedChannelNameRef.current = null;
        isDmChannelRef.current = false;
        setIsChannelMember(false);
      })
      .finally(() => {
        if (!cancelled) {
          setChannelAccessReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [channelId, currentUserId]);

  useEffect(() => {
    if (!resolvedRoomId) return;
    if (channelId && !channelAccessReady) return;
    void inspectRoomRef.current?.();
  }, [resolvedRoomId, channelId, channelAccessReady, isChannelMember, huddleAdminUserId]);

  useEffect(() => {
    if (meetingId) {
      setResolvedRoomId(meetingId);
      resolvedRoomIdRef.current = meetingId;
    }

    if (!channelId) return;
    if (typeof window !== "undefined" && !localStorage.getItem("access_token")) {
      if (meetingId) return;
      updateLobbyState({
        mode: "invite_required",
        title: "Invite link required",
        description: "Anonymous guests need the full huddle invite link so the room can be resolved directly.",
        primaryLabel: "Waiting for invite",
        primaryDisabled: true,
      });
      return;
    }

    api
      .get(`/huddle/channel/${channelId}/active`)
      .then(({ data }) => {
        if (data?.session?.started_by != null || data?.started_by != null) {
          applyResolvedHuddleSession(data);
        }

        if (data.active && data.room_id) {
          applyResolvedHuddleSession(data);
        } else {
          if (meetingId) return;
          return api
            .post(`/huddle/channel/${channelId}/start`)
            .then(({ data: startData }) => {
              applyResolvedHuddleSession(startData);
            });
        }
      })
      .catch((err) => {
        console.error("Failed to resolve huddle room:", err);
        if (meetingId) return;
        updateLobbyState({
          mode: "invite_required",
          title: "Invite link required",
          description: "Open the direct huddle invite link with a room id to join as a guest.",
          primaryLabel: "Waiting for invite",
          primaryDisabled: true,
        });
      });
  }, [channelId, meetingId]);

  // ─── FIX 5 (part A): DOM event wiring runs exactly once ──────────────────
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!openSidebarViewRef.current) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-huddle-sidebar-trigger]")) return;
      if (target.closest("[data-huddle-sidebar-drawer]")) return;

      setOpenSidebarView(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenSidebarView(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ─── FIX 5 (part B): Main effect depends only on socket + resolvedRoomId ─
  useEffect(() => {
    if (!socket) return;

    // ---------- STATE / REFS ----------
    const peers: Record<string, any> = {};
    let localStream: MediaStream | null = null;
    let screenStream: MediaStream | null = null;
    let isScreenSharing = false;
    let originalVideoTrack: MediaStreamTrack | null = null;
    let currentRoom: string | null = null;
    let username = "";
    let isInCall = false;
    let pendingCall: any = null;
    let hasCamera = false;
    let hasMicrophone = false;
    let pinnedScreenShareUserId: string | null = null;
    let activeScreenShareOwners: string[] = [];
    let audioContext: AudioContext | null = null;
    let silentAudioTrack: MediaStreamTrack | null = null;
    let deviceCheckInterval: any = null;
    const knownDevices = { audio: [] as string[], video: [] as string[] };

    async function waitForStableState(pc: RTCPeerConnection) {
      if (pc.signalingState === "stable") return;
      await new Promise<void>((resolve) => {
        const handler = () => {
          if (pc.signalingState === "stable") {
            pc.removeEventListener("signalingstatechange", handler);
            resolve();
          }
        };
        pc.addEventListener("signalingstatechange", handler);
      });
    }

    // ---------- DOM ELEMENTS ----------
    const usernameScreen = document.getElementById("usernameScreen")!;
    const mainApp = document.getElementById("mainApp")!;
    const usernameInput = document.getElementById("usernameInput") as HTMLInputElement | null;
    const continueBtn = document.getElementById("continueBtn") as HTMLButtonElement | null;
    const userInitial = document.getElementById("userInitial")!;
    const displayUsername = document.getElementById("displayUsername")!;
    const preview = document.getElementById("preview") as HTMLVideoElement;
    const videos = document.getElementById("videos")!;
    const prejoin = document.getElementById("prejoin")!;
    const meeting = document.getElementById("meeting")!;
    const roomNameEls = [
      document.getElementById("roomName"),
      document.getElementById("roomNameMobile"),
    ].filter(Boolean) as HTMLElement[];
    const incomingCallModal = document.getElementById("incomingCallModal")!;
    const callerName = document.getElementById("callerName")!;
    const callerInitial = document.getElementById("callerInitial")!;
    const toastContainer = document.getElementById("toastContainer")!;
    const prejoinMicSelect = document.getElementById("prejoinMicSelect") as HTMLSelectElement | null;
    const prejoinSpeakerSelect = document.getElementById("prejoinSpeakerSelect") as HTMLSelectElement | null;
    const prejoinCamSelect = document.getElementById("prejoinCamSelect") as HTMLSelectElement | null;
    const meetingMicSelect = document.getElementById("meetingMicSelect") as HTMLSelectElement | null;
    const meetingSpeakerSelect = document.getElementById("meetingSpeakerSelect") as HTMLSelectElement | null;
    const meetingCamSelect = document.getElementById("meetingCamSelect") as HTMLSelectElement | null;
    const micSelects = [prejoinMicSelect, meetingMicSelect].filter(Boolean) as HTMLSelectElement[];
    const speakerSelects = [prejoinSpeakerSelect, meetingSpeakerSelect].filter(Boolean) as HTMLSelectElement[];
    const camSelects = [prejoinCamSelect, meetingCamSelect].filter(Boolean) as HTMLSelectElement[];
    let currentSpeakerDeviceId = "";

    // ---------- USERNAME SETUP ----------
    async function applyUsernameAndStart(name: string) {
      username = name.trim();
      if (!username) return;
      currentUsernameRef.current = username;
      usernameReadyRef.current = true;

      userInitial.textContent = username[0].toUpperCase();
      displayUsername.textContent = username;

      usernameScreen.classList.add("hidden");
      mainApp.classList.remove("hidden");

      socket?.emit("set-username", username);
      await startPreview();
      await inspectResolvedRoom();
    }
    applyUsernameAndStartRef.current = applyUsernameAndStart;

    // ─── FIX 3: Use name/username — NOT email ────────────────────────────────
    if (user?.name || user?.username) {
      applyUsernameAndStart(user.name || user.username);
    } else if (!hasToken && usernameInput && continueBtn) {
      usernameInput.addEventListener("input", () => {
        continueBtn.disabled = usernameInput.value.trim().length === 0;
      });
      usernameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && usernameInput.value.trim()) {
          applyUsernameAndStart(usernameInput.value.trim());
        }
      });
      continueBtn.addEventListener("click", () => {
        const name = usernameInput.value.trim();
        if (name) applyUsernameAndStart(name);
      });
    }

    const normalizeMembers = (members: any[] = []) =>
      members.map((member) => ({
        socketId: String(member.socketId ?? member.id),
        userId: member.userId != null ? String(member.userId) : null,
        username: member.username || "Anonymous",
      }));
    const normalizeChatMessages = (messages: any[] = []) =>
      messages.map((message) => ({
        id: String(message.id),
        socketId: String(message.socketId),
        userId: message.userId != null ? String(message.userId) : null,
        username: message.username || "Anonymous",
        text: message.text || "",
        createdAt: message.createdAt || new Date().toISOString(),
      }));

    async function inspectResolvedRoom() {
      const roomToInspect = resolvedRoomIdRef.current;
      if (
        !roomToInspect ||
        !usernameReadyRef.current ||
        !previewReadyRef.current ||
        isInCallRef.current
      ) {
        return;
      }

      if (channelId && !channelAccessReadyRef.current) {
        updateLobbyState({
          mode: "loading",
          title: "Checking huddle access",
          description: "Confirming whether this channel membership can join directly.",
          primaryLabel: "Checking...",
          primaryDisabled: true,
        });
        return;
      }

      updateLobbyState({
        mode: "loading",
        title: "Checking huddle status",
        description: "Looking for people already in this huddle and any pending join requests.",
        primaryLabel: "Checking...",
        primaryDisabled: true,
      });

      socket?.emit("huddle-room-preview", { roomId: roomToInspect }, (snapshot: any) => {
        const participants = normalizeMembers(snapshot?.participants);
        const pending = normalizeMembers(snapshot?.pending);
        if (snapshot?.adminUserId != null) {
          updateHuddleAdminUserId(snapshot.adminUserId);
        }
        if (snapshot?.adminUsername != null) {
          updateHuddleAdminUsername(snapshot.adminUsername);
        }
        setRoomParticipants(participants);
        setPendingAdmissions(pending);

        const canDirectJoin =
          canJoinWithoutAdmissionRef.current ||
          snapshot?.requesterIsChannelMember === true;
        const requestJoinDescription = channelId
          ? "You're not a member of this channel. The huddle admin needs to admit you."
          : "People are already inside this huddle. Send a request and someone in the call can admit you.";

        if (snapshot?.pendingRequest && !canDirectJoin) {
          updateLobbyState({
            mode: "waiting",
            title: "Waiting for admission",
            description: "Your request is already pending. The huddle admin needs to admit you.",
            primaryLabel: "Waiting for approval",
            primaryDisabled: true,
          });
          return;
        }

        if (!participants.length) {
          updateLobbyState({
            mode: "join_now",
            title: "Ready to join?",
            description: "Nobody is in this huddle yet. Joining now will start the call in this tab.",
            primaryLabel: "Join now",
          });
          return;
        }

        if (snapshot?.sameUserActive) {
          updateLobbyState({
            mode: "join_here_too",
            title: "Join here too?",
            description: "This account is already in the huddle from another tab or window. Joining here too will show both sessions in the call.",
            primaryLabel: "Join here too",
          });
          return;
        }

        if (canDirectJoin) {
          updateLobbyState({
            mode: "join_now",
            title: "Join huddle",
            description: "You're already a member of this channel, so you can join without approval.",
            primaryLabel: "Join now",
          });
          return;
        }

        updateLobbyState({
          mode: "ask_to_join",
          title: "Ask to join",
          description: requestJoinDescription,
          primaryLabel: "Ask to join",
        });
      });
    }

    inspectRoomRef.current = inspectResolvedRoom;
    primaryLobbyActionRef.current = async () => {
      const roomToJoin = resolvedRoomIdRef.current;
      if (!roomToJoin) {
        showToast("Still preparing the huddle room. Try again in a moment.", "warning");
        return;
      }

      if (lobbyModeRef.current === "join_now" || lobbyModeRef.current === "join_here_too") {
        joinRoom(roomToJoin, channelId ? `Channel ${channelId}` : `Room: ${roomToJoin}`);
        return;
      }

      if (lobbyModeRef.current === "ask_to_join" || lobbyModeRef.current === "denied") {
        if (canJoinWithoutAdmissionRef.current) {
          joinRoom(roomToJoin, channelId ? `Channel ${channelId}` : `Room: ${roomToJoin}`);
          return;
        }

        socket?.emit(
          "request-room-admission",
          { roomId: roomToJoin, username: currentUsernameRef.current || username },
          (response: any) => {
            if (response?.ok && response?.directJoin) {
              joinRoom(roomToJoin, channelId ? `Channel ${channelId}` : `Room: ${roomToJoin}`);
              return;
            }
            if (response?.ok) {
              updateLobbyState({
                mode: "waiting",
                title: "Waiting for admission",
                description: "The huddle admin needs to admit you before you can join.",
                primaryLabel: "Waiting for approval",
                primaryDisabled: true,
              });
              showToast("Join request sent", "info");
              return;
            }
            showToast(response?.error || "Could not send the join request.", "error");
          }
        );
      }
    };
    cancelAdmissionRequestRef.current = () => {
      const roomToJoin = resolvedRoomIdRef.current;
      if (!roomToJoin) return;
      socket?.emit("cancel-room-admission-request", { roomId: roomToJoin });
      updateLobbyState({
        mode: "ask_to_join",
        title: "Ready to ask to join",
        description: channelId
          ? "You're not a member of this channel. Ask the huddle admin to admit you."
          : "People are already inside this huddle. Ask to join and they can admit you.",
        primaryLabel: "Ask to join",
      });
      showToast("Join request cancelled", "info");
    };

    // ---------- DEVICE CHANGE MONITOR ----------
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", async () => {
        console.log("Device change detected!");
        if (isInCall) await checkAndUpdateDevices();
      });
    }

    // ---------- START PREVIEW ----------
    async function startPreview() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        preview.srcObject = localStream;
        hasCamera = true;
        hasMicrophone = true;
        updateDeviceButtons();
      } catch (err) {
        console.log("Failed to get video and audio, trying alternatives...");
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          preview.srcObject = localStream;
          hasCamera = true;
          hasMicrophone = false;
          updateDeviceButtons();
          showToast("Microphone not available, continuing with video only", "warning");
        } catch (videoErr) {
          console.log("No video available, trying audio only...");
          try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            const canvas = document.createElement("canvas");
            canvas.width = 640; canvas.height = 480;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#1f2937"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ffffff"; ctx.font = "bold 120px Arial";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText((username || "?")[0].toUpperCase(), canvas.width / 2, canvas.height / 2);
            const dummyStream = canvas.captureStream(1);
            const videoTrack = dummyStream.getVideoTracks()[0];
            localStream.addTrack(videoTrack);
            preview.srcObject = localStream;
            hasCamera = false; hasMicrophone = true;
            updateDeviceButtons();
            showToast("Camera not available, continuing with audio only", "warning");
          } catch (audioErr) {
            console.log("No audio/video available, creating dummy stream...");
            const canvas = document.createElement("canvas");
            canvas.width = 640; canvas.height = 480;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#1f2937"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ffffff"; ctx.font = "bold 120px Arial";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(username ? username[0].toUpperCase() : "?", canvas.width / 2, canvas.height / 2);
            localStream = canvas.captureStream(1);
            audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const dst = audioContext.createMediaStreamDestination();
            oscillator.connect(dst); oscillator.start();
            silentAudioTrack = dst.stream.getAudioTracks()[0];
            silentAudioTrack.enabled = false;
            localStream.addTrack(silentAudioTrack);
            preview.srcObject = localStream;
            hasCamera = false; hasMicrophone = false;
            updateDeviceButtons();
            showToast("No camera/microphone available. You can still share your screen!", "info");
          }
        }
      }
      previewReadyRef.current = true;
      await refreshDeviceList(false);
      updateDeviceButtons();
    }

    // ---------- DEVICE CHECK / AUTO UPGRADE ----------
    async function checkAndUpdateDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        const hasAudioInput = audioInputs.length > 0;
        const hasVideoInput = videoInputs.length > 0;

        if (!hasMicrophone && hasAudioInput) {
          console.log("🎤 New microphone detected. Attempting to acquire...");
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true },
            });
            const newAudioTrack = audioStream.getAudioTracks()[0];
            const oldAudioTrack = localStream?.getAudioTracks()[0];
            if (oldAudioTrack && localStream) {
              oldAudioTrack.stop();
              localStream.removeTrack(oldAudioTrack);
            }
            localStream?.addTrack(newAudioTrack);
            preview.srcObject = localStream;
            for (const [peerId, peerData] of Object.entries(peers)) {
              const { pc } = peerData as any;
              await waitForStableState(pc);
              const audioSender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === "audio");
              if (audioSender) {
                await audioSender.replaceTrack(newAudioTrack);
                console.log(`✅ Audio track replaced for peer: ${peerId}`);
              } else {
                pc.addTrack(newAudioTrack, localStream);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket?.emit("renegotiate", { to: peerId, offer });
              }
            }
            hasMicrophone = true;
            updateDeviceButtons();
            socket?.emit("peer-audio-updated", { roomId: currentRoom });
            showToast("🎤 Microphone connected and active!", "success");
            testAudioLevel(newAudioTrack);
          } catch (err) {
            console.error("❌ Failed to switch to new microphone:", err);
          }
        }

        if (!hasCamera && hasVideoInput) {
          console.log("📹 New camera detected. Attempting to acquire...");
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const newVideoTrack = videoStream.getVideoTracks()[0];
            if (!isScreenSharing) {
              const oldVideoTrack = localStream?.getVideoTracks()[0];
              if (oldVideoTrack && localStream) {
                oldVideoTrack.stop();
                localStream.removeTrack(oldVideoTrack);
              }
              localStream?.addTrack(newVideoTrack);
              originalVideoTrack = newVideoTrack;
              for (const [peerId, peerData] of Object.entries(peers)) {
                const { pc } = peerData as any;
                const videoSender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === "video");
                if (videoSender) {
                  await videoSender.replaceTrack(newVideoTrack);
                } else {
                  pc.addTrack(newVideoTrack, localStream);
                }
              }
              preview.srcObject = localStream;
            }
            hasCamera = true;
            updateDeviceButtons();
            showToast("📹 Camera connected!", "success");
          } catch (err) {
            console.error("❌ Failed to switch to new camera:", err);
          }
        }
      } catch (err) {
        console.error("❌ Error during device check:", err);
      }
    }

    function testAudioLevel(audioTrack: MediaStreamTrack) {
      const stream = new MediaStream([audioTrack]);
      const ac = new AudioContext();
      const analyser = ac.createAnalyser();
      const microphone = ac.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      let checkCount = 0;
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        if (average > 10) {
          console.log("✓ Microphone is working! Audio level:", average);
          ac.close();
        } else if (checkCount++ < 50) {
          requestAnimationFrame(checkAudio);
        } else {
          console.log("⚠ No audio detected from microphone.");
          ac.close();
        }
      };
      setTimeout(checkAudio, 1000);
    }

    function updateDeviceButtons() {
      const activeAudioTrack =
        localStream?.getAudioTracks().find((audioTrack) => audioTrack !== silentAudioTrack) || null;
      const activeVideoTrack =
        localStream?.getVideoTracks().find((videoTrack) => (videoTrack as any).label !== "canvas") || null;
      const micEnabled = !!(hasMicrophone && activeAudioTrack?.enabled);
      const camEnabled = !!(hasCamera && activeVideoTrack?.enabled);

      getMicButtons().forEach((button) => {
        updateControlButton(button, {
          available: hasMicrophone,
          enabled: micEnabled,
          iconMarkup: getMicIconMarkup(micEnabled),
        });
      });

      getCamButtons().forEach((button) => {
        updateControlButton(button, {
          available: hasCamera,
          enabled: camEnabled,
          iconMarkup: getCamIconMarkup(camEnabled),
        });
      });

      getMicDropdownButtons().forEach((button) => {
        button.disabled = !micSelects.length && !speakerSelects.length;
        button.classList.toggle("opacity-50", button.disabled);
        button.classList.toggle("cursor-not-allowed", button.disabled);
      });

      getCamDropdownButtons().forEach((button) => {
        button.disabled = !camSelects.length;
        button.classList.toggle("opacity-50", button.disabled);
        button.classList.toggle("cursor-not-allowed", button.disabled);
      });
    }

    function showToast(message: string, type = "info") {
      const toast = document.createElement("div");
      toast.className = `toast px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium ${
        type === "error" ? "bg-red-600" :
        type === "success" ? "bg-green-600" :
        type === "warning" ? "bg-yellow-600" :
        "bg-sidebar border border-white"
      }`;
      toast.textContent = message;
      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-12px)";
        toast.style.transition = "all 0.3s";
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    function getMicButtons() {
      return [
        document.getElementById("toggleMic") as HTMLButtonElement | null,
        document.getElementById("meetingToggleMic") as HTMLButtonElement | null,
      ].filter(Boolean) as HTMLButtonElement[];
    }

    function getCamButtons() {
      return [
        document.getElementById("toggleCam") as HTMLButtonElement | null,
        document.getElementById("meetingToggleCam") as HTMLButtonElement | null,
      ].filter(Boolean) as HTMLButtonElement[];
    }

    function getMicDropdownButtons() {
      return [
        document.getElementById("toggleMicDropdown") as HTMLButtonElement | null,
        document.getElementById("meetingToggleMicDropdown") as HTMLButtonElement | null,
      ].filter(Boolean) as HTMLButtonElement[];
    }

    function getCamDropdownButtons() {
      return [
        document.getElementById("toggleCamDropdown") as HTMLButtonElement | null,
        document.getElementById("meetingToggleCamDropdown") as HTMLButtonElement | null,
      ].filter(Boolean) as HTMLButtonElement[];
    }

    const iconMarkupCache = new Map<IconType, Map<string, string>>();

    function renderIconMarkup(Icon: IconType, className: string) {
      let cachedByClassName = iconMarkupCache.get(Icon);
      if (!cachedByClassName) {
        cachedByClassName = new Map<string, string>();
        iconMarkupCache.set(Icon, cachedByClassName);
      }

      const cachedMarkup = cachedByClassName.get(className);
      if (cachedMarkup) return cachedMarkup;

      const host = document.createElement("div");
      const root = createRoot(host);

      flushSync(() => {
        root.render(<Icon className={className} aria-hidden="true" focusable="false" />);
      });

      const markup = host.innerHTML;
      root.unmount();
      cachedByClassName.set(className, markup);
      return markup;
    }

    function getMicIconMarkup(enabled: boolean) {
      return renderIconMarkup(enabled ? BsMicFill : BsMicMuteFill, "w-5 h-5");
    }

    function getCamIconMarkup(enabled: boolean) {
      return renderIconMarkup(
        enabled ? BsCameraVideoFill : BsCameraVideoOffFill,
        "w-5 h-5"
      );
    }

    function updateControlButton(
      button: HTMLButtonElement,
      options: { available: boolean; enabled: boolean; iconMarkup: string }
    ) {
      const isMeetingButton = button.id.startsWith("meeting");
      button.classList.remove(
        "bg-transparent",
        "hover:bg-accent",
        "hover:bg-white/15",
        "bg-red-600",
        "hover:bg-red-700",
        "bg-yellow-600",
        "hover:bg-yellow-700",
        "device-warning"
      );

      if (!options.available) {
        button.classList.add("bg-yellow-600", "hover:bg-yellow-700", "device-warning");
      } else if (!options.enabled) {
        button.classList.add("bg-red-600", "hover:bg-red-700");
      } else if (isMeetingButton) {
        button.classList.add("bg-transparent", "hover:bg-accent");
      } else {
        button.classList.add("bg-transparent", "hover:bg-white/15");
      }

      button.innerHTML = options.iconMarkup;
      button.setAttribute("aria-pressed", String(options.enabled));
    }

    async function applyAudioOutputDevice(deviceId: string, silent = false) {
      currentSpeakerDeviceId = deviceId;
      const mediaElements = Array.from(document.querySelectorAll("#videos video")) as HTMLMediaElement[];
      const supportedElements = mediaElements.filter(
        (element) => typeof (element as HTMLMediaElement & { setSinkId?: (value: string) => Promise<void> }).setSinkId === "function"
      ) as (HTMLMediaElement & { setSinkId: (value: string) => Promise<void> })[];

      if (!deviceId) {
        speakerSelects.forEach((select) => {
          select.value = "";
        });
        return;
      }

      speakerSelects.forEach((select) => {
        if (Array.from(select.options).some((option) => option.value === deviceId)) {
          select.value = deviceId;
        }
      });

      if (!mediaElements.length) {
        return;
      }

      if (!supportedElements.length) {
        if (!silent) {
          showToast("Speaker output switching is not supported in this browser.", "warning");
        }
        return;
      }

      try {
        await Promise.all(
          supportedElements.map((element) => {
            if (element.muted) return Promise.resolve();
            return element.setSinkId(deviceId);
          })
        );
        if (!silent) {
          showToast("Speaker output updated.", "success");
        }
      } catch (err) {
        console.error("Failed to update audio output device:", err);
        if (!silent) {
          showToast("Could not switch the speaker output.", "error");
        }
      }
    }

    // ---------- CALL FLOW ----------
    function initiateCall(userId: string, targetUsername: string) {
      if (isInCall) { showToast("Please leave your current call first", "warning"); return; }
      const roomId = `room-${socket?.id}-${userId}`;
      socket?.emit("call-user", { to: userId, roomId, callerName: username });
      showToast(`Calling ${targetUsername}...`, "info");
    }

    const handleIncomingCall = ({ from, roomId, callerName: caller }: any) => {
      if (isInCall) { socket?.emit("call-rejected", { to: from, reason: "busy" }); return; }
      pendingCall = { from, roomId, callerName: caller };
      callerName.textContent = caller || "Unknown";
      callerInitial.textContent = caller ? caller[0].toUpperCase() : "?";
      incomingCallModal.classList.remove("hidden");
    };

    socket?.on("incoming-call", handleIncomingCall);

    document.getElementById("acceptCallBtn")!.onclick = () => {
      if (!pendingCall) return;
      incomingCallModal.classList.add("hidden");
      socket?.emit("call-accepted", { to: pendingCall.from, roomId: pendingCall.roomId });
      joinRoom(pendingCall.roomId, pendingCall.callerName);
      pendingCall = null;
    };

    document.getElementById("rejectCallBtn")!.onclick = () => {
      if (!pendingCall) return;
      socket?.emit("call-rejected", { to: pendingCall.from, reason: "declined" });
      incomingCallModal.classList.add("hidden");
      pendingCall = null;
    };

    const handleCallAccepted = ({ roomId }: any) => { joinRoom(roomId, "Call"); };
    socket?.on("call-accepted", handleCallAccepted);

    const handleCallRejected = ({ reason }: any) => {
      showToast(reason === "busy" ? "User is currently in another call" : "Call declined", "error");
    };
    socket?.on("call-rejected", handleCallRejected);

    function joinRoom(roomId: string, displayName = "Room") {
      socket?.emit("join-room", { roomId }, (response: any) => {
        if (!response?.ok) {
          if (response?.reason === "admission-required") {
            updateLobbyState({
              mode: "ask_to_join",
              title: "Ask to join",
              description: channelId
                ? "You're not a member of this channel. The huddle admin needs to admit you before you can enter."
                : "This huddle requires admission before you can enter.",
              primaryLabel: "Ask to join",
            });
            showToast(
              channelId
                ? "Ask the huddle admin to admit you before joining."
                : "Ask to join first so someone inside can admit you.",
              "warning"
            );
            return;
          }
          showToast(response?.error || "Could not join the huddle.", "error");
          return;
        }

        currentRoom = roomId;
        activeRoomRef.current = roomId;
        isInCall = true;
        isInCallRef.current = true;
        setIsMeetingActive(true);
        setOpenSidebarView(null);
        setUnreadChatCount(0);
        prejoin.classList.add("hidden");
        meeting.classList.remove("hidden");
        const adminUserId =
          response?.adminUserId != null
            ? updateHuddleAdminUserId(response.adminUserId)
            : huddleAdminUserIdRef.current;
        const adminUsername =
          response?.adminUsername != null
            ? updateHuddleAdminUsername(response.adminUsername)
            : huddleAdminUsernameRef.current;
        const resolvedDisplayName = resolveHuddleDisplayName(displayName, adminUsername);

        roomNameEls.forEach((element) => {
          element.textContent = resolvedDisplayName;
        });
        upsertStoredHuddleCall({
          roomId,
          channelId,
          title: resolvedDisplayName,
          startedByUserId: adminUserId,
          startedByUsername: adminUsername,
        });
        setRoomParticipants(normalizeMembers(response?.participants));
        setPendingAdmissions(normalizeMembers(response?.pending));
        setChatMessages(normalizeChatMessages(response?.chatHistory));

        if (localStream) addVideoStream("local", localStream, true, username);
        socket?.emit("update-call-status", true);

        if (deviceCheckInterval) clearInterval(deviceCheckInterval);
        deviceCheckInterval = setInterval(() => { checkAndUpdateDevices(); }, 3000);
        showToast("Joined the room. Monitoring for new devices...", "success");
      });
    }
    const handleRoomParticipantsUpdated = ({ roomId, participants }: any) => {
      setRoomParticipants(normalizeMembers(participants));
      if (!isInCallRef.current && roomId && resolvedRoomIdRef.current === roomId) {
        void inspectRoomRef.current?.();
      }
    };
    const handleRoomPendingUpdated = ({ roomId, pending }: any) => {
      setPendingAdmissions(normalizeMembers(pending));
      if (!isInCallRef.current && roomId && resolvedRoomIdRef.current === roomId) {
        void inspectRoomRef.current?.();
      }
    };
    const handleRoomAdmissionResult = ({ roomId, status }: any) => {
      if (status === "admitted") {
        showToast("You were admitted to the huddle.", "success");
        joinRoom(roomId, channelId ? `Channel ${channelId}` : `Room: ${roomId}`);
        return;
      }

      if (status === "denied") {
        updateLobbyState({
          mode: "denied",
          title: "Join request declined",
          description: "Your request was declined. You can try asking again.",
          primaryLabel: "Ask again",
        });
        showToast("Join request declined", "error");
      }
    };
    const handleRoomAdmissionRequired = () => {
      updateLobbyState({
        mode: "ask_to_join",
        title: "Ask to join",
        description: "This huddle already has participants inside. Send a request so they can admit you.",
        primaryLabel: "Ask to join",
      });
    };
    const handleHuddleChatMessage = (message: any) => {
      const [normalized] = normalizeChatMessages([message]);
      if (!normalized) return;
      setChatMessages((prev) => [...prev, normalized]);
      if (normalized.socketId !== socket?.id && openSidebarViewRef.current !== "messages") {
        setUnreadChatCount((prev) => prev + 1);
      }
    };
    const handleKickedFromRoom = ({ roomId, byUsername }: any) => {
      if (!currentRoom || currentRoom !== roomId) return;
      resetMeetingUi(
        byUsername ? `You were removed from the huddle by ${byUsername}.` : "You were removed from the huddle.",
        "error"
      );
    };
    socket?.on("room-participants-updated", handleRoomParticipantsUpdated);
    socket?.on("room-pending-updated", handleRoomPendingUpdated);
    socket?.on("room-admission-result", handleRoomAdmissionResult);
    socket?.on("room-admission-required", handleRoomAdmissionRequired);
    socket?.on("huddle-chat-message", handleHuddleChatMessage);
    socket?.on("kicked-from-room", handleKickedFromRoom);
    admitParticipantRef.current = (targetSocketId: string) => {
      const roomToJoin = activeRoomRef.current;
      if (!roomToJoin) return;
      if (!isHuddleAdminRef.current) {
        showToast("Only the huddle admin can admit people.", "warning");
        return;
      }
      socket?.emit(
        "respond-room-admission",
        {
          roomId: roomToJoin,
          targetSocketId,
          admit: true,
        },
        (response: any) => {
          if (response?.ok) return;
          showToast(response?.error || "Could not admit that person.", "error");
        }
      );
    };
    denyParticipantRef.current = (targetSocketId: string) => {
      const roomToJoin = activeRoomRef.current;
      if (!roomToJoin) return;
      if (!isHuddleAdminRef.current) {
        showToast("Only the huddle admin can deny join requests.", "warning");
        return;
      }
      socket?.emit(
        "respond-room-admission",
        {
          roomId: roomToJoin,
          targetSocketId,
          admit: false,
        },
        (response: any) => {
          if (response?.ok) return;
          showToast(response?.error || "Could not deny that request.", "error");
        }
      );
    };
    sendChatMessageRef.current = () => {
      const roomToJoin = activeRoomRef.current;
      const text = chatDraftRef.current.trim();
      if (!roomToJoin || !text) return;
      socket?.emit("huddle-chat-message", { roomId: roomToJoin, text }, (response: any) => {
        if (!response?.ok) {
          showToast(response?.error || "Could not send message.", "error");
          return;
        }
        setChatDraft("");
      });
    };
    kickParticipantRef.current = (targetSocketId: string) => {
      const roomToJoin = activeRoomRef.current;
      if (!roomToJoin || targetSocketId === socket?.id) return;
      if (!isHuddleAdminRef.current) {
        showToast("Only the huddle admin can remove participants.", "warning");
        return;
      }
      socket?.emit("kick-participant", { roomId: roomToJoin, targetSocketId }, (response: any) => {
        if (!response?.ok) {
          showToast(response?.error || "Could not remove that participant.", "error");
          return;
        }
        showToast("Participant removed from the huddle.", "success");
      });
    };

    // ---------- PREJOIN CONTROLS ----------
    document.getElementById("toggleMic")!.onclick = toggleMic;
    document.getElementById("toggleCam")!.onclick = toggleCam;
    document.getElementById("meetingToggleMic")!.onclick = toggleMic;
    document.getElementById("meetingToggleCam")!.onclick = toggleCam;
    document.getElementById("refreshDevicesBtn")!.onclick = () => {
      checkAndUpdateDevices();
      showToast("Checking for new devices...", "info");
    };

    function toggleMic() {
      const track = localStream?.getAudioTracks().find((audioTrack) => audioTrack !== silentAudioTrack);
      if (!hasMicrophone || !track) {
        showToast("No microphone available. Connect a microphone to enable audio.", "warning");
        return;
      }
      track.enabled = !track.enabled;
      updateDeviceButtons();
    }

    function toggleCam() {
      const track = localStream?.getVideoTracks().find((videoTrack) => (videoTrack as any).label !== "canvas");
      if (!hasCamera || !track) {
        showToast("No camera available. Connect a camera to enable video.", "warning");
        return;
      }
      track.enabled = !track.enabled;
      updateDeviceButtons();
    }

    // ---------- WEBRTC SIGNALING ----------
    const handleExistingUsers = (users: any[]) => {
      users.forEach((userData) => createPeer(userData.id, userData.username, true));
    };
    const handleUserJoined = (userData: any) => {
      createPeer(userData.id, userData.username, false);
      if (isScreenSharing && currentRoom) {
        socket?.emit("screen-share-status", { roomId: currentRoom, sharing: true });
      }
    };

    const handleOffer = async ({ from, offer, username: peerUsername }: any) => {
      const pc = createPeer(from, peerUsername, false);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit("answer", { to: from, answer });
    };

    // ─── FIX 4: Null guard ────────────────────────────────────────────────────
    const handleAnswer = async ({ from, answer }: any) => {
      if (!peers[from]?.pc) { console.warn(`Got answer from unknown peer ${from}, ignoring`); return; }
      await peers[from].pc.setRemoteDescription(answer);
      console.log(`✅ Set answer from peer ${from}`);
    };

    const handleRenegotiate = async ({ from, offer }: any) => {
      console.log(`🔄 Received renegotiation offer from peer ${from}`);
      const pc = peers[from]?.pc;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket?.emit("renegotiate-answer", { to: from, answer });
          console.log(`✅ Sent renegotiation answer to peer ${from}`);
        } catch (err) { console.error(`❌ Renegotiation failed with peer ${from}:`, err); }
      }
    };

    const handleRenegotiateAnswer = async ({ from, answer }: any) => {
      console.log(`🔄 Received renegotiation answer from peer ${from}`);
      const pc = peers[from]?.pc;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`✅ Renegotiation complete with peer ${from}`);
        } catch (err) { console.error(`❌ Failed to set renegotiation answer from peer ${from}:`, err); }
      }
    };

    const handleIceCandidate = ({ from, candidate }: any) => { peers[from]?.pc.addIceCandidate(candidate); };

    function registerScreenShareOwner(ownerId: string) {
      activeScreenShareOwners = activeScreenShareOwners.filter((id) => id !== ownerId);
      activeScreenShareOwners.push(ownerId);
      pinnedScreenShareUserId = activeScreenShareOwners[activeScreenShareOwners.length - 1] || null;
    }

    function unregisterScreenShareOwner(ownerId: string) {
      activeScreenShareOwners = activeScreenShareOwners.filter((id) => id !== ownerId);
      if (pinnedScreenShareUserId === ownerId) {
        pinnedScreenShareUserId = activeScreenShareOwners[activeScreenShareOwners.length - 1] || null;
      }
    }

    const handleUserLeft = (id: string) => {
      if (peers[id]) { peers[id].pc.close(); delete peers[id]; }
      document.getElementById(`video-${id}`)?.remove();
      document.getElementById(`video-screen-${id}`)?.remove();
      unregisterScreenShareOwner(id);
      reorganizeVideoLayout();
    };

    const handlePeerScreenShareStatus = ({ userId, sharing }: { userId: string; sharing: boolean }) => {
      if (sharing) {
        registerScreenShareOwner(userId);
        syncPeerScreenShareTile(userId, true);
      } else {
        unregisterScreenShareOwner(userId);
        syncPeerScreenShareTile(userId, false);
      }
      reorganizeVideoLayout();
    };

    const handlePeerAudioUpdated = ({ from }: any) => {
      console.log(`🔊 Peer ${from} swapped hardware. Refreshing audio playback...`);
      const container = document.getElementById(`video-${from}`);
      if (container) {
        const video = container.querySelector("video") as HTMLVideoElement;
        video.play().catch((err) => console.warn("Auto-nudge blocked. Waiting for user interaction.", err));
      }
    };

    socket?.on("existing-users", handleExistingUsers);
    socket?.on("user-joined", handleUserJoined);
    socket?.on("offer", handleOffer);
    socket?.on("answer", handleAnswer);
    socket?.on("renegotiate", handleRenegotiate);
    socket?.on("renegotiate-answer", handleRenegotiateAnswer);
    socket?.on("icecandidate", handleIceCandidate);
    socket?.on("user-left", handleUserLeft);
    socket?.on("peer-screen-share-status", handlePeerScreenShareStatus);
    socket?.on("peer-audio-updated", handlePeerAudioUpdated);

    // ---------- PEER CONNECTION ----------
    function createPeer(id: string, peerUsername: string, initiator: boolean) {
      if (peers[id]) return peers[id].pc;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peers[id] = { pc, username: peerUsername };

      if (localStream) {
        localStream.getAudioTracks().forEach((t) => {
          try { pc.addTrack(t, localStream!); } catch (err) { console.log("Error adding track:", err); }
        });

        const activeScreenTrack = screenStream?.getVideoTracks().find((track) => track.readyState !== "ended");
        const activeCameraTrack = localStream.getVideoTracks().find((track) => track.readyState !== "ended");
        const outgoingVideoTrack = isScreenSharing ? activeScreenTrack || activeCameraTrack : activeCameraTrack;
        const outgoingVideoStream = isScreenSharing && activeScreenTrack ? screenStream : localStream;

        if (outgoingVideoTrack && outgoingVideoStream) {
          try {
            pc.addTrack(outgoingVideoTrack, outgoingVideoStream);
          } catch (err) {
            console.log("Error adding video track:", err);
          }
        }
      }

      pc.ontrack = (e) => {
        const stream = e.streams[0];
        const isScreen = e.track.label.toLowerCase().includes("screen");
        addVideoStream(
          isScreen ? `screen-${id}` : id,
          stream,
          false,
          isScreen ? `${peerUsername} (Screen)` : peerUsername,
          isScreen
        );
      };

      pc.onconnectionstatechange = () => { console.log(`Peer ${id} connection state:`, pc.connectionState); };
      pc.oniceconnectionstatechange = () => { console.log(`Peer ${id} ICE connection state:`, pc.iceConnectionState); };
      pc.onicecandidate = (e) => {
        if (e.candidate) socket?.emit("icecandidate", { to: id, candidate: e.candidate });
      };

      // ─── FIX 2: Await setLocalDescription before emitting ────────────────────
      if (initiator) {
        pc.createOffer().then(async (offer) => {
          await pc.setLocalDescription(offer);
          socket?.emit("offer", { to: id, offer, username });
        });
      }

      return pc;
    }

    // ---------- VIDEO HANDLING ----------
    function createOverflowTile(hiddenCount: number) {
      const overflow = document.createElement("div");
      overflow.className = "video-overflow-card";
      overflow.innerHTML = `
        <span class="video-overflow-count">${hiddenCount} more users</span>
      `;
      return overflow;
    }

    function createScreenShareBadge() {
      const badge = document.createElement("div");
      badge.className = "screen-share-badge";
      badge.innerHTML = `
        ${renderIconMarkup(BsDisplay, "w-4 h-4")}
        <span>Screen Sharing</span>
      `;
      return badge;
    }

    function getVideoTile(ownerId: string, preferScreen = false) {
      const cameraTile = document.getElementById(`video-${ownerId}`) as HTMLDivElement | null;
      const screenTile = document.getElementById(`video-screen-${ownerId}`) as HTMLDivElement | null;
      const container = preferScreen ? screenTile || cameraTile : cameraTile || screenTile;
      const duplicate = container === screenTile ? cameraTile : screenTile;
      return { container, duplicate };
    }

    function updateVideoTileMode(
      container: HTMLDivElement,
      ownerId: string,
      displayName: string,
      isScreenShare: boolean
    ) {
      container.id = isScreenShare ? `video-screen-${ownerId}` : `video-${ownerId}`;
      container.dataset.ownerId = ownerId;
      container.dataset.displayName = displayName;
      container.dataset.streamType = isScreenShare ? "screen" : "camera";
      container.classList.toggle("screen-share", isScreenShare);

      const label = container.querySelector(".video-label") as HTMLDivElement | null;
      if (label) {
        label.textContent = ownerId === "local" ? `${displayName} (You)` : displayName;
      }

      const badge = container.querySelector(".screen-share-badge");
      if (isScreenShare) {
        if (!badge) {
          container.appendChild(createScreenShareBadge());
        }
      } else {
        badge?.remove();
      }
    }

    function syncPeerScreenShareTile(ownerId: string, sharing: boolean) {
      const { container, duplicate } = getVideoTile(ownerId, sharing);
      if (!container) return;

      duplicate?.remove();
      const displayName =
        container.dataset.displayName ||
        duplicate?.dataset.displayName ||
        peers[ownerId]?.username ||
        "User";

      updateVideoTileMode(container, ownerId, displayName, sharing);
    }

    function appendVisibleTiles(parent: HTMLElement, tiles: HTMLDivElement[], limit: number) {
      const visibleTiles = tiles.slice(0, limit);
      visibleTiles.forEach((tile) => parent.appendChild(tile));

      const hiddenCount = tiles.length - visibleTiles.length;
      if (hiddenCount > 0) {
        parent.appendChild(createOverflowTile(hiddenCount));
      }
    }

    function addVideoStream(id: string, stream: MediaStream, muted = false, displayName = "User", isScreenShare = false) {
      const ownerId = String(id).replace(/^screen-/, "");
      const shouldShowAsScreenShare = isScreenShare || activeScreenShareOwners.includes(ownerId);
      const { container: existingContainer, duplicate } = getVideoTile(ownerId, shouldShowAsScreenShare);
      let container = existingContainer;

      duplicate?.remove();

      if (!container) {
        container = document.createElement("div");
        container.className = "video-container";
        const video = document.createElement("video");
        video.autoplay = true;
        (video as any).playsInline = true;
        video.muted = muted;
        video.className = "w-full h-full";
        if (!muted) {
          video.volume = 1.0;
          video.setAttribute("playsinline", "true");
          video.setAttribute("webkit-playsinline", "true");
        }
        const label = document.createElement("div");
        label.className = "video-label";
        container.appendChild(video);
        container.appendChild(label);
        videos.appendChild(container);
      }
      updateVideoTileMode(container, ownerId, displayName, shouldShowAsScreenShare);
      const videoElement = container.querySelector("video") as HTMLVideoElement;
      videoElement.muted = muted;

      if (shouldShowAsScreenShare) {
        registerScreenShareOwner(ownerId);
      }
      videoElement.srcObject = stream;
      if (!muted && currentSpeakerDeviceId) {
        void applyAudioOutputDevice(currentSpeakerDeviceId, true);
      }
      if (!muted) {
        const audioTracks = stream.getAudioTracks();
        console.log(`Video ${id} has ${audioTracks.length} audio tracks`);
        audioTracks.forEach((track, index) => {
          console.log(`Audio track ${index}:`, track.label, "enabled:", track.enabled);
          track.enabled = true;
        });
        videoElement.play().catch((err) => {
          console.log(`Autoplay prevented for ${id}, will retry on interaction:`, err);
          const playOnClick = () => {
            videoElement.play()
              .then(() => { console.log(`Started playback for ${id} after user interaction`); document.removeEventListener("click", playOnClick); })
              .catch((e) => console.log(`Play failed for ${id}:`, e));
          };
          document.addEventListener("click", playOnClick, { once: true });
        });
      }
      reorganizeVideoLayout();
    }

    function reorganizeVideoLayout() {
      const containers = Array.from(videos.querySelectorAll(".video-container")) as HTMLDivElement[];
      containers.forEach((container) => container.classList.remove("screen-share-primary"));
      videos.innerHTML = "";
      videos.classList.remove("has-screen-share", "screen-share-layout", "grid-layout");

      const screenContainers = containers.filter((c) => c.dataset.streamType === "screen");
      const cameraContainers = containers.filter((c) => c.dataset.streamType !== "screen");

      if (screenContainers.length > 0) {
        const pinnedScreen =
          screenContainers.find((container) => container.dataset.ownerId === pinnedScreenShareUserId) ||
          screenContainers[screenContainers.length - 1];
        const railItems = [
          ...screenContainers.filter((container) => container !== pinnedScreen),
          ...cameraContainers,
        ];

        if (pinnedScreen) {
          pinnedScreen.classList.add("screen-share-primary");
        }

        if (railItems.length > 0) {
          videos.classList.add("has-screen-share", "screen-share-layout");
          if (pinnedScreen) {
            videos.appendChild(pinnedScreen);
          }

          const thumbs = document.createElement("div");
          thumbs.className = "thumbnails-container";
          appendVisibleTiles(thumbs, railItems, 9);
          videos.appendChild(thumbs);
          return;
        }

        videos.classList.add("grid-layout");
        if (pinnedScreen) {
          videos.appendChild(pinnedScreen);
        }
        return;
      }
      console.log(containers);
      videos.classList.add("grid-layout");
      appendVisibleTiles(videos, cameraContainers, 9);
    }

    // ---------- SCREEN SHARE ----------
    document.getElementById("shareScreenBtn")!.onclick = toggleScreenShare;

    async function toggleScreenShare() {
      if (!isScreenSharing) {
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          const screenTrack = screenStream.getVideoTracks()[0];
          const currentVideoTrack = localStream?.getVideoTracks()[0];
          if (currentVideoTrack && (currentVideoTrack as any).label !== "canvas") {
            originalVideoTrack = currentVideoTrack;
          }
          Object.values(peers).forEach(({ pc }: any) => {
            const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(screenTrack).catch((err: any) => { console.log("Error replacing track:", err); });
          });
          const oldLocal = document.getElementById("video-local");
          if (oldLocal) oldLocal.remove();
          addVideoStream("local", screenStream, true, username, true);
          registerScreenShareOwner("local");
          isScreenSharing = true;
          setIsScreenShareActive(true);
          showToast("Screen sharing started", "success");
          screenTrack.onended = stopScreenShare;
          socket?.emit("screen-share-status", { roomId: currentRoom, sharing: true });
        } catch (err) {
          console.log("Screen share error:", err);
          showToast("Failed to share screen or cancelled", "error");
        }
      } else {
        stopScreenShare();
      }
    }

    function stopScreenShare() {
      if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
      let trackToRestore = originalVideoTrack;
      if (!trackToRestore || trackToRestore.readyState === "ended") {
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#1f2937"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 120px Arial";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText((username || "?")[0].toUpperCase(), canvas.width / 2, canvas.height / 2);
        const dummyStream = canvas.captureStream(1);
        trackToRestore = dummyStream.getVideoTracks()[0];
      }
      Object.values(peers).forEach(({ pc }: any) => {
        const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === "video");
        if (sender && trackToRestore) sender.replaceTrack(trackToRestore).catch((err: any) => { console.log("Error restoring track:", err); });
      });
      const oldLocal = document.getElementById("video-local");
      if (oldLocal) oldLocal.remove();
      unregisterScreenShareOwner("local");
      isScreenSharing = false;
      setIsScreenShareActive(false);
      if (localStream) addVideoStream("local", localStream, true, username);
      showToast("Screen sharing stopped", "info");
      socket?.emit("screen-share-status", { roomId: currentRoom, sharing: false });
    }

    // ---------- LEAVE MEETING ----------
    document.getElementById("leaveBtn")!.onclick = leaveMeeting;

    function resetMeetingUi(message: string, type = "info") {
      if (currentRoom) {
        markStoredHuddleCallLeft(currentRoom);
      }
      if (deviceCheckInterval) { clearInterval(deviceCheckInterval); deviceCheckInterval = null; }
      Object.values(peers).forEach(({ pc }: any) => pc.close());
      Object.keys(peers).forEach((id) => delete peers[id]);
      videos.innerHTML = "";
      if (screenStream) { screenStream.getTracks().forEach((t) => t.stop()); isScreenSharing = false; }
      setIsScreenShareActive(false);
      if (audioContext) { audioContext.close(); audioContext = null; }
      currentRoom = null;
      activeRoomRef.current = null;
      isInCall = false;
      isInCallRef.current = false;
      pinnedScreenShareUserId = null;
      activeScreenShareOwners = [];
      setIsMeetingActive(false);
      setRoomParticipants([]);
      setPendingAdmissions([]);
      setChatMessages([]);
      setChatDraft("");
      setOpenSidebarView(null);
      setUnreadChatCount(0);
      prejoin.classList.remove("hidden");
      meeting.classList.add("hidden");
      showToast(message, type);
      void inspectResolvedRoom();
    }

    function leaveMeeting() {
      setOpenSidebarView(null);
      socket?.emit("leave-room", currentRoom);
      socket?.emit("update-call-status", false);
      resetMeetingUi("You left the call", "info");
    }

    // ---------- DEVICE LIST & SWITCHING ----------
    async function refreshDeviceList(autoSwitch = false) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const currentAudioInputs = devices.filter((d) => d.kind === "audioinput");
        const currentAudioOutputs = devices.filter((d) => d.kind === "audiooutput");
        const currentVideoInputs = devices.filter((d) => d.kind === "videoinput");
        const currentMicDeviceId =
          localStream?.getAudioTracks().find((audioTrack) => audioTrack !== silentAudioTrack)?.getSettings?.().deviceId || "";
        const currentCamDeviceId =
          localStream?.getVideoTracks().find((videoTrack) => (videoTrack as any).label !== "canvas")?.getSettings?.().deviceId || "";
        let newlyDetectedMicId: string | null = null;
        if (autoSwitch) {
          newlyDetectedMicId = currentAudioInputs.find(
            (d) => d.deviceId !== "" && !knownDevices.audio.includes(d.deviceId)
          )?.deviceId || null;
        }
        knownDevices.audio = currentAudioInputs.map((d) => d.deviceId);
        knownDevices.video = currentVideoInputs.map((d) => d.deviceId);
        populateSelectGroup(micSelects, currentAudioInputs, "No microphone found");
        populateSelectGroup(speakerSelects, currentAudioOutputs, "No speaker output found");
        populateSelectGroup(camSelects, currentVideoInputs, "No camera found");
        if (currentMicDeviceId) setSelectGroupValue(micSelects, currentMicDeviceId);
        if (currentCamDeviceId) setSelectGroupValue(camSelects, currentCamDeviceId);
        if (currentSpeakerDeviceId) setSelectGroupValue(speakerSelects, currentSpeakerDeviceId);
        if (newlyDetectedMicId && isInCall) {
          console.log("🆕 New Mic Detected:", newlyDetectedMicId);
          setSelectGroupValue(micSelects, newlyDetectedMicId);
          await switchDevice("audio", newlyDetectedMicId);
          showToast("Switched to new audio hardware automatically", "success");
        }
        updateDeviceButtons();
      } catch (err) {
        console.error("Error updating device list:", err);
      }
    }

    function populateSelect(
      selectElement: HTMLSelectElement,
      devices: MediaDeviceInfo[],
      emptyLabel: string
    ) {
      const currentValue = selectElement.value;
      selectElement.innerHTML = "";
      if (!devices.length) {
        const option = document.createElement("option");
        option.value = "";
        option.text = emptyLabel;
        selectElement.appendChild(option);
        selectElement.disabled = true;
        return;
      }
      selectElement.disabled = false;
      devices.forEach((device) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.text = device.label || `Device ${device.deviceId.slice(0, 5)}`;
        selectElement.appendChild(option);
      });
      if (Array.from(selectElement.options).some((opt) => opt.value === currentValue)) {
        selectElement.value = currentValue;
      } else {
        selectElement.selectedIndex = 0;
      }
    }

    function populateSelectGroup(
      selectElements: HTMLSelectElement[],
      devices: MediaDeviceInfo[],
      emptyLabel: string
    ) {
      selectElements.forEach((selectElement) => {
        populateSelect(selectElement, devices, emptyLabel);
      });
    }

    function setSelectGroupValue(selectElements: HTMLSelectElement[], value: string) {
      selectElements.forEach((selectElement) => {
        if (Array.from(selectElement.options).some((opt) => opt.value === value)) {
          selectElement.value = value;
        }
      });
    }

    async function switchDevice(type: "audio" | "video", deviceId: string) {
      try {
        if (!deviceId) return;
        console.log(`Attempting to switch ${type} to: ${deviceId}`);
        const constraints: MediaStreamConstraints = {
          audio: type === "audio" ? { deviceId: { exact: deviceId } } : false,
          video: type === "video" ? { deviceId: { exact: deviceId } } : false,
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        const newTrack = newStream.getTracks()[0];
        if (!newTrack || !localStream) throw new Error("No track");
        const oldTracks = type === "audio" ? localStream.getAudioTracks() : localStream.getVideoTracks();
        if (type === "audio" && silentAudioTrack && oldTracks.includes(silentAudioTrack)) {
          silentAudioTrack = null;
        }
        oldTracks.forEach((track) => { track.stop(); localStream!.removeTrack(track); });
        localStream.addTrack(newTrack);
        preview.srcObject = localStream;
        if (type === "video") originalVideoTrack = newTrack;
        if (type === "audio") {
          hasMicrophone = true;
          setSelectGroupValue(micSelects, deviceId);
        } else {
          hasCamera = true;
          setSelectGroupValue(camSelects, deviceId);
        }
        for (const [peerId, peerData] of Object.entries(peers)) {
          const senders = (peerData as any).pc.getSenders();
          const sender = senders.find((s: RTCRtpSender) => s.track?.kind === type);
          if (sender) {
            await sender.replaceTrack(newTrack);
            console.log(`✅ Seamlessly swapped ${type} for peer: ${peerId}`);
          }
        }
        if (type === "audio") socket?.emit("peer-audio-updated", { roomId: currentRoom });
        updateDeviceButtons();
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} updated!`, "success");
      } catch (err: any) {
        console.error("Switch Device Error Detail:", err);
        if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          showToast("Device is busy. Please close other apps using the mic/camera.", "error");
        } else {
          showToast("Could not switch to the selected device.", "error");
        }
      }
    }

    micSelects.forEach((select) => {
      select.onchange = () => {
        setSelectGroupValue(micSelects, select.value);
        void switchDevice("audio", select.value);
      };
    });
    camSelects.forEach((select) => {
      select.onchange = () => {
        setSelectGroupValue(camSelects, select.value);
        void switchDevice("video", select.value);
      };
    });
    speakerSelects.forEach((select) => {
      select.onchange = () => {
        setSelectGroupValue(speakerSelects, select.value);
        void applyAudioOutputDevice(select.value);
      };
    });

    navigator.mediaDevices.ondevicechange = () => {
      console.log("🔌 Hardware change detected... waiting for drivers to settle.");
      setTimeout(async () => { await refreshDeviceList(true); }, 1000);
    };

    refreshDeviceList(false);

    // ---------- CLEANUP ----------
    return () => {
      socket?.off("incoming-call", handleIncomingCall);
      socket?.off("call-accepted", handleCallAccepted);
      socket?.off("call-rejected", handleCallRejected);
      socket?.off("room-participants-updated", handleRoomParticipantsUpdated);
      socket?.off("room-pending-updated", handleRoomPendingUpdated);
      socket?.off("room-admission-result", handleRoomAdmissionResult);
      socket?.off("room-admission-required", handleRoomAdmissionRequired);
      socket?.off("huddle-chat-message", handleHuddleChatMessage);
      socket?.off("kicked-from-room", handleKickedFromRoom);
      socket?.off("existing-users", handleExistingUsers);
      socket?.off("user-joined", handleUserJoined);
      socket?.off("offer", handleOffer);
      socket?.off("answer", handleAnswer);
      socket?.off("renegotiate", handleRenegotiate);
      socket?.off("renegotiate-answer", handleRenegotiateAnswer);
      socket?.off("icecandidate", handleIceCandidate);
      socket?.off("user-left", handleUserLeft);
      socket?.off("peer-screen-share-status", handlePeerScreenShareStatus);
      socket?.off("peer-audio-updated", handlePeerAudioUpdated);
      primaryLobbyActionRef.current = null;
      cancelAdmissionRequestRef.current = null;
      inspectRoomRef.current = null;
      applyUsernameAndStartRef.current = null;
      sendChatMessageRef.current = null;
      kickParticipantRef.current = () => {};
      // Do NOT disconnect socket; provider owns its lifecycle
    };
  // ─── FIX 5: Removed `user` from deps — DOM listeners no longer multiply ───
  }, [socket]);

  useEffect(() => {
    const preferredName = user?.name || user?.username;
    if (!preferredName || usernameReadyRef.current) return;
    void applyUsernameAndStartRef.current?.(preferredName);
  }, [user?.name, user?.username]);

  // ─── Toggle device panel helpers (React-level, no JS conflict) ───────────
  const togglePanel = (panelClass: string, otherClass: string) => {
    const panel = document.querySelector(`.${panelClass}`) as HTMLElement | null;
    const other = document.querySelector(`.${otherClass}`) as HTMLElement | null;
    if (!panel) return;
    other?.classList.add("hidden");
    panel.classList.toggle("hidden");
  };

  const getParticipantStatus = (member: RoomMember) => {
    const memberIsAdmin =
      huddleAdminUserId != null && member.userId === huddleAdminUserId;
    if (member.socketId === socket?.id) {
      return memberIsAdmin ? "Huddle admin (this tab)" : "This tab";
    }
    if (currentUserId && member.userId === currentUserId) {
      return memberIsAdmin ? "Huddle admin (your other tab)" : "Your other tab";
    }
    if (memberIsAdmin) return "Huddle admin";
    return "In huddle";
  };

  return (
    <>
      <div className="bg-sidebar text-sidebar-foreground fixed inset-0 z-[999] overflow-hidden">
        {/* ── Toasts ─────────────────────────────────────────────────────── */}
        <div
          id="toastContainer"
          className="fixed top-3 left-3 right-3 sm:top-4 sm:left-auto sm:right-4 z-[60] space-y-2 pointer-events-none"
        />

        {/* ── Username Screen ─────────────────────────────────────────────── */}
        <div id="usernameScreen" className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 gap-5">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <BsCameraVideoFill className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Softechat Huddle</span>
          </div>

          <div className="bg-sidebar border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm">
            {shouldShowAuthLoader ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10">
                  <span className="h-5 w-5 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
                </div>
                <h1 className="text-xl font-semibold mb-1.5">Preparing your huddle</h1>
                <p className="text-muted-foreground text-sm leading-snug">
                  Checking your account and opening the lobby.
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold mb-1.5 text-center">What's your name?</h1>
                <p className="text-muted-foreground text-sm mb-6 text-center leading-snug">You'll join the huddle right after</p>
                <div className="space-y-3">
                  <input
                    id="usernameInput"
                    type="text"
                    placeholder="Your name"
                    className="w-full px-4 py-3 bg-transparent border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sidebar-foreground placeholder:text-muted-foreground text-sm transition"
                    maxLength={20}
                  />
                  <button
                    id="continueBtn"
                    disabled
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-900/30"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Main App ─────────────────────────────────────────────────────── */}
        <div id="mainApp" className="hidden h-screen relative overflow-hidden">

          {/* ── People Sidebar (slides from RIGHT) ───────────────────────── */}
          <div
            data-huddle-sidebar-drawer="people"
            className={`huddle-sidebar-drawer fixed top-0 right-0 h-full w-full max-w-[22rem] sm:max-w-none sm:w-72 bg-sidebar border-l border-[var(--border-color)] flex flex-col z-50 shadow-2xl ${
              isPeopleSidebarOpen ? "open" : ""
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-color)]">
              <div>
                <h3 className="font-semibold text-sm tracking-tight">People</h3>
                <p className="text-[11px] text-muted-foreground">Who is in this huddle</p>
              </div>
              <button
                type="button"
                aria-label="Close people sidebar"
                onClick={() => setOpenSidebarView(null)}
                className="w-7 h-7 rounded-lg hover:bg-accent text-muted-foreground hover:text-sidebar-foreground transition-colors flex items-center justify-center"
              >
                <BsXLg className="w-4 h-4" />
              </button>
            </div>

            {/* User profile */}
            <div className="px-4 py-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold flex items-center justify-center shrink-0">
                  <span id="userInitial" />
                </span>
                <div className="min-w-0 flex-1">
                  <p id="displayUsername" className="text-sm font-medium truncate" />
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Online
                  </p>
                </div>
              </div>
            </div>
            <>
                <div className="px-4 py-3 border-b border-[var(--border-color)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Waiting to Join
                  </p>
                  {!isHuddleAdmin && pendingAdmissions.length > 0 && (
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Only the huddle admin can admit or deny these requests.
                    </p>
                  )}
                  {pendingAdmissions.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {pendingAdmissions.map((member) => (
                        <div
                          key={member.socketId}
                          className="rounded-xl border border-[var(--border-color)] bg-black/10 p-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="h-8 w-8 rounded-full bg-amber-500/15 text-amber-300 text-sm font-bold flex items-center justify-center shrink-0">
                              {member.username[0]?.toUpperCase() || "?"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {member.username}
                                {currentUserId && member.userId === currentUserId ? " (You)" : ""}
                              </p>
                              <p className="text-[11px] text-muted-foreground">Waiting for admission</p>
                            </div>
                          </div>
                          {isHuddleAdmin && (
                            <div className="mt-2 flex gap-2">
                              <button
                                className="flex-1 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium py-2 transition"
                                onClick={() => admitParticipantRef.current(member.socketId)}
                              >
                                Admit
                              </button>
                              <button
                                className="flex-1 rounded-lg border border-[var(--border-color)] hover:bg-accent text-xs font-medium py-2 transition"
                                onClick={() => denyParticipantRef.current(member.socketId)}
                              >
                                Deny
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-3">
                      No pending requests
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-b border-[var(--border-color)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Add People
                  </p>
                  <button
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition"
                    onClick={() => {
                      const inviteUrl = new URL(window.location.href);
                      if (resolvedRoomId) {
                        inviteUrl.searchParams.set("meeting_id", resolvedRoomId);
                      }
                      navigator.clipboard.writeText(inviteUrl.toString());
                      const toast = document.createElement("div");
                      toast.className = "toast px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium bg-green-600";
                      toast.textContent = "Invite link copied!";
                      document.getElementById("toastContainer")?.appendChild(toast);
                      setTimeout(() => toast.remove(), 2500);
                    }}
                  >
                    Copy Invite Link
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Participants
                  </p>
                  {roomParticipants.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {roomParticipants.map((member) => (
                        <div
                          key={member.socketId}
                          className="huddle-user-card border border-transparent hover:border-[var(--border-color)]"
                        >
                          <span className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold flex items-center justify-center shrink-0 select-none">
                            {member.username[0]?.toUpperCase() || "?"}
                          </span>
                          <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                            <span className="truncate font-semibold">
                              {member.username}
                              {currentUserId && member.userId === currentUserId ? " (You)" : ""}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {getParticipantStatus(member)}
                            </span>
                          </div>
                          {isMeetingActive && isHuddleAdmin && member.socketId !== socket?.id && (
                            <button
                              className="rounded-lg border border-red-500/30 px-2.5 py-1 text-[11px] font-medium text-red-300 hover:bg-red-500/10 transition"
                              onClick={() => kickParticipantRef.current(member.socketId)}
                            >
                              Kick
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs text-center py-8">
                      Nobody has joined the huddle yet
                    </div>
                  )}
                </div>
            </>
          </div>

          {/* ── People Toggle (always in DOM, floats top-right) ──────────── */}

          {/* ── Content Area ─────────────────────────────────────────────── */}
          <div
            data-huddle-sidebar-drawer="messages"
            className={`huddle-sidebar-drawer fixed top-0 right-0 h-full w-full max-w-[24rem] sm:max-w-none sm:w-80 bg-sidebar border-l border-[var(--border-color)] flex flex-col z-50 shadow-2xl ${
              isMessagesSidebarOpen ? "open" : ""
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-color)]">
              <div>
                <h3 className="font-semibold text-sm tracking-tight">Huddle Messages</h3>
                <p className="text-[11px] text-muted-foreground">Only in-call messages live here</p>
              </div>
              <button
                type="button"
                aria-label="Close message sidebar"
                onClick={() => setOpenSidebarView(null)}
                className="w-7 h-7 rounded-lg hover:bg-accent text-muted-foreground hover:text-sidebar-foreground transition-colors flex items-center justify-center"
              >
                <BsXLg className="w-4 h-4" />
              </button>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {chatMessages.length > 0 ? (
                chatMessages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-[var(--border-color)] bg-black/10 p-3">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-sm font-medium">
                        {message.username}
                        {message.socketId === socket?.id ? " (You)" : ""}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-sidebar-foreground whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-xs text-center py-8">
                  {isMeetingActive ? "No chat messages yet" : "Join the huddle to use in-call chat"}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border-color)] p-4 space-y-2">
              <textarea
                rows={3}
                value={chatDraft}
                disabled={!isMeetingActive}
                onChange={(event) => setChatDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendChatMessageRef.current?.();
                  }
                }}
                placeholder={isMeetingActive ? "Send a message to everyone in this huddle" : "Join the huddle to chat"}
                className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-transparent px-3 py-2 text-sm text-sidebar-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
              />
              <button
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 transition"
                disabled={!isMeetingActive || !chatDraft.trim()}
                onClick={() => sendChatMessageRef.current?.()}
              >
                Send
              </button>
            </div>
          </div>

          <div className="fixed top-3 right-3 z-40 flex items-center gap-2 sm:hidden">
            <button
              type="button"
              data-huddle-sidebar-trigger="messages"
              aria-label="Open huddle messages"
              aria-pressed={isMessagesSidebarOpen}
              title="Huddle messages"
              onClick={() => toggleSidebarView("messages")}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border text-sidebar-foreground shadow-md transition-all ${
                isMessagesSidebarOpen
                  ? "bg-accent border-[var(--border-color)]"
                  : "bg-sidebar/95 backdrop-blur-md border-[var(--border-color)]"
              }`}
            >
              <BsChatDotsFill className="w-4 h-4" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white flex items-center justify-center">
                  {unreadChatBadgeLabel}
                </span>
              )}
            </button>
            <button
              type="button"
              data-huddle-sidebar-trigger="people"
              aria-label="Open people sidebar"
              aria-pressed={isPeopleSidebarOpen}
              title="People"
              onClick={() => toggleSidebarView("people")}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sidebar-foreground shadow-md transition-all ${
                isPeopleSidebarOpen
                  ? "bg-accent border-[var(--border-color)]"
                  : "bg-sidebar/95 backdrop-blur-md border-[var(--border-color)]"
              }`}
            >
              <BsPeopleFill className="w-4 h-4" />
            </button>
          </div>

          <div className="h-screen flex flex-col">

            {/* ── Pre-join Screen (Google Meet style) ──────────────────── */}
            <div id="prejoin" className="flex-1 flex flex-col overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border-color)]/40 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <BsCameraVideoFill className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold tracking-tight">Softechat Huddle</span>
                </div>
              </div>

              {/* Two-panel layout */}
              <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 gap-6 md:gap-10 flex-col md:flex-row overflow-auto">

                {/* LEFT: Camera preview */}
                <div className="w-full max-w-lg shrink-0">
                  {/* Preview card */}
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-[var(--border-color)]/20">
                    <video id="preview" autoPlay muted playsInline className="w-full h-full object-cover" />

                    {/* Bottom gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                    {/* Prejoin mic/cam controls */}
                    <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 sm:gap-3">
                      {/* Mic button + device dropdown */}
                      <div className="relative">
                        <button
                          id="toggleMic"
                          className="w-12 h-12 rounded-full bg-transparent hover:bg-white/15 border border-white/25 text-white transition-all duration-150 flex items-center justify-center backdrop-blur-sm"
                          title="Toggle Microphone"
                        >
                          <BsMicFill className="w-5 h-5" />
                        </button>
                        {/* Arrow to open device picker */}
                        <button
                          id="toggleMicDropdown"
                          onClick={() => togglePanel("mic-prejoin-panel", "cam-prejoin-panel")}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sidebar border border-[var(--border-color)] text-muted-foreground flex items-center justify-center hover:bg-accent transition-colors"
                        >
                          <BsChevronUp className="w-2.5 h-2.5" />
                        </button>
                        {/* Mic device panel */}
                        <div className="mic-prejoin-panel device-dropdown device-panel-popover hidden">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Microphone</p>
                          <select id="prejoinMicSelect" className="text-sm">
                            <option value="">Select Microphone</option>
                          </select>
                          <p className="mt-3 text-xs font-medium text-muted-foreground mb-1.5">Speaker</p>
                          <select id="prejoinSpeakerSelect" className="text-sm">
                            <option value="">Select Speaker</option>
                          </select>
                        </div>
                      </div>

                      {/* Camera button + device dropdown */}
                      <div className="relative">
                        <button
                          id="toggleCam"
                          className="w-12 h-12 rounded-full bg-transparent hover:bg-white/15 border border-white/25 text-white transition-all duration-150 flex items-center justify-center backdrop-blur-sm"
                          title="Toggle Camera"
                        >
                          <BsCameraVideoFill className="w-5 h-5" />
                        </button>
                        <button
                          id="toggleCamDropdown"
                          onClick={() => togglePanel("cam-prejoin-panel", "mic-prejoin-panel")}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sidebar border border-[var(--border-color)] text-muted-foreground flex items-center justify-center hover:bg-accent transition-colors"
                        >
                          <BsChevronUp className="w-2.5 h-2.5" />
                        </button>
                        {/* Cam device panel */}
                        <div className="cam-prejoin-panel device-dropdown device-panel-popover hidden">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Camera</p>
                          <select id="prejoinCamSelect" className="text-sm">
                            <option value="">Select Camera</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Ready to join panel */}
                <div className="w-full max-w-lg md:w-80 flex flex-col gap-5">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold mb-1.5 leading-tight">{lobbyState.title}</h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">{lobbyState.description}</p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-color)] bg-black/10 p-4 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Room Status
                        </p>
                        <p className="text-sm text-sidebar-foreground mt-1">
                          {roomParticipants.length > 0
                            ? `${roomParticipants.length} participant${roomParticipants.length === 1 ? "" : "s"} already inside`
                            : "No participants in the room yet"}
                        </p>
                      </div>
                      {resolvedRoomId && (
                        <span className="text-[11px] text-muted-foreground rounded-full border border-[var(--border-color)] px-2 py-1 max-w-[120px] truncate">
                          {resolvedRoomId}
                        </span>
                      )}
                    </div>

                    {roomParticipants.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {roomParticipants.slice(0, 4).map((member) => (
                          <div
                            key={member.socketId}
                            className="flex items-center gap-2.5 rounded-xl border border-[var(--border-color)] bg-sidebar/60 px-3 py-2"
                          >
                            <span className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold flex items-center justify-center shrink-0">
                              {member.username[0]?.toUpperCase() || "?"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {member.username}
                                {currentUserId && member.userId === currentUserId ? " (You)" : ""}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {getParticipantStatus(member)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition text-sm"
                      disabled={!!lobbyState.primaryDisabled}
                      onClick={() => primaryLobbyActionRef.current?.()}
                    >
                      {lobbyState.primaryLabel}
                    </button>

                    {lobbyState.mode === "waiting" && (
                      <button
                        className="w-full border border-[var(--border-color)] hover:bg-accent text-sidebar-foreground font-medium py-3 rounded-xl transition text-sm"
                        onClick={() => cancelAdmissionRequestRef.current?.()}
                      >
                        Cancel request
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                        <BsMicFill className="w-4 h-4 text-green-400" />
                      </div>
                      <span>Microphone and camera preview are ready above</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <BsPeopleFill className="w-4 h-4 text-blue-400" />
                      </div>
                      <span>Open <strong className="text-sidebar-foreground">People</strong> to watch admissions and participants</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <BsLink45Deg className="w-4 h-4 text-amber-300" />
                      </div>
                      <span>Use the invite link to let others knock before joining</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Meeting Screen ────────────────────────────────────────── */}
            <div id="meeting" className="hidden flex-1 flex flex-col h-screen min-h-0">

              {/* Video grid */}
              <div className="flex-1 min-h-0 relative overflow-hidden bg-[#111]">
                <div
                  id="videos"
                  className="grid gap-2 md:gap-3 p-2 md:p-3 h-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                />
              </div>

              {/* ── Google Meet–style bottom control bar ────────────────── */}
              <div className="bg-sidebar border-t border-[var(--border-color)] px-3 sm:px-4 md:px-6 py-3 flex flex-col sm:flex-row items-center justify-between min-h-[76px] gap-3 shrink-0">

                {/* Mobile: time + room name */}
                <div className="flex sm:hidden items-center gap-2 text-[11px] text-muted-foreground w-full justify-center">
                  <span className="font-medium text-sidebar-foreground tabular-nums">{meetingTime}</span>
                  <span className="text-[var(--border-color)]">|</span>
                  <span id="roomNameMobile" className="truncate max-w-[140px]" />
                </div>

                {/* Left: time + room name */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground min-w-[120px]">
                  <span className="font-medium text-sidebar-foreground tabular-nums">{meetingTime}</span>
                  <span className="text-[var(--border-color)]">|</span>
                  <span id="roomName" className="truncate max-w-[100px]" />
                </div>

                {/* Center: control buttons */}
                <div className="flex items-center justify-center flex-wrap sm:flex-nowrap gap-2 md:gap-3 mx-0 sm:mx-auto w-full sm:w-auto">

                  {/* Hidden utility: refresh devices */}
                  <button id="refreshDevicesBtn" className="hidden" title="Refresh Devices">refresh</button>

                  {/* Mic toggle + device arrow */}
                  <div className="relative flex flex-col items-center">
                    <button
                      id="meetingToggleMic"
                      title="Mute / Unmute"
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-transparent hover:bg-accent border border-[var(--border-color)] text-sidebar-foreground transition-all duration-150 flex items-center justify-center"
                    >
                      <BsMicFill className="w-5 h-5" />
                    </button>
                    <button
                      id="meetingToggleMicDropdown"
                      onClick={() => togglePanel("mic-meeting-panel", "cam-meeting-panel")}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sidebar border border-[var(--border-color)] text-muted-foreground flex items-center justify-center hover:bg-accent transition-colors z-10"
                      title="Select Microphone"
                    >
                      <BsChevronUp className="w-2.5 h-2.5" />
                    </button>
                    {/* Mic device select popover */}
                    <div className="mic-meeting-panel device-panel-popover hidden absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-sidebar border border-[var(--border-color)] rounded-xl p-3 min-w-[220px] shadow-2xl z-50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Microphone</p>
                      <select id="meetingMicSelect" className="w-full bg-transparent border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sidebar-foreground text-xs focus:outline-none" />
                      <p className="mt-3 text-xs font-medium text-muted-foreground mb-2">Speaker</p>
                      <select id="meetingSpeakerSelect" className="w-full bg-transparent border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sidebar-foreground text-xs focus:outline-none" />
                    </div>
                  </div>

                  {/* Camera toggle + device arrow */}
                  <div className="relative flex flex-col items-center">
                    <button
                      id="meetingToggleCam"
                      title="Turn Camera On / Off"
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-transparent hover:bg-accent border border-[var(--border-color)] text-sidebar-foreground transition-all duration-150 flex items-center justify-center"
                    >
                      <BsCameraVideoFill className="w-5 h-5" />
                    </button>
                    <button
                      id="meetingToggleCamDropdown"
                      onClick={() => togglePanel("cam-meeting-panel", "mic-meeting-panel")}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sidebar border border-[var(--border-color)] text-muted-foreground flex items-center justify-center hover:bg-accent transition-colors z-10"
                      title="Select Camera"
                    >
                      <BsChevronUp className="w-2.5 h-2.5" />
                    </button>
                    {/* Camera device select popover */}
                    <div className="cam-meeting-panel device-panel-popover hidden absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-sidebar border border-[var(--border-color)] rounded-xl p-3 min-w-[220px] shadow-2xl z-50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Camera</p>
                      <select id="meetingCamSelect" className="w-full bg-transparent border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sidebar-foreground text-xs focus:outline-none" />
                    </div>
                  </div>

                  {/* Screen share */}
                  <button
                    id="shareScreenBtn"
                    title="Share Screen"
                    className={`flex w-12 h-12 md:w-14 md:h-14 rounded-full border transition-all duration-150 items-center justify-center ${
                      isScreenShareActive
                        ? "bg-accent border-blue-400/60 text-blue-200 shadow-lg shadow-blue-900/30"
                        : "bg-transparent hover:bg-accent border-[var(--border-color)] text-sidebar-foreground"
                    }`}
                  >
                    <BsDisplay className="w-5 h-5" />
                  </button>

                  {/* Leave call */}
                  <button
                    id="leaveBtn"
                    title="Leave"
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all duration-150 flex items-center justify-center shadow-lg shadow-red-900/40 ml-1"
                  >
                    <BsTelephoneXFill className="w-5 h-5" />
                  </button>
                </div>

                {/* Right: huddle sidebars */}
                <div className="hidden sm:flex items-center justify-end gap-2 min-w-[120px]">
                  <button
                    type="button"
                    data-huddle-sidebar-trigger="messages"
                    aria-label="Open huddle messages"
                    aria-pressed={isMessagesSidebarOpen}
                    onClick={() => toggleSidebarView("messages")}
                    title="Huddle messages"
                    className={`relative w-10 h-10 rounded-full border transition-all duration-150 flex items-center justify-center ${
                      isMessagesSidebarOpen
                        ? "bg-accent border-[var(--border-color)] text-sidebar-foreground"
                        : "bg-transparent hover:bg-accent border-[var(--border-color)] text-muted-foreground hover:text-sidebar-foreground"
                    }`}
                  >
                    <BsChatDotsFill className="w-4 h-4" />
                    {unreadChatCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white flex items-center justify-center">
                        {unreadChatBadgeLabel}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    data-huddle-sidebar-trigger="people"
                    aria-label="Open people sidebar"
                    aria-pressed={isPeopleSidebarOpen}
                    onClick={() => toggleSidebarView("people")}
                    title="People"
                    className={`w-10 h-10 rounded-full border transition-all duration-150 flex items-center justify-center ${
                      isPeopleSidebarOpen
                        ? "bg-accent border-[var(--border-color)] text-sidebar-foreground"
                        : "bg-transparent hover:bg-accent border-[var(--border-color)] text-muted-foreground hover:text-sidebar-foreground"
                    }`}
                  >
                    <BsPeopleFill className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Incoming Call Modal ──────────────────────────────────────────── */}
        <div
          id="incomingCallModal"
          className="hidden fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70]"
        >
          <div className="bg-sidebar rounded-2xl p-8 max-w-sm w-full mx-4 border border-[var(--border-color)] shadow-2xl">
            <div className="text-center">
              <div className="bg-indigo-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 calling-animation ring-2 ring-indigo-500/30">
                <span id="callerInitial" className="text-xl font-bold text-indigo-400" />
              </div>
              <h3 id="callerName" className="text-lg font-semibold mb-1" />
              <p className="text-muted-foreground text-sm mb-6">is inviting you to a huddle</p>
              <div className="flex gap-3">
                <button
                  id="rejectCallBtn"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl transition text-sm"
                >
                  Decline
                </button>
                <button
                  id="acceptCallBtn"
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition text-sm"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { margin: 0; font-family: inherit; }
        video { object-fit: contain; background: #000; }

        /* Sidebar slides from the RIGHT on all viewports */
        .huddle-sidebar-drawer {
          right: 0;
          transform: translateX(100%);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .huddle-sidebar-drawer.open { transform: translateX(0) !important; }

        /* Video tiles */
        .video-container {
          position: relative;
          overflow: hidden;
          aspect-ratio: 16 / 9;
          width: 100%;
          height: 100%;
          transition: all 0.3s ease;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          background: #1c1c1e;
        }
        .video-container.screen-share { aspect-ratio: 16/9; }

        #videos { gap: 10px; height: 100%; width: 100%; align-content: stretch; }
        #videos.grid-layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        #videos.screen-share-layout {
          display: grid;
          grid-template-columns: minmax(0, 7fr) minmax(240px, 3fr);
          align-items: stretch;
        }
        #videos.screen-share-layout .screen-share-primary {
          min-height: 100%;
        }

        .thumbnails-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          padding: 4px;
          min-height: 0;
          background: rgba(0,0,0,0.25);
          border-radius: 10px;
        }
        .thumbnails-container::-webkit-scrollbar { width: 4px; }
        .thumbnails-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .thumbnails-container .video-container,
        .thumbnails-container .video-overflow-card {
          min-height: 108px;
        }

        .video-overflow-card {
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(135deg, rgba(99,102,241,0.18), rgba(17,24,39,0.92));
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 120px;
          padding: 12px;
        }
        .video-overflow-count {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
        }

        .video-label {
          position: absolute; bottom: 10px; left: 10px;
          background: rgba(0,0,0,0.65); color: #fff;
          padding: 3px 10px; border-radius: 6px;
          font-size: 12px; font-weight: 500; backdrop-filter: blur(6px);
        }
        .screen-share-badge {
          position: absolute; top: 10px; right: 10px;
          background: rgba(59,130,246,0.85); color: #fff;
          padding: 3px 10px; border-radius: 6px;
          font-size: 11px; font-weight: 600;
          display: flex; align-items: center; gap: 4px; backdrop-filter: blur(6px);
        }

        /* Device warning badge */
        .device-warning { position: relative; }
        .device-warning::after {
          content: "!"; position: absolute; top: -4px; right: -4px;
          width: 16px; height: 16px; background: #eab308; color: #000;
          border-radius: 50%; font-size: 10px; font-weight: bold;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid var(--sidebar);
        }

        /* Device dropdown popover */
        .device-dropdown {
          position: absolute; bottom: calc(100% + 14px); left: 50%; transform: translateX(-50%);
          background: var(--sidebar);
          border: 1px solid var(--border-color); border-radius: 14px;
          padding: 14px; min-width: 230px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.45); z-index: 100;
        }
        .device-panel-popover {
          width: min(280px, calc(100vw - 24px));
          max-width: calc(100vw - 24px);
          min-width: 0;
        }
        .device-dropdown select {
          width: 100%; background: transparent; color: var(--sidebar-foreground);
          border: 1px solid var(--border-color); border-radius: 8px;
          padding: 7px 10px; font-size: 13px;
        }
        .device-dropdown select:focus { outline: none; }

        /* User cards in people sidebar */
        .huddle-user-card {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 10px; cursor: pointer;
          transition: background 0.15s;
        }
        .huddle-user-card:hover { background: var(--accent); }

        /* Toasts */
        @keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .toast { animation: slideIn 0.2s ease-out; pointer-events: auto; }

        /* Incoming call pulse */
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.97); } }
        .calling-animation { animation: pulse 1.4s ease-in-out infinite; }

        /* Mobile tweaks */
        @media (max-width: 960px) {
          #videos.screen-share-layout {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(0, 7fr) minmax(120px, 3fr);
          }
          .thumbnails-container {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
          }
          .thumbnails-container::-webkit-scrollbar { height: 4px; width: auto; }
          #videos.grid-layout {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          }
        }

        @media (max-width: 640px) {
          .huddle-sidebar-drawer {
            max-width: min(22rem, 100vw);
          }
          #videos {
            padding: 8px;
            gap: 8px;
          }
          .video-label { font-size: 11px; padding: 2px 7px; }
          .screen-share-badge {
            top: 8px; right: 8px;
            padding: 2px 8px;
            font-size: 10px;
          }
          .device-panel-popover {
            width: min(260px, calc(100vw - 20px));
            max-width: calc(100vw - 20px);
          }
          .thumbnails-container .video-container,
          .thumbnails-container .video-overflow-card { min-width: 140px; min-height: 90px; }
        }
      `}</style>
    </>
  );
};

export default MainPage;
