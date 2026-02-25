type PresentableUser = {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  id: string;
};

function normalize(value?: string | null) {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : "";
}

function fnv1a32(input: string): number {
  // Deterministic, SSR-safe 32-bit hash.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const COLOR_PALETTE = [
  "bg-sky-100 text-sky-900",
  "bg-blue-100 text-blue-900",
  "bg-indigo-100 text-indigo-900",
  "bg-violet-100 text-violet-900",
  "bg-purple-100 text-purple-900",
  "bg-fuchsia-100 text-fuchsia-900",
  "bg-pink-100 text-pink-900",
  "bg-rose-100 text-rose-900",
  "bg-red-100 text-red-900",
  "bg-orange-100 text-orange-900",
  "bg-amber-100 text-amber-900",
  "bg-yellow-100 text-yellow-900",
  "bg-lime-100 text-lime-900",
  "bg-green-100 text-green-900",
  "bg-emerald-100 text-emerald-900",
  "bg-teal-100 text-teal-900",
  "bg-cyan-100 text-cyan-900",
  "bg-slate-100 text-slate-900",
  "bg-zinc-100 text-zinc-900",
  "bg-neutral-100 text-neutral-900",
  "bg-stone-100 text-stone-900",
] as const;

export function getShortId(userId: string): string {
  const hash = fnv1a32(userId);
  const base36 = hash.toString(36);
  return base36.padStart(6, "0").slice(0, 6).toUpperCase();
}

export function getUserAvatarUrl(userId: string): string {
  // DiceBear is deterministic via seed. Using PNG keeps this compatible with Next <Image>
  // without needing SVG-specific settings.
  return `https://api.dicebear.com/7.x/personas/png?seed=${encodeURIComponent(
    userId,
  )}&size=128`;
}

export function getDeterministicColor(userId: string): string {
  const hash = fnv1a32(userId);
  return COLOR_PALETTE[hash % COLOR_PALETTE.length] ?? "bg-muted text-foreground";
}

export function getUserDisplayName(user: PresentableUser): string {
  const firstName = normalize(user.firstName);
  const lastName = normalize(user.lastName);
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(" ");
  }

  const username = normalize(user.username);
  if (
    username &&
    username.toLowerCase() !== "unknown" &&
    username.toLowerCase() !== "anonymous"
  ) {
    return username;
  }

  const email = normalize(user.email);
  if (email) {
    const local = normalize(email.split("@")[0] ?? "");
    if (local) return local;
  }

  return `User ${getShortId(user.id)}`;
}
