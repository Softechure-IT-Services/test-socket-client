"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Palette,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = "profile" | "notifications" | "privacy" | "appearance";

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

  if (src) {
    return (
      <img
        src={src}
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
          : " hover:bg-accent/50 hover:text-foreground"
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
      {hint && <p className="text-xs ">{hint}</p>}
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
        className="w-full h-9 px-3 pr-9 text-sm rounded-md border border-[var(--border-color)] bg-transparent focus:outline-none focus:border-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors placeholder:"
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
      className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
        enabled ? "bg-indigo-500" : "bg-muted-foreground/30"
      }`}
      style={{ height: "22px" }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-[18px]" : "translate-x-0"
        }`}
        style={{ width: "18px", height: "18px" }}
      />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [section, setSection] = useState<Section>("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [name, setName] = useState(user?.name ?? "");
  const [email] = useState(user?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [status, setStatus] = useState("");
  const [bio, setBio] = useState("");

  // Password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState("");

  // Notification prefs
  const [notifDesktop, setNotifDesktop] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [notifDMs, setNotifDMs] = useState(true);

  // Privacy
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setAvatarUrl(user.avatar_url ?? "");
    }
  }, [user]);

  // ── Avatar upload ────────────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic preview
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);
    setAvatarUploading(true);

    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await api.post("/users/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatarUrl(res.data.avatar_url);
    } catch {
      setAvatarUrl(user?.avatar_url ?? "");
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Save profile ─────────────────────────────────────────────────────────────
  async function handleSaveProfile() {
    setSaving(true);
    try {
      await api.patch("/users/me", { name, status, bio });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // ── Change password ──────────────────────────────────────────────────────────
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
    setSaving(true);
    try {
      await api.patch("/users/me/password", {
        current_password: currentPw,
        new_password: newPw,
      });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setPwError(err?.response?.data?.message ?? "Failed to update password.");
    } finally {
      setSaving(false);
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm  mt-1">
            Manage your account, preferences, and privacy.
          </p>
        </div>

        <div className="flex gap-6">
          {/* ── Sidebar nav ────────────────────────────────────────────────── */}
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

          {/* ── Content ────────────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* ── Profile ── */}
            {section === "profile" && (
              <div className="space-y-8">
                {/* Avatar */}
                <div className="p-6 rounded-xl border border-[var(--border-color)] bg-card">
                  <h2 className="text-base font-semibold mb-4">Profile picture</h2>
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <UserAvatar
                        src={avatarUrl}
                        name={name}
                        size={72}
                        className="ring-2 ring-[var(--border-color)]"
                      />
                      {avatarUploading && (
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center shadow transition-colors"
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
                      <p className="text-xs  mt-0.5">{email}</p>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Change photo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-6 rounded-xl border border-[var(--border-color)] bg-card space-y-4">
                  <h2 className="text-base font-semibold">Personal info</h2>

                  <Field label="Display name">
                    <StyledInput
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </Field>

                  <Field label="Email" hint="Contact your admin to change your email.">
                    <StyledInput value={email} disabled />
                  </Field>

                  <Field label="Status" hint="Let others know what you're up to.">
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
                      className="w-full px-3 py-2 text-sm rounded-md border bg-transparent focus:outline-none focus:border-foreground/50 transition-colors placeholder: resize-none"
                    />
                  </Field>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    {saved && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Saved
                      </span>
                    )}
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center gap-2 h-8 px-4 rounded-md bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : null}
                      Save changes
                    </button>
                  </div>
                </div>

                {/* Password */}
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
                          className=" hover:text-foreground"
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
                          className=" hover:text-foreground"
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
                    {saved && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Password updated
                      </span>
                    )}
                    <button
                      onClick={handleChangePassword}
                      disabled={saving || !currentPw || !newPw || !confirmPw}
                      className="flex items-center gap-2 h-8 px-4 rounded-md bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : null}
                      Update password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Notifications ── */}
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
                      <p className="text-xs  mt-0.5">
                        {item.hint}
                      </p>
                    </div>
                    <Toggle enabled={item.value} onChange={item.set} />
                  </div>
                ))}
              </div>
            )}

            {/* ── Privacy ── */}
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
                      <p className="text-xs  mt-0.5">
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
                  <button className="h-8 px-4 rounded-md border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors">
                    Delete account
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