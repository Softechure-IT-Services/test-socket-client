"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import api from "@/lib/axios";
import {
  Camera,
  Check,
  X,
  LogOut,
  User,
  Bell,
  Shield,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = "profile" | "notifications" | "privacy";

// ─── Avatar component ─────────────────────────────────────────────────────────
function UserAvatar({
  src,
  name,
  size = 20,
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Add a cache-busting param so the browser refetches after re-upload
  const srcWithCache = src
    ? src.includes("?")
      ? src
      : `${src}?t=${Date.now()}`
    : null;

  if (src) {
    return (
      <img
        src={srcWithCache!}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className={`rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center select-none ${className}`}
    >
      {initials}
    </span>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
      {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
    </button>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function StyledInput({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  rightElement,
}: {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="relative border rounded-sm">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-9 px-3 pr-9 text-sm rounded-md border border-[var(--border-color)] bg-transparent focus:outline-none focus:border-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      />
      {rightElement && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 rounded-full transition-colors shrink-0 ${
        enabled ? "bg-indigo-500" : "bg-muted-foreground/30"
      }`}
      style={{ height: "22px" }}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-[18px]" : "translate-x-0"
        }`}
        style={{ width: "18px", height: "18px" }}
      />
    </button>
  );
}

// ─── Inline feedback ──────────────────────────────────────────────────────────
function SavedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
      <Check className="w-3.5 h-3.5" /> Saved
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  // updateUser should be a function exposed by your AuthProvider that merges
  // partial user data into the stored user object (e.g. after a profile save).
  // If your context doesn't have it yet, see the note at the bottom of this file.
  const { user, logout, updateUser } = useAuth() as any;
  const router = useRouter();

  const [section, setSection] = useState<Section>("profile");

  // ── Profile saving state (separate from password saving) ──────────────────
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // ── Avatar state ──────────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Profile fields ────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [email] = useState(user?.email ?? "");
  const [status, setStatus] = useState("");
  const [bio, setBio] = useState("");

  // ── Password state (separate saved/error from profile) ────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  // ── Notification prefs ────────────────────────────────────────────────────
  const [notifDesktop, setNotifDesktop] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [notifDMs, setNotifDMs] = useState(true);

  // ── Privacy ───────────────────────────────────────────────────────────────
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);

  // ── Delete account ────────────────────────────────────────────────────────
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ─── Fetch full profile on mount to populate status & bio ─────────────────
  // The auth context may only store a subset of user fields (name, email,
  // avatar_url). We fetch the full profile from the server to get status & bio.
  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get("/users/me");
      const data = res.data;
      setName(data.name ?? "");
      setAvatarUrl(data.avatar_url ?? "");
      setStatus(data.status ?? "");
      setBio(data.bio ?? "");
      // Keep auth context in sync too
      if (typeof updateUser === "function") {
        updateUser({ name: data.name, avatar_url: data.avatar_url });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ─── Avatar upload ─────────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so selecting the same file again triggers onChange
    e.target.value = "";

    // Optimistic local preview
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);
    setAvatarUploading(true);

    try {
      const form = new FormData();
      form.append("avatar", file);

      const res = await api.post("/users/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newUrl = res.data.avatar_url;
      // Append timestamp to bust the browser image cache
      setAvatarUrl(`${newUrl}?t=${Date.now()}`);

      // Persist into auth context so it survives navigation / soft refreshes
      if (typeof updateUser === "function") {
        updateUser({ avatar_url: newUrl });
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
      // Revert to the last known good URL
      setAvatarUrl(user?.avatar_url ?? "");
    } finally {
      setAvatarUploading(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  // ─── Avatar remove ─────────────────────────────────────────────────────────
  async function handleRemoveAvatar() {
    if (!avatarUrl) return;
    setAvatarRemoving(true);
    try {
      await api.delete("/users/avatar");
      setAvatarUrl("");
      if (typeof updateUser === "function") {
        updateUser({ avatar_url: null });
      }
    } catch (err) {
      console.error("Failed to remove avatar:", err);
    } finally {
      setAvatarRemoving(false);
    }
  }

  // ─── Save profile ──────────────────────────────────────────────────────────
  async function handleSaveProfile() {
    setProfileError("");
    setProfileSaving(true);
    try {
      const res = await api.patch("/users/me", { name, status, bio });
      // Keep auth context in sync so the sidebar/header reflect the new name
      if (typeof updateUser === "function") {
        updateUser({ name: res.data.user?.name ?? name });
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: any) {
      setProfileError(
        err?.response?.data?.error ?? "Failed to save profile. Please try again."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  // ─── Change password ───────────────────────────────────────────────────────
  async function handleChangePassword() {
    setPwError("");
    if (newPw !== confirmPw) {
      setPwError("Passwords don't match.");
      return;
    }
    if (newPw.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    try {
      await api.patch("/users/me/password", {
        current_password: currentPw,
        new_password: newPw,
      });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err: any) {
      setPwError(
        err?.response?.data?.message ??
          err?.response?.data?.error ??
          "Failed to update password."
      );
    } finally {
      setPwSaving(false);
    }
  }

  // ─── Delete account ────────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (!confirmDelete) {
      // First click: ask for confirmation
      setConfirmDelete(true);
      return;
    }
    setDeletingAccount(true);
    try {
      await api.delete("/users/me");
      logout();
      router.push("/login");
    } catch (err) {
      console.error("Failed to delete account:", err);
      setDeletingAccount(false);
      setConfirmDelete(false);
    }
  }

  // ─── Logout ────────────────────────────────────────────────────────────────
  function handleLogout() {
    logout();
    router.push("/login");
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account, preferences, and privacy.
          </p>
        </div>

        <div className="flex gap-6">
          {/* ── Sidebar nav ─────────────────────────────────────────────── */}
          <aside className="w-48 shrink-0">
            <nav className="flex flex-col gap-1">
              <NavItem
                icon={User}
                label="Profile"
                active={section === "profile"}
                onClick={() => setSection("profile")}
              />
              <NavItem
                icon={Bell}
                label="Notifications"
                active={section === "notifications"}
                onClick={() => setSection("notifications")}
              />
              <NavItem
                icon={Shield}
                label="Privacy"
                active={section === "privacy"}
                onClick={() => setSection("privacy")}
              />
            </nav>

            {/* Logout */}
            <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Log out
              </button>
            </div>
          </aside>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">

            {/* ──────────── Profile section ──────────── */}
            {section === "profile" && (
              <div className="space-y-8">

                {/* Avatar card */}
                <div className="p-6 rounded-xl border border-[var(--border-color)] bg-card">
                  <h2 className="text-base font-semibold mb-4">Profile picture</h2>
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <UserAvatar
                        src={avatarUrl || null}
                        name={name}
                        size={72}
                        className="ring-2 ring-[var(--border-color)]"
                      />
                      {(avatarUploading || avatarRemoving) && (
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={avatarUploading || avatarRemoving}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center shadow transition-colors disabled:opacity-60"
                      >
                        <Camera className="w-3.5 h-3.5 text-white" />
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{email}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => fileRef.current?.click()}
                          disabled={avatarUploading || avatarRemoving}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                        >
                          {avatarUploading ? "Uploading…" : "Change photo"}
                        </button>
                        {avatarUrl && (
                          <button
                            onClick={handleRemoveAvatar}
                            disabled={avatarUploading || avatarRemoving}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            {avatarRemoving ? "Removing…" : "Remove"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal info card */}
                <div className="p-6 rounded-xl border border-[var(--border-color)] bg-card space-y-4">
                  <h2 className="text-base font-semibold">Personal info</h2>

                  <Field label="Display name">
                    <StyledInput
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </Field>

                  <Field
                    label="Email"
                    hint="Contact your admin to change your email."
                  >
                    <StyledInput value={email} disabled />
                  </Field>

                  <Field
                    label="Status"
                    hint="Let others know what you're up to."
                  >
                    <StyledInput
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      placeholder="e.g. In a meeting, On vacation…"
                    />
                  </Field>

                  <Field label="Bio">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="A short bio about yourself"
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-color)] bg-transparent focus:outline-none focus:border-foreground/50 transition-colors resize-none"
                    />
                  </Field>

                  {profileError && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <X className="w-3 h-3" /> {profileError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <SavedBadge show={profileSaved} />
                    <button
                      onClick={handleSaveProfile}
                      disabled={profileSaving}
                      className="flex items-center gap-2 h-8 px-4 rounded-md bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                    >
                      {profileSaving && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      Save changes
                    </button>
                  </div>
                </div>

                {/* Password card */}
                <div className="p-6 rounded-xl border border-[var(--border-color)] bg-card space-y-4">
                  <h2 className="text-base font-semibold">Change password</h2>

                  <Field label="Current password">
                    <StyledInput
                      type={showCurrent ? "text" : "password"}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="••••••••"
                      rightElement={
                        <button
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showCurrent ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      }
                    />
                  </Field>

                  <Field label="New password">
                    <StyledInput
                      type={showNew ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="••••••••"
                      rightElement={
                        <button
                          onClick={() => setShowNew(!showNew)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showNew ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      }
                    />
                  </Field>

                  <Field label="Confirm new password">
                    <StyledInput
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="••••••••"
                    />
                  </Field>

                  {pwError && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <X className="w-3 h-3" /> {pwError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <SavedBadge show={pwSaved} />
                    <button
                      onClick={handleChangePassword}
                      disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                      className="flex items-center gap-2 h-8 px-4 rounded-md bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                    >
                      {pwSaving && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      Update password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────── Notifications section ──────────── */}
            {section === "notifications" && (
              <div className="p-6 rounded-xl border border-[var(--border-color)] bg-card space-y-5">
                <h2 className="text-base font-semibold">Notification preferences</h2>

                {(
                  [
                    {
                      label: "Desktop notifications",
                      hint: "Show browser notifications for new messages.",
                      value: notifDesktop,
                      set: setNotifDesktop,
                    },
                    {
                      label: "Notification sounds",
                      hint: "Play a sound when you receive a message.",
                      value: notifSound,
                      set: setNotifSound,
                    },
                    {
                      label: "Mentions & keywords",
                      hint: "Always notify when someone mentions you.",
                      value: notifMentions,
                      set: setNotifMentions,
                    },
                    {
                      label: "Direct messages",
                      hint: "Always notify for new DMs.",
                      value: notifDMs,
                      set: setNotifDMs,
                    },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.hint}
                      </p>
                    </div>
                    <Toggle enabled={item.value} onChange={item.set} />
                  </div>
                ))}
              </div>
            )}

            {/* ──────────── Privacy section ──────────── */}
            {section === "privacy" && (
              <div className="p-6 rounded-xl border border-[var(--border-color)] bg-card space-y-5">
                <h2 className="text-base font-semibold">Privacy</h2>

                {(
                  [
                    {
                      label: "Show online status",
                      hint: "Let others see when you're active.",
                      value: showOnlineStatus,
                      set: setShowOnlineStatus,
                    },
                    {
                      label: "Read receipts",
                      hint: "Let others see when you've read their messages.",
                      value: showReadReceipts,
                      set: setShowReadReceipts,
                    },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.hint}
                      </p>
                    </div>
                    <Toggle enabled={item.value} onChange={item.set} />
                  </div>
                ))}

                {/* Danger zone */}
                <div className="pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-sm font-semibold text-red-400 mb-3">
                    Danger zone
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Permanently deletes your account and all associated data.
                    This action cannot be undone.
                  </p>
                  {confirmDelete && (
                    <p className="text-xs text-red-400 mb-3 flex items-center gap-1.5">
                      <X className="w-3 h-3" /> Click again to confirm permanent
                      deletion.
                    </p>
                  )}
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="h-8 px-4 rounded-md border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {deletingAccount && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {confirmDelete ? "Yes, delete my account" : "Delete account"}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/*
 * ─── AuthProvider: updateUser ──────────────────────────────────────────────────
 *
 * For the avatar (and name) to persist after a page refresh without re-fetching,
 * your AuthProvider needs to expose an `updateUser` function that merges partial
 * fields into the stored user object AND writes back to wherever the session is
 * persisted (localStorage, a cookie, etc.).
 *
 * Minimal example to add to your provider:
 *
 *   const [user, setUser] = useState<User | null>(loadUserFromStorage());
 *
 *   function updateUser(partial: Partial<User>) {
 *     setUser(prev => {
 *       if (!prev) return prev;
 *       const next = { ...prev, ...partial };
 *       localStorage.setItem("user", JSON.stringify(next));   // or your storage key
 *       return next;
 *     });
 *   }
 *
 *   // expose in context value:
 *   <AuthContext.Provider value={{ user, logout, updateUser }}>
 *
 * The profile page calls updateUser({ avatar_url, name }) after every successful
 * mutation, so the context stays in sync and survives navigation and soft refreshes.
 * A hard F5 will re-fetch from the server on mount via the GET /users/me call.
 */