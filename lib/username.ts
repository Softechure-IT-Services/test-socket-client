export function suggestUsernameFromName(name: string): string {
  if (!name || typeof name !== "string") return "";

  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  const base = cleaned.length >= 3 ? cleaned : `user_${cleaned || "account"}`;
  return base.slice(0, 30).replace(/^_+|_+$/g, "") || "user";
}
