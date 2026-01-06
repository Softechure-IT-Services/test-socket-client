// app/main/page.tsx or app/main.tsx
"use client";
// @ts-nocheck

import React, { useEffect } from "react";
import { useAuth } from "@/components/context/userId_and_connection/provider";
const MainPage: React.FC = () => {
  const { socket, user } = useAuth();

  useEffect(() => {
    if (!socket) return; // wait until provider has created the socket

    // ---------- STATE / REFS (ported from main.js) ----------
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
    let screenShareUserId: string | null = null;
    let audioContext: AudioContext | null = null;
    let silentAudioTrack: MediaStreamTrack | null = null;
    let deviceCheckInterval: any = null;

    // State to track known devices
    let knownDevices = { audio: [] as string[], video: [] as string[] };

    // Helper: wait for RTCPeerConnection to reach stable signaling state
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
    const usernameInput = document.getElementById(
      "usernameInput"
    ) as HTMLInputElement;
    const continueBtn = document.getElementById(
      "continueBtn"
    ) as HTMLButtonElement;
    const userInitial = document.getElementById("userInitial")!;
    const displayUsername = document.getElementById("displayUsername")!;
    const preview = document.getElementById("preview") as HTMLVideoElement;
    const videos = document.getElementById("videos")!;
    const userList = document.getElementById("userList")!;
    const noUsers = document.getElementById("noUsers")!;
    const prejoin = document.getElementById("prejoin")!;
    const meeting = document.getElementById("meeting")!;
    const roomName = document.getElementById("roomName")!;
    const incomingCallModal = document.getElementById("incomingCallModal")!;
    const callerName = document.getElementById("callerName")!;
    const callerInitial = document.getElementById("callerInitial")!;
    const toastContainer = document.getElementById("toastContainer")!;
    const roomInput = document.getElementById(
      "roomInput"
    ) as HTMLInputElement;
    const createRoomBtn = document.getElementById(
      "createRoomBtn"
    ) as HTMLButtonElement;
    const sidebar = document.getElementById("sidebar")!;
    const openSidebar = document.getElementById("openSidebar")!;
    const closeSidebar = document.getElementById("closeSidebar")!;
    const micSelect = document.getElementById("micSelect") as HTMLSelectElement;
    const camSelect = document.getElementById("camSelect") as HTMLSelectElement;

    // If you have an authenticated user, optionally pre-fill the name
    if (!username && user?.name) {
      username = user.name;
      if (usernameInput) usernameInput.value = user.name;
    }

    // ---------- DEVICE CHANGE MONITOR ----------
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", async () => {
        console.log("Device change detected!");
        if (isInCall) {
          await checkAndUpdateDevices();
        }
      });
    }

    // ---------- SIDEBAR TOGGLE ----------
    openSidebar.addEventListener("click", () => {
      sidebar.classList.add("open");
    });

    closeSidebar.addEventListener("click", () => {
      sidebar.classList.remove("open");
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth < 768) {
        if (
          !sidebar.contains(e.target as Node) &&
          !openSidebar.contains(e.target as Node)
        ) {
          sidebar.classList.remove("open");
        }
      }
    });

    // ---------- USERNAME SETUP ----------
    // usernameInput.addEventListener("input", () => {
    //   continueBtn.disabled = usernameInput.value.trim().length === 0;
    // });

    // usernameInput.addEventListener("keypress", (e) => {
    //   if (e.key === "Enter" && usernameInput.value.trim()) {
    //     setupUsername();
    //   }
    // });

    continueBtn.addEventListener("click", setupUsername);

    async function setupUsername() {
      username = usernameInput.value.trim() || username;
      if (!username) return;

      userInitial.textContent = username[0].toUpperCase();
      displayUsername.textContent = username;

      usernameScreen.classList.add("hidden");
      mainApp.classList.remove("hidden");

      socket?.emit("set-username", username);
      await startPreview();
    }

    // new
    async function applyUsernameAndStart(name: string) {
        username = name.trim();
        if (!username) return;

        userInitial.textContent = username[0].toUpperCase();
        displayUsername.textContent = username;

        usernameScreen.classList.add("hidden");
        mainApp.classList.remove("hidden");

        socket.emit("set-username", username);
        await startPreview();

        // Auto-join if the URL had ?room=...
        if (autoJoinRoomId) {
            joinRoom(autoJoinRoomId, `Room: ${autoJoinRoomId}`);
            autoJoinRoomId = null;
        }
        }

        // If we already have an authenticated user, skip the dialog completely
        if (user?.email) {
        // Use the auth user name
        applyUsernameAndStart(user.email);
        } else {
        // No auth user: show the dialog and wire up the inputs
        usernameInput.addEventListener("input", () => {
            continueBtn.disabled = usernameInput.value.trim().length === 0;
        });

        usernameInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && usernameInput.value.trim()) {
            setupUsername();
            }
        });

        continueBtn.addEventListener("click", setupUsername);

        async function setupUsername() {
            const name = usernameInput.value.trim();
            await applyUsernameAndStart(name);
        }
        }
    // new end

    // ---------- START PREVIEW ----------
    async function startPreview() {
      try {
        // Try to get both video and audio
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        preview.srcObject = localStream;
        hasCamera = true;
        hasMicrophone = true;
        updateDeviceButtons();
      } catch (err) {
        console.log("Failed to get video and audio, trying alternatives...");

        // Try video only
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          preview.srcObject = localStream;
          hasCamera = true;
          hasMicrophone = false;
          updateDeviceButtons();
          showToast(
            "Microphone not available, continuing with video only",
            "warning"
          );
        } catch (videoErr) {
          console.log("No video available, trying audio only...");

          // Try audio only
          try {
            localStream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
            // Create a black video track for audio-only users
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#1f2937";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw user initial
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 120px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
              (username || "?")[0].toUpperCase(),
              canvas.width / 2,
              canvas.height / 2
            );

            const dummyStream = canvas.captureStream(1);
            const videoTrack = dummyStream.getVideoTracks()[0];
            localStream.addTrack(videoTrack);

            preview.srcObject = localStream;
            hasCamera = false;
            hasMicrophone = true;
            updateDeviceButtons();
            showToast(
              "Camera not available, continuing with audio only",
              "warning"
            );
          } catch (audioErr) {
            console.log("No audio/video available, creating dummy stream...");

            // Create a dummy stream with no real media
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#1f2937";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw user initial
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 120px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
              username ? username[0].toUpperCase() : "?",
              canvas.width / 2,
              canvas.height / 2
            );

            localStream = canvas.captureStream(1);

            // Add silent audio track
            audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const dst = oscillator.connect(
              audioContext.createMediaStreamDestination()
            );
            oscillator.start();
            silentAudioTrack = dst.stream.getAudioTracks()[0];
            silentAudioTrack.enabled = false;
            localStream.addTrack(silentAudioTrack);

            preview.srcObject = localStream;
            hasCamera = false;
            hasMicrophone = false;
            updateDeviceButtons();
            showToast(
              "No camera/microphone available. You can still share your screen!",
              "info"
            );
          }
        }
      }
    }

    // ---------- DEVICE CHECK / AUTO UPGRADE ----------
    async function checkAndUpdateDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");
        const videoInputs = devices.filter((d) => d.kind === "videoinput");

        const hasAudioInput = audioInputs.length > 0;
        const hasVideoInput = videoInputs.length > 0;

        // --- MICROPHONE HANDLING ---
        if (!hasMicrophone && hasAudioInput) {
          console.log("🎤 New microphone detected. Attempting to acquire...");
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true },
            });
            const newAudioTrack = audioStream.getAudioTracks()[0];

            // stop/remove old
            const oldAudioTrack = localStream?.getAudioTracks()[0];
            if (oldAudioTrack && localStream) {
              oldAudioTrack.stop();
              localStream.removeTrack(oldAudioTrack);
            }

            localStream?.addTrack(newAudioTrack);
            preview.srcObject = localStream;

            // update peers
            for (const [peerId, peerData] of Object.entries(peers)) {
              const { pc } = peerData as any;
              await waitForStableState(pc);

              const audioSender = pc
                .getSenders()
                .find((s: RTCRtpSender) => s.track?.kind === "audio");

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
            // NOTE: this event name mismatches server's "audio-track-updated" in your snippet.
            socket?.emit("peer-audio-updated", { roomId: currentRoom });
            showToast("🎤 Microphone connected and active!", "success");
            testAudioLevel(newAudioTrack);
          } catch (err) {
            console.error("❌ Failed to switch to new microphone:", err);
          }
        }

        // --- CAMERA HANDLING ---
        if (!hasCamera && hasVideoInput) {
          console.log("📹 New camera detected. Attempting to acquire...");
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
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
                const videoSender = pc
                  .getSenders()
                  .find((s: RTCRtpSender) => s.track?.kind === "video");
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
        const average =
          dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        if (average > 10) {
          console.log("✓ Microphone is working! Audio level:", average);
          ac.close();
        } else if (checkCount++ < 50) {
          requestAnimationFrame(checkAudio);
        } else {
          console.log(
            "⚠ No audio detected from microphone. Please check if it's enabled in system settings."
          );
          ac.close();
        }
      };

      setTimeout(checkAudio, 1000);
    }

    function updateDeviceButtons() {
      const micBtns = [
        document.getElementById("toggleMic"),
        document.getElementById("meetingToggleMic"),
      ];
      const camBtns = [
        document.getElementById("toggleCam"),
        document.getElementById("meetingToggleCam"),
      ];

      micBtns.forEach((btn) => {
        if (btn) {
          if (!hasMicrophone) {
            btn.classList.add(
              "bg-yellow-600",
              "hover:bg-yellow-700",
              "device-warning"
            );
            btn.classList.remove(
              "bg-gray-800",
              "hover:bg-gray-700",
              "bg-red-600",
              "hover:bg-red-700"
            );
          }
        }
      });

      camBtns.forEach((btn) => {
        if (btn) {
          if (!hasCamera) {
            btn.classList.add(
              "bg-yellow-600",
              "hover:bg-yellow-700",
              "device-warning"
            );
            btn.classList.remove(
              "bg-gray-800",
              "hover:bg-gray-700",
              "bg-red-600",
              "hover:bg-red-700"
            );
          }
        }
      });
    }

    function showToast(message: string, type = "info") {
      const toast = document.createElement("div");
      toast.className = `toast px-6 py-4 rounded-lg shadow-lg text-white ${
        type === "error"
          ? "bg-red-600"
          : type === "success"
          ? "bg-green-600"
          : type === "warning"
          ? "bg-yellow-600"
          : "bg-blue-600"
      }`;
      toast.textContent = message;
      toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-20px)";
        toast.style.transition = "all 0.3s";
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    // ---------- SOCKET EVENTS: USER LIST ----------
    const handleUpdateUserList = (users: any[]) => {
      userList.innerHTML = "";
      const otherUsers = users.filter((u) => u.id !== socket?.id);

      if (otherUsers.length === 0) {
        noUsers.classList.remove("hidden");
      } else {
        noUsers.classList.add("hidden");
      }

      otherUsers.forEach((user) => {
        console.log(`user ${user.username}`);

        if (user.username != null) {
          const userCard = document.createElement("div");
          userCard.className =
            "bg-gray-800 hover:bg-gray-750 rounded-lg p-3 cursor-pointer transition border border-gray-700 hover:border-gray-600";

          const initial = user.username
            ? user.username[0].toUpperCase()
            : "?";
          userCard.innerHTML = `
            <div class="flex items-center space-x-3">
              <div class="bg-gradient-to-br from-green-500 to-teal-600 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                ${initial}
              </div>
              <div class="flex-1">
                <h4 class="font-semibold">${user.username || "Anonymous"}</h4>
                <p class="text-xs text-gray-400">${user.inCall ? "In a call" : "Available"}</p>
              </div>
              <button class="call-btn bg-blue-600 hover:bg-blue-700 w-10 h-10 rounded-full flex items-center justify-center transition ${
                user.inCall ? "opacity-50 cursor-not-allowed" : ""
              }">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
              </button>
            </div>
          `;

          const callBtn = userCard.querySelector(
            ".call-btn"
          ) as HTMLButtonElement;
          callBtn.onclick = (e) => {
            e.stopPropagation();
            if (!user.inCall) {
              initiateCall(user.id, user.username);
            }
          };

          userList.appendChild(userCard);
        }
      });
    };

    socket?.on("update-user-list", handleUpdateUserList);

    // ---------- CALL FLOW ----------
    function initiateCall(userId: string, targetUsername: string) {
      if (isInCall) {
        showToast("Please leave your current call first", "warning");
        return;
      }

      const roomId = `room-${socket?.id}-${userId}`;
      socket?.emit("call-user", {
        to: userId,
        roomId,
        callerName: username,
      });
      showToast(`Calling ${targetUsername}...`, "info");
    }

    createRoomBtn.addEventListener("click", () => {
      const roomId = roomInput.value.trim();
      if (!roomId) {
        showToast("Please enter a room ID", "warning");
        return;
      }

      if (isInCall) {
        showToast("Please leave your current call first", "warning");
        return;
      }

      joinRoom(roomId, `Room: ${roomId}`);
      roomInput.value = "";
    });

    const handleIncomingCall = ({
      from,
      roomId,
      callerName: caller,
    }: any) => {
      if (isInCall) {
        socket?.emit("call-rejected", { to: from, reason: "busy" });
        return;
      }

      pendingCall = { from, roomId, callerName: caller };
      callerName.textContent = caller || "Unknown";
      callerInitial.textContent = caller
        ? caller[0].toUpperCase()
        : "?";
      incomingCallModal.classList.remove("hidden");
    };

    socket?.on("incoming-call", handleIncomingCall);

    document.getElementById("acceptCallBtn")!.onclick = () => {
      if (!pendingCall) return;

      incomingCallModal.classList.add("hidden");
      socket?.emit("call-accepted", {
        to: pendingCall.from,
        roomId: pendingCall.roomId,
      });
      joinRoom(pendingCall.roomId, pendingCall.callerName);
      pendingCall = null;
    };

    document.getElementById("rejectCallBtn")!.onclick = () => {
      if (!pendingCall) return;

      socket?.emit("call-rejected", {
        to: pendingCall.from,
        reason: "declined",
      });
      incomingCallModal.classList.add("hidden");
      pendingCall = null;
    };

    const handleCallAccepted = ({ roomId }: any) => {
      joinRoom(roomId, "Call");
    };

    socket?.on("call-accepted", handleCallAccepted);

    const handleCallRejected = ({ reason }: any) => {
      const message =
        reason === "busy"
          ? "User is currently in another call"
          : "Call declined";
      showToast(message, "error");
    };

    socket?.on("call-rejected", handleCallRejected);

    function joinRoom(roomId: string, displayName = "Room") {
      currentRoom = roomId;
      isInCall = true;
      prejoin.classList.add("hidden");
      meeting.classList.remove("hidden");
      roomName.textContent = displayName;

      if (localStream) addVideoStream("local", localStream, true, username);
      socket?.emit("join-room", roomId);
      socket?.emit("update-call-status", true);

      deviceCheckInterval = setInterval(() => {
        checkAndUpdateDevices();
      }, 3000);

      showToast("Joined the room. Monitoring for new devices...", "success");
    }

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
      if (!hasMicrophone) {
        showToast(
          "No microphone available. Connect a microphone to enable audio.",
          "warning"
        );
        return;
      }

      const track = localStream?.getAudioTracks()[0];
      if (track && track !== silentAudioTrack) {
        track.enabled = !track.enabled;

        const btns = [
          document.getElementById("toggleMic"),
          document.getElementById("meetingToggleMic"),
        ];
        btns.forEach((btn) => {
          if (btn) {
            btn.classList.toggle("bg-red-600", !track.enabled);
            btn.classList.toggle("hover:bg-red-700", !track.enabled);
            btn.classList.toggle("bg-gray-800", track.enabled);
            btn.classList.toggle("hover:bg-gray-700", track.enabled);
          }
        });
      }
    }

    function toggleCam() {
      if (!hasCamera) {
        showToast(
          "No camera available. Connect a camera to enable video.",
          "warning"
        );
        return;
      }

      const track = localStream?.getVideoTracks()[0];
      if (track && (track as any).label !== "canvas") {
        track.enabled = !track.enabled;

        const btns = [
          document.getElementById("toggleCam"),
          document.getElementById("meetingToggleCam"),
        ];
        btns.forEach((btn) => {
          if (btn) {
            btn.classList.toggle("bg-red-600", !track.enabled);
            btn.classList.toggle("hover:bg-red-700", !track.enabled);
            btn.classList.toggle("bg-gray-800", track.enabled);
            btn.classList.toggle("hover:bg-gray-700", track.enabled);
          }
        });
      }
    }

    // ---------- WEBRTC SIGNALING ----------
    const handleExistingUsers = (users: any[]) => {
      users.forEach((userData) =>
        createPeer(userData.id, userData.username, true)
      );
    };

    const handleUserJoined = (userData: any) => {
      createPeer(userData.id, userData.username, false);
    };

    const handleOffer = async ({
      from,
      offer,
      username: peerUsername,
    }: any) => {
      const pc = createPeer(from, peerUsername, false);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit("answer", { to: from, answer });
    };

    const handleAnswer = async ({ from, answer }: any) => {
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
        } catch (err) {
          console.error(`❌ Renegotiation failed with peer ${from}:`, err);
        }
      }
    };

    const handleRenegotiateAnswer = async ({ from, answer }: any) => {
      console.log(`🔄 Received renegotiation answer from peer ${from}`);
      const pc = peers[from]?.pc;

      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`✅ Renegotiation complete with peer ${from}`);
        } catch (err) {
          console.error(
            `❌ Failed to set renegotiation answer from peer ${from}:`,
            err
          );
        }
      }
    };

    const handleIceCandidate = ({ from, candidate }: any) => {
      peers[from]?.pc.addIceCandidate(candidate);
    };

    const handleUserLeft = (id: string) => {
      if (peers[id]) {
        peers[id].pc.close();
        delete peers[id];
      }
      document.getElementById(`video-${id}`)?.remove();

      if (screenShareUserId === id) {
        screenShareUserId = null;
        reorganizeVideoLayout();
      }
    };

    const handlePeerScreenShareStatus = ({
      userId,
      sharing,
    }: {
      userId: string;
      sharing: boolean;
    }) => {
      if (sharing) {
        screenShareUserId = userId;
        const container = document.getElementById(`video-${userId}`);
        if (container) {
          container.classList.add("screen-share");

          if (!container.querySelector(".screen-share-badge")) {
            const badge = document.createElement("div");
            badge.className = "screen-share-badge";
            badge.innerHTML = `
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clip-rule="evenodd"/>
              </svg>
              <span>Screen Sharing</span>
            `;
            container.appendChild(badge);
          }
        }
      } else {
        if (screenShareUserId === userId) {
          screenShareUserId = null;
        }
        const container = document.getElementById(`video-${userId}`);
        if (container) {
          container.classList.remove("screen-share");
          container.querySelector(".screen-share-badge")?.remove();
        }
      }
      reorganizeVideoLayout();
    };

    const handlePeerAudioUpdated = ({ from }: any) => {
      console.log(
        `🔊 Peer ${from} swapped hardware. Refreshing audio playback...`
      );

      const container = document.getElementById(`video-${from}`);
      if (container) {
        const video = container.querySelector("video") as HTMLVideoElement;
        video
          .play()
          .catch((err) =>
            console.warn("Auto-nudge blocked. Waiting for user interaction.", err)
          );
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
    function createPeer(
      id: string,
      peerUsername: string,
      initiator: boolean
    ) {
      if (peers[id]) return peers[id].pc;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peers[id] = { pc, username: peerUsername };

      if (localStream) {
        localStream.getTracks().forEach((t) => {
          try {
            pc.addTrack(t, localStream!);
          } catch (err) {
            console.log("Error adding track:", err);
          }
        });
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

      pc.onconnectionstatechange = () => {
        console.log(`Peer ${id} connection state:`, pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log(
          `Peer ${id} ICE connection state:`,
          pc.iceConnectionState
        );
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket?.emit("icecandidate", { to: id, candidate: e.candidate });
        }
      };

      if (initiator) {
        pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer);
          socket?.emit("offer", { to: id, offer });
        });
      }

      return pc;
    }

    // ---------- VIDEO HANDLING ----------
    function addVideoStream(
      id: string,
      stream: MediaStream,
      muted = false,
      displayName = "User",
      isScreenShare = false
    ) {
      let container = document.getElementById(
        `video-${id}`
      ) as HTMLDivElement | null;
      if (!container) {
        container = document.createElement("div");
        container.id = `video-${id}`;
        container.className =
          "video-container bg-gray-800 rounded-lg md:rounded-xl overflow-hidden shadow-lg border border-gray-700";

        if (isScreenShare) {
          container.classList.add("screen-share");
        }

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
        label.textContent =
          id === "local" ? `${displayName} (You)` : displayName;

        container.appendChild(video);
        container.appendChild(label);

        if (isScreenShare) {
          const badge = document.createElement("div");
          badge.className = "screen-share-badge";
          badge.innerHTML = `
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clip-rule="evenodd"/>
            </svg>
            <span>Screen Sharing</span>
          `;
          container.appendChild(badge);
        }

        videos.appendChild(container);
      }

      const videoElement = container.querySelector(
        "video"
      ) as HTMLVideoElement;
      videoElement.srcObject = stream;

      if (!muted) {
        const audioTracks = stream.getAudioTracks();
        console.log(`Video ${id} has ${audioTracks.length} audio tracks`);
        audioTracks.forEach((track, index) => {
          console.log(
            `Audio track ${index}:`,
            track.label,
            "enabled:",
            track.enabled
          );
          track.enabled = true;
        });

        videoElement.play().catch((err) => {
          console.log(
            `Autoplay prevented for ${id}, will retry on interaction:`,
            err
          );
          const playOnClick = () => {
            videoElement
              .play()
              .then(() => {
                console.log(
                  `Started playback for ${id} after user interaction`
                );
                document.removeEventListener("click", playOnClick);
              })
              .catch((e) => console.log(`Play failed for ${id}:`, e));
          };
          document.addEventListener("click", playOnClick, { once: true });
        });
      }

      reorganizeVideoLayout();
    }

    function reorganizeVideoLayout() {
      const containers = Array.from(
        videos.querySelectorAll(".video-container")
      ) as HTMLDivElement[];
      const screen = containers.find((c) =>
        c.classList.contains("screen-share")
      );

      videos.innerHTML = "";

      if (screen) {
        videos.classList.add("has-screen-share");

        videos.appendChild(screen);

        const thumbs = document.createElement("div");
        thumbs.className = "thumbnails-container";

        containers.forEach((c) => {
          if (c !== screen) thumbs.appendChild(c);
        });

        videos.appendChild(thumbs);
      } else {
        videos.classList.remove("has-screen-share");
        containers.forEach((c) => videos.appendChild(c));
      }
    }

    // ---------- SCREEN SHARE ----------
    document.getElementById("shareScreenBtn")!.onclick = toggleScreenShare;

    async function toggleScreenShare() {
      if (!isScreenSharing) {
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
          const screenTrack = screenStream.getVideoTracks()[0];

          const currentVideoTrack = localStream?.getVideoTracks()[0];
          if (
            currentVideoTrack &&
            (currentVideoTrack as any).label !== "canvas"
          ) {
            originalVideoTrack = currentVideoTrack;
          }

          Object.values(peers).forEach(({ pc }: any) => {
            const sender = pc
              .getSenders()
              .find((s: RTCRtpSender) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(screenTrack).catch((err: any) => {
                console.log("Error replacing track:", err);
              });
            }
          });

          const oldLocal = document.getElementById("video-local");
          if (oldLocal) {
            oldLocal.remove();
          }

          addVideoStream("local", screenStream, true, username, true);
          screenShareUserId = "local";

          isScreenSharing = true;
          const shareBtn = document.getElementById(
            "shareScreenBtn"
          ) as HTMLButtonElement;
          if (shareBtn) shareBtn.classList.add("bg-blue-600");
          showToast("Screen sharing started", "success");

          screenTrack.onended = stopScreenShare;

          socket?.emit("screen-share-status", {
            roomId: currentRoom,
            sharing: true,
          });
        } catch (err) {
          console.log("Screen share error:", err);
          showToast("Failed to share screen or cancelled", "error");
        }
      } else {
        stopScreenShare();
      }
    }

    function stopScreenShare() {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }

      let trackToRestore = originalVideoTrack;

      if (!trackToRestore || trackToRestore.readyState === "ended") {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 120px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          (username || "?")[0].toUpperCase(),
          canvas.width / 2,
          canvas.height / 2
        );

        const dummyStream = canvas.captureStream(1);
        trackToRestore = dummyStream.getVideoTracks()[0];
      }

      Object.values(peers).forEach(({ pc }: any) => {
        const sender = pc
          .getSenders()
          .find((s: RTCRtpSender) => s.track?.kind === "video");
        if (sender && trackToRestore) {
          sender.replaceTrack(trackToRestore).catch((err: any) => {
            console.log("Error restoring track:", err);
          });
        }
      });

      const oldLocal = document.getElementById("video-local");
      if (oldLocal) {
        oldLocal.remove();
      }

      if (localStream) addVideoStream("local", localStream, true, username);

      screenShareUserId = null;

      isScreenSharing = false;
      const shareBtn = document.getElementById(
        "shareScreenBtn"
      ) as HTMLButtonElement;
      if (shareBtn) shareBtn.classList.remove("bg-blue-600");
      showToast("Screen sharing stopped", "info");

      socket?.emit("screen-share-status", {
        roomId: currentRoom,
        sharing: false,
      });
    }

    // ---------- LEAVE MEETING ----------
    document.getElementById("leaveBtn")!.onclick = leaveMeeting;

    function leaveMeeting() {
      if (deviceCheckInterval) {
        clearInterval(deviceCheckInterval);
        deviceCheckInterval = null;
      }

      Object.values(peers).forEach(({ pc }: any) => pc.close());
      Object.keys(peers).forEach((id) => delete peers[id]);

      videos.innerHTML = "";

      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        isScreenSharing = false;
      }

      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }

      socket?.emit("leave-room", currentRoom);
      socket?.emit("update-call-status", false);

      currentRoom = null;
      isInCall = false;
      screenShareUserId = null;

      meeting.classList.add("hidden");
      prejoin.classList.remove("hidden");

      showToast("You left the call", "info");
    }

    // ---------- DEVICE LIST & SWITCHING ----------
    async function refreshDeviceList(autoSwitch = false) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        const currentAudioInputs = devices.filter(
          (d) => d.kind === "audioinput"
        );
        const currentVideoInputs = devices.filter(
          (d) => d.kind === "videoinput"
        );

        let newlyDetectedMicId: string | null = null;
        if (autoSwitch) {
          newlyDetectedMicId =
            currentAudioInputs.find(
              (d) =>
                d.deviceId !== "" &&
                !knownDevices.audio.includes(d.deviceId)
            )?.deviceId || null;
        }

        knownDevices.audio = currentAudioInputs.map((d) => d.deviceId);
        knownDevices.video = currentVideoInputs.map((d) => d.deviceId);

        populateSelect(micSelect, currentAudioInputs);
        populateSelect(camSelect, currentVideoInputs);

        if (newlyDetectedMicId && isInCall) {
          console.log("🆕 New Mic Detected:", newlyDetectedMicId);
          micSelect.value = newlyDetectedMicId;
          await switchDevice("audio", newlyDetectedMicId);
          showToast(
            "Switched to new audio hardware automatically",
            "success"
          );
        }
      } catch (err) {
        console.error("Error updating device list:", err);
      }
    }

    function populateSelect(
      selectElement: HTMLSelectElement,
      devices: MediaDeviceInfo[]
    ) {
      const currentValue = selectElement.value;
      selectElement.innerHTML = "";

      devices.forEach((device) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.text =
          device.label || `Device ${device.deviceId.slice(0, 5)}`;
        selectElement.appendChild(option);
      });

      if (
        Array.from(selectElement.options).some(
          (opt) => opt.value === currentValue
        )
      ) {
        selectElement.value = currentValue;
      }
    }

    async function switchDevice(type: "audio" | "video", deviceId: string) {
      try {
        console.log(`Attempting to switch ${type} to: ${deviceId}`);

        const constraints: MediaStreamConstraints = {
          audio:
            type === "audio"
              ? { deviceId: { exact: deviceId } }
              : false,
          video:
            type === "video"
              ? { deviceId: { exact: deviceId } }
              : false,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        const newTrack = newStream.getTracks()[0];

        if (!newTrack || !localStream) throw new Error("No track");

        const oldTracks =
          type === "audio"
            ? localStream.getAudioTracks()
            : localStream.getVideoTracks();
        oldTracks.forEach((track) => {
          track.stop();
          localStream!.removeTrack(track);
        });

        localStream.addTrack(newTrack);

        preview.srcObject = localStream;
        if (type === "video") originalVideoTrack = newTrack;

        for (const [peerId, peerData] of Object.entries(peers)) {
          const senders = (peerData as any).pc.getSenders();
          const sender = senders.find(
            (s: RTCRtpSender) => s.track?.kind === type
          );

          if (sender) {
            await sender.replaceTrack(newTrack);
            console.log(
              `✅ Seamlessly swapped ${type} for peer: ${peerId}`
            );
          }
        }

        if (type === "audio") {
          socket?.emit("peer-audio-updated", { roomId: currentRoom });
        }

        showToast(
          `${type.charAt(0).toUpperCase() + type.slice(1)} updated!`,
          "success"
        );
      } catch (err: any) {
        console.error("Switch Device Error Detail:", err);
        if (
          err.name === "NotReadableError" ||
          err.name === "TrackStartError"
        ) {
          showToast(
            "Device is busy. Please close other apps using the mic/camera.",
            "error"
          );
        } else {
          showToast(
            "Could not switch to the selected device.",
            "error"
          );
        }
      }
    }

    micSelect.onchange = () => switchDevice("audio", micSelect.value);
    camSelect.onchange = () => switchDevice("video", camSelect.value);

    navigator.mediaDevices.ondevicechange = () => {
      console.log("🔌 Hardware change detected... waiting for drivers to settle.");
      setTimeout(async () => {
        await refreshDeviceList(true);
      }, 1000);
    };

    refreshDeviceList(false);

    // ---------- CLEANUP ----------
    return () => {
      socket?.off("update-user-list", handleUpdateUserList);
      socket?.off("incoming-call", handleIncomingCall);
      socket?.off("call-accepted", handleCallAccepted);
      socket?.off("call-rejected", handleCallRejected);
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
      // Do NOT disconnect socket; provider owns its lifecycle
    };
  }, [socket, user]);

  return (
    <>
         <div className="bg-gray-950 text-white min-h-screen fixed top-0 left-0 right-0 bottom-0 z-[999]">
        <div
          id="toastContainer"
          className="fixed top-4 right-4 z-50 space-y-2"
        ></div>

        {/* Username Screen */}
        <div
          id="usernameScreen"
          className="min-h-screen flex items-center justify-center p-4"
        >
          <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-800">
            <div className="text-center mb-8">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome to Video Call
              </h1>
              <p className="text-gray-400">Enter your name to get started</p>
            </div>
            <div className="space-y-4">
              <input
                id="usernameInput"
                type="text"
                placeholder="Your Name"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                maxLength={20}
              />
              <button
                id="continueBtn"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        {/* Main App */}
        <div id="mainApp" className="hidden h-screen flex flex-col md:flex-row">
          {/* Sidebar */}
          <div
            id="sidebar"
            className="sidebar w-full md:w-80 bg-gray-900 border-r border-gray-800 flex flex-col"
          >
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                    <span id="userInitial"></span>
                  </div>
                  <div className="flex-1">
                    <h3
                      id="displayUsername"
                      className="font-semibold text-lg"
                    ></h3>
                    <p className="text-xs text-gray-400">Online</p>
                  </div>
                </div>
                <button
                  id="closeSidebar"
                  className="md:hidden text-gray-400 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                Create Room
              </h2>
              <input
                id="roomInput"
                type="text"
                placeholder="Enter Room ID"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 text-sm mb-2"
              />
              <button
                id="createRoomBtn"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200"
              >
                Create / Join Room
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                Active Users
              </h2>
              <div id="userList" className="space-y-2"></div>
              <div
                id="noUsers"
                className="text-gray-500 text-sm text-center mt-8"
              >
                No other users online
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <button
              id="openSidebar"
              className="md:hidden fixed top-4 left-4 z-30 bg-gray-900 text-white p-3 rounded-full shadow-lg border border-gray-800"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Prejoin */}
            <div
              id="prejoin"
              className="flex-1 flex items-center justify-center p-4 md:p-8"
            >
              <div className="max-w-2xl w-full">
                <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                  <div className="aspect-video bg-black relative">
                    <video
                      id="preview"
                      autoPlay
                      muted
                      className="w-full h-full"
                    ></video>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
                      {/* Mic */}
                      <div className="relative">
                        <div
                          id="microphoneDropdown"
                          className="device-dropdown hidden"
                        >
                          <select id="microphoneSelect" className="text-sm">
                            <option value="">Select Microphone</option>
                          </select>
                        </div>
                        <button
                          id="toggleMic"
                          className="bg-gray-800 hover:bg-gray-700 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition"
                        >
                          <svg
                            className="w-4 h-4 md:w-5 md:h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <button
                          id="toggleMicDropdown"
                          className="absolute -top-1 -right-1 bg-gray-700 hover:bg-gray-600 w-5 h-5 rounded-full flex items-center justify-center transition"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                      {/* Cam */}
                      <div className="relative">
                        <div
                          id="cameraDropdown"
                          className="device-dropdown hidden"
                        >
                          <select id="cameraSelect" className="text-sm">
                            <option value="">Select Camera</option>
                          </select>
                        </div>
                        <button
                          id="toggleCam"
                          className="bg-gray-800 hover:bg-gray-700 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition"
                        >
                          <svg
                            className="w-4 h-4 md:w-5 md:h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        </button>
                        <button
                          id="toggleCamDropdown"
                          className="absolute -top-1 -right-1 bg-gray-700 hover:bg-gray-600 w-5 h-5 rounded-full flex items-center justify-center transition"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 md:p-6">
                    <h2 className="text-xl md:text-2xl font-bold mb-2">
                      Ready to join?
                    </h2>
                    <p className="text-gray-400 text-sm md:text-base mb-6">
                      Select a user from the sidebar or create a room
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Meeting */}
            <div
              id="meeting"
              className="hidden flex-1 flex flex-col min-h-0"
            >
              <div className="flex-1 p-2 md:p-4 overflow-auto">
                <div
                  id="videos"
                  className="grid gap-2 md:gap-4 h-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                ></div>
              </div>

              <div className="bg-gray-900 border-t border-gray-800 px-3 md:px-6 py-3 md:py-4">
                <div className="device-controls grid grid-cols-2 space-x-4 bg-gray-900 rounded-lg pb-6">
                  <div>
                    <label className="block text-sm font-medium">
                      Microphone
                    </label>
                    <select
                      id="micSelect"
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                    ></select>
                  </div>
                  <div className="!mt-0">
                    <label className="block text-sm font-medium">
                      Camera
                    </label>
                    <select
                      id="camSelect"
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                    ></select>
                  </div>
                </div>

                <div className="flex items-center justify-between max-w-6xl mx-auto">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span
                      id="roomName"
                      className="text-xs md:text-sm text-gray-400 font-medium truncate"
                    ></span>
                  </div>
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <button
                      id="refreshDevicesBtn"
                      className="hidden md:flex bg-gray-800 hover:bg-gray-700 w-12 h-12 rounded-full items-center justify-center transition"
                      title="Refresh Devices"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 011.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    <div className="relative">
                      <button
                        id="meetingToggleMic"
                        className="bg-gray-800 hover:bg-gray-700 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition"
                      >
                        <svg
                          className="w-4 h-4 md:w-5 md:h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <button
                        id="meetingToggleMicDropdown"
                        className="absolute -top-1 -right-1 bg-gray-700 hover:bg-gray-600 w-5 h-5 rounded-full flex items-center justify-center transition"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="relative">
                      <button
                        id="meetingToggleCam"
                        className="bg-gray-800 hover:bg-gray-700 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition"
                      >
                        <svg
                          className="w-4 h-4 md:w-5 md:h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </button>
                      <button
                        id="meetingToggleCamDropdown"
                        className="absolute -top-1 -right-1 bg-gray-700 hover:bg-gray-600 w-5 h-5 rounded-full flex items-center justify-center transition"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>

                    <button
                      id="shareScreenBtn"
                      className="hidden md:flex bg-gray-800 hover:bg-gray-700 w-12 h-12 rounded-full items-center justify-center transition"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    <button
                      id="leaveBtn"
                      className="bg-red-600 hover:bg-red-700 px-3 md:px-6 h-10 md:h-12 rounded-full font-semibold transition text-sm md:text-base"
                    >
                      Leave
                    </button>
                  </div>
                  <div className="hidden md:block w-24"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Incoming Call Modal */}
        <div
          id="incomingCallModal"
          className="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
        >
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-800 shadow-2xl">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 calling-animation">
                <span
                  id="callerInitial"
                  className="text-3xl font-bold"
                ></span>
              </div>
              <h3
                id="callerName"
                className="text-2xl font-bold mb-2"
              ></h3>
              <p className="text-gray-400 mb-8">Incoming call...</p>
              <div className="flex space-x-4">
                <button
                  id="rejectCallBtn"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                >
                  Decline
                </button>
                <button
                  id="acceptCallBtn"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS from original index.html */}
      <style jsx global>{`
        body {
          margin: 0;
          font-family: "Inter", system-ui, -apple-system, sans-serif;
        }
        video {
          object-fit: contain;
          background: #000;
        }
        .video-container {
          position: relative;
          overflow: hidden;
          aspect-ratio: 16 / 9;
          width: 100%;
          height: 100%;
          transition: all 0.3s ease;
        }
        .video-container.screen-share {
          grid-column: 1 / 1;
          grid-row: 1 / 1;
          aspect-ratio: 16 / 9;
        }
        #videos {
          display: grid;
          gap: 8px;
          height: 100%;
          width: 100%;
        }
        #videos.has-screen-share {
          grid-template-columns: 1fr;
          grid-template-rows: auto;
        }
        #videos.has-screen-share .video-container:not(.screen-share) {
          aspect-ratio: 16 / 9;
          max-height: 120px;
        }
        .thumbnails-container {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }
        .thumbnails-container::-webkit-scrollbar {
          height: 4px;
        }
        .thumbnails-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }
        .video-label {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(0, 0, 0, 0.7);
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
        }
        .screen-share-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(59, 130, 246, 0.9);
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .device-warning {
          position: relative;
        }
        .device-warning::after {
          content: "!";
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          background: #eab308;
          color: #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          border: 2px solid #111;
        }
        .device-dropdown {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 8px;
          min-width: 200px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          z-index: 100;
        }
        .device-dropdown select {
          width: 100%;
          background: #111827;
          color: white;
          border: 1px solid #374151;
          border-radius: 6px;
          padding: 8px;
          font-size: 14px;
        }
        .device-dropdown select:focus {
          outline: none;
          border-color: #3b82f6;
        }
        @keyframes slideIn {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .toast {
          animation: slideIn 0.3s ease-out;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .calling-animation {
          animation: pulse 1.5s ease-in-out infinite;
        }
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: -100%;
            top: 0;
            height: 100vh;
            z-index: 40;
            transition: left 0.3s ease;
          }
          .sidebar.open {
            left: 0;
          }
          .video-label {
            font-size: 12px;
            padding: 3px 8px;
          }
          #videos.has-screen-share .video-container:not(.screen-share) {
            max-height: 100px;
          }
        }
      `}</style>
    </>
  );
};

export default MainPage;