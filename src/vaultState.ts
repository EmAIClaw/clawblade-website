import type { AlbumState, ListeningSession, VaultState } from "./types";

const conditions = new Set<string>([
  "Mint",
  "Near Mint",
  "Very Good",
  "Good",
  "Fair",
  ""
]);

const maxAlbums = 500;
const maxSessions = 500;
const maxStringLength = 5000;
const maxCheckedTracks = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function cappedString(value: unknown, maxLength = maxStringLength) {
  if (typeof value !== "string") return undefined;
  return value.slice(0, maxLength);
}

function booleanOrUndefined(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeAlbumState(value: unknown): AlbumState {
  if (!isRecord(value)) return {};

  const rating = typeof value.rating === "number" && Number.isFinite(value.rating)
    ? Math.max(1, Math.min(5, Math.round(value.rating)))
    : undefined;
  const listenCount = typeof value.listenCount === "number" && Number.isFinite(value.listenCount)
    ? Math.max(0, Math.min(10_000, Math.floor(value.listenCount)))
    : undefined;
  const rawCondition = value.condition;
  const condition = typeof rawCondition === "string" && conditions.has(rawCondition)
    ? rawCondition as AlbumState["condition"]
    : undefined;

  const next: AlbumState = {
    owned: booleanOrUndefined(value.owned),
    wantlist: booleanOrUndefined(value.wantlist),
    listened: booleanOrUndefined(value.listened),
    rating,
    condition,
    shelfLocation: cappedString(value.shelfLocation, 200),
    notes: cappedString(value.notes),
    listenCount,
    lastListened: validIso(value.lastListened) ? value.lastListened : undefined
  };

  if (next.owned) next.wantlist = false;
  if (next.wantlist) next.owned = false;

  return Object.fromEntries(
    Object.entries(next).filter(([, item]) => item !== undefined)
  ) as AlbumState;
}

function normalizeSession(value: unknown): ListeningSession | null {
  if (!isRecord(value)) return null;
  const id = cappedString(value.id, 120);
  const albumId = cappedString(value.albumId, 180);
  const startedAt = validIso(value.startedAt) ? value.startedAt : undefined;
  if (!id || !albumId || !startedAt) return null;

  const session: ListeningSession = {
    id,
    albumId,
    startedAt,
    notes: cappedString(value.notes) ?? "",
    checkedTracks: Array.isArray(value.checkedTracks)
      ? value.checkedTracks
        .filter((item): item is string => typeof item === "string")
        .slice(0, maxCheckedTracks)
      : []
  };

  if (validIso(value.completedAt)) session.completedAt = value.completedAt;
  return session;
}

export function normalizeVaultState(value: unknown, now = new Date().toISOString()): VaultState {
  if (!isRecord(value) || !isRecord(value.albums) || !Array.isArray(value.sessions)) {
    throw new Error("Invalid vault state payload");
  }

  const albums: VaultState["albums"] = {};
  for (const [albumId, albumState] of Object.entries(value.albums).slice(0, maxAlbums)) {
    if (typeof albumId !== "string" || albumId.length > 180) continue;
    albums[albumId] = normalizeAlbumState(albumState);
  }

  const sessions = value.sessions
    .map(normalizeSession)
    .filter((item): item is ListeningSession => item !== null)
    .slice(0, maxSessions);

  return {
    albums,
    sessions,
    updatedAt: validIso(value.updatedAt) ? value.updatedAt : now
  };
}

export function safeParseVaultState(text: string): VaultState | null {
  try {
    return normalizeVaultState(JSON.parse(text));
  } catch {
    return null;
  }
}
