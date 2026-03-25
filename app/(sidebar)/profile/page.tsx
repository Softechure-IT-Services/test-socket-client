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

type Section = "profile" | "notifications" | "privacy";

function UserAvatar({ src, name, size = 20, className = "" }: { src?: string | null; name: string; size?: number; className?: string }) {
  const initials = name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
  const srcWithCache = src ? (src.includes("?") ? src : `${src}?t=${Date.now()}`) : null;

  if (src) {
    return (
      <img
        src={srcWithCache!}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shadow-sm border border-border ${className}`}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className={`rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center select-none shadow-sm border border-border ${className}`}
    >
      {initials}
    </span>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
        active
          ? "text-accent-foreground bg-accent shadow-sm border border-border/50"
          : "text-neutral-500 dark:text-neutral-400 hover:text-foreground hover:bg-sidebar-accent/50 border border-transparent"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-sm" />
      )}
      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${active ? "scale-110" : ""}`} />
      {label}
      {active && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 group">
      <label className="text-sm font-semibold text-foreground tracking-tight transition-colors group-focus-within:text-primary">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
    </div>
  );
}

function StyledInput({ value, onChange, placeholder, type = "text", disabled = false, rightElement }: { value: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; disabled?: boolean; rightElement?: React.ReactNode }) {
  return (
    <div className="relative group/input">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-11 px-4 pr-10 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm placeholder:text-neutral-500 dark:text-neutral-400/70 text-foreground"
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 hover:text-foreground transition-colors">
          {rightElement}
        </div>
      )}
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 rounded-full transition-all duration-300 shrink-0 shadow-inner border border-input ${
        enabled ? "bg-primary" : "bg-muted"
      }`}
      style={{ height: "26px" }}
    >
      <span
        className={`absolute top-[3px] left-[3px] rounded-full bg-white shadow-sm transition-all duration-300 ease-spring ${
          enabled ? "translate-x-6" : "translate-x-0"
        }`}
        style={{ width: "18px", height: "18px" }}
      />
    </button>
  );
}

function SavedBadge({ show }: { show: boolean }) {
  return (
    <span
      className={`flex items-center gap-1.5 text-xs font-medium text-emerald-500 transition-all duration-500 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none absolute"
      }`}
    >
      <Check className="w-4 h-4" /> Saved
    </span>
  );
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth() as any;
  const router = useRouter();

  const [section, setSection] = useState<Section>("profile");

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [status, setStatus] = useState("");
  const [bio, setBio] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  const [notifDesktop, setNotifDesktop] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [notifDMs, setNotifDMs] = useState(true);

  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);

  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get("/users/me");
      const data = res.data;
      setName(data.name ?? "");
      setAvatarUrl(data.avatar_url ?? "");
      setStatus(data.status ?? "");
      setBio(data.bio ?? "");
      setEmail(data.email ?? "");
      if (typeof updateUser === "function") {
        updateUser({ name: data.name, avatar_url: data.avatar_url, email: data.email });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);
  
  useEffect(() => {
    if (user && !name) {
      setName(user.name ?? "");
      setAvatarUrl(user.avatar_url ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

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
      setAvatarUrl(`${newUrl}?t=${Date.now()}`);

      if (typeof updateUser === "function") {
        updateUser({ avatar_url: newUrl });
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setAvatarUrl(user?.avatar_url ?? "");
    } finally {
      setAvatarUploading(false);
      URL.revokeObjectURL(localUrl);
    }
  }

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

  async function handleSaveProfile() {
    setProfileError("");
    setProfileSaving(true);
    try {
      const res = await api.patch("/users/me", { name, status, bio });
      if (typeof updateUser === "function") {
        updateUser({ name: res.data.user?.name ?? name });
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: any) {
      setProfileError(err?.response?.data?.error ?? "Failed to save profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }

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
      setPwError(err?.response?.data?.message ?? err?.response?.data?.error ?? "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirmDelete) {
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

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="relative min-h-[calc(100vh-2rem)] bg-background text-foreground overflow-y-auto rounded-3xl m-4 border border-border shadow-xl">
      <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-12 py-10 h-full flex flex-col">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Account Settings
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-xl">
            Personalize your experience, manage your active preferences, and control your privacy levels.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-10 flex-1">
          {/* ────── Sidebar Nav ────── */}
          <aside className="w-full md:w-56 shrink-0 md:pt-1">
            <nav className="flex flex-col gap-1.5 sticky top-10">
              <NavItem icon={User} label="Profile" active={section === "profile"} onClick={() => setSection("profile")} />
              <NavItem icon={Bell} label="Notifications" active={section === "notifications"} onClick={() => setSection("notifications")} />
              <NavItem icon={Shield} label="Privacy & Security" active={section === "privacy"} onClick={() => setSection("privacy")} />
              
              <div className="my-4 h-px bg-border w-full" />
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors group"
              >
                <LogOut className="w-4 h-4 shrink-0 group-hover:-translate-x-1 transition-transform" />
                Sign out
              </button>
            </nav>
          </aside>

          {/* ────── Main Content Area ────── */}
          <main className="flex-1 min-w-0 pb-16">
            {/* PROFILE SECTION */}
            {section === "profile" && (
              <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                
                {/* Banner & Avatar Card */}
                <div className="relative rounded-2xl border border-border bg-card shadow-sm overflow-hidden group/card transition-all">
                  {/* Banner using primary color */}
                  <div className="h-32 w-full bg-primary/10 relative">
                     <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent mix-blend-overlay"></div>
                  </div>
                  
                  {/* Avatar wrapper overlapping banner */}
                  <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-12">
                    <div className="relative z-10 group/avatar">
                      <UserAvatar
                        src={avatarUrl || null}
                        name={name}
                        size={96}
                        className="ring-4 ring-card bg-card"
                      />
                      {(avatarUploading || avatarRemoving) && (
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition-all">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={avatarUploading || avatarRemoving}
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-md transition-transform hover:scale-105 disabled:opacity-0 group-hover/avatar:opacity-100 sm:opacity-0 ring-2 ring-card"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>

                    <div className="flex-1 text-center sm:text-left mt-3 sm:mt-12">
                      <h2 className="text-xl font-bold text-foreground tracking-tight">{name || "Your Name"}</h2>
                      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">{email}</p>
                    </div>

                    <div className="flex items-center gap-3 mt-4 sm:mt-12">
                      {avatarUrl && (
                        <button
                          onClick={handleRemoveAvatar}
                          disabled={avatarUploading || avatarRemoving}
                          className="px-4 py-2 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      )}
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={avatarUploading || avatarRemoving}
                        className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                       <Camera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Upload photo</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personal Info Edit Card */}
                <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-5 relative overflow-hidden">
                  <div className="mb-2 relative z-10">
                    <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Update your display name and what you share with the community.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                    <Field label="Display Name">
                      <StyledInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
                    </Field>
                    
                    <Field label="Current Status" hint="What's on your mind?">
                      <StyledInput value={status} onChange={(e) => setStatus(e.target.value)} placeholder="e.g. In a meeting 📞" />
                    </Field>
                  </div>

                  <div className="relative z-10">
                    <Field label="About Me" hint="A brief description of who you are and what you do.">
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Hello there, I just joined..."
                        rows={3}
                        className="w-full p-3 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-all placeholder:text-neutral-500 dark:text-neutral-400/70 resize-none text-foreground"
                      />
                    </Field>
                  </div>

                  {profileError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm font-medium">
                      <X className="w-4 h-4" /> {profileError}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border mt-4">
                    <div className="h-6">
                       <SavedBadge show={profileSaved} />
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={profileSaving}
                      className="flex items-center justify-center gap-2 h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors disabled:opacity-60"
                    >
                      {profileSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PRIVACY & SECURITY SECTION */}
            {section === "privacy" && (
              <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                 
                 {/* Password Card */}
                 <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col relative overflow-hidden">
                  <div className="mb-5 relative z-10">
                    <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Keep your account secure by updating your password regularly.</p>
                  </div>

                  <div className="space-y-5 max-w-md relative z-10">
                    <Field label="Current Password">
                      <StyledInput
                        type={showCurrent ? "text" : "password"}
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        placeholder="••••••••"
                        rightElement={<button aria-label="Toggle visibility" onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
                      />
                    </Field>

                    <div className="h-px w-full bg-border my-2"></div>

                    <Field label="New Password">
                      <StyledInput
                        type={showNew ? "text" : "password"}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="8+ characters"
                        rightElement={<button aria-label="Toggle visibility" onClick={() => setShowNew(!showNew)}>{showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
                      />
                    </Field>

                    <Field label="Confirm Password">
                      <StyledInput
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        placeholder="Repeat your new password"
                      />
                    </Field>

                    {pwError && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm font-medium">
                        <X className="w-4 h-4" /> {pwError}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                       <div className="h-6">
                         <SavedBadge show={pwSaved} />
                       </div>
                      <button
                        onClick={handleChangePassword}
                        disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                        className="flex items-center gap-2 h-10 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 text-sm font-medium transition-colors"
                      >
                        {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>

                {/* Privacy Preferences Card */}
                <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                   <div className="mb-5">
                    <h2 className="text-lg font-semibold text-foreground">Privacy Controls</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Manage what activities are visible to your contacts in the network.</p>
                  </div>
                  <div className="space-y-4">
                     {[
                        { label: "Show Online Status", hint: "Let others see a green dot when you're active.", value: showOnlineStatus, set: setShowOnlineStatus },
                        { label: "Share Read Receipts", hint: "Let people know when you've viewed their direct messages.", value: showReadReceipts, set: setShowReadReceipts },
                     ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.hint}</p>
                        </div>
                        <Toggle enabled={item.value} onChange={item.set} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-6 rounded-2xl border border-destructive/30 bg-destructive/5 shadow-inner">
                  <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
                  <p className="text-sm text-destructive/80 mb-5">
                    Once you delete your account, there is no going back. All your spaces, messages, and uploaded files will be permanently erased. Please be certain.
                  </p>
                  
                  <div className="flex items-center gap-4">
                     <button
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount}
                        className="h-10 px-5 rounded-xl border-2 border-destructive text-destructive text-sm font-medium hover:bg-destructive hover:text-destructive-foreground hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {deletingAccount && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmDelete ? "I'm sure, delete my account" : "Delete Account"}
                      </button>
                      {confirmDelete && (
                        <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                          Clicking again is irreversible!
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS SECTION */}
            {section === "notifications" && (
              <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                 <div className="p-6 rounded-2xl border border-border bg-card shadow-sm relative overflow-hidden">
                  <div className="mb-5 relative z-10">
                    <h2 className="text-lg font-semibold text-foreground">Alert Preferences</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Choose how and when you want to be notified about activity.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    {[
                      { id: "desktop", label: "Desktop Notifications", hint: "Show native OS alerts", value: notifDesktop, set: setNotifDesktop, icon: "💻" },
                      { id: "sound", label: "Play Sounds", hint: "Chime on new messages", value: notifSound, set: setNotifSound, icon: "🎵" },
                      { id: "mentions", label: "Mentions", hint: "When somebody tags you", value: notifMentions, set: setNotifMentions, icon: "@" },
                      { id: "dms", label: "Direct Messages", hint: "1-on-1 private messages", value: notifDMs, set: setNotifDMs, icon: "✉️" },
                    ].map((item) => (
                      <div key={item.id} className="p-4 rounded-xl border border-border bg-background transition-colors flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-lg shadow-sm border border-border/50">
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.hint}</p>
                          </div>
                        </div>
                        <Toggle enabled={item.value} onChange={item.set} />
                      </div>
                    ))}
                  </div>
                 </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Basic Keyframes inserted via inline styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}} />
    </div>
  );
}