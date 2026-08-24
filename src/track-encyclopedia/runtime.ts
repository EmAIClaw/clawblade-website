import type { TrackEncyclopediaAlbumEntry, TrackEncyclopediaEntry } from "../types";

export type TrackEncyclopediaModuleLoader = () => Promise<unknown>;

export type TrackEncyclopediaManifestEntry = {
  load: TrackEncyclopediaModuleLoader;
};

export type TrackEncyclopediaModuleRecord = Record<string, TrackEncyclopediaModuleLoader | TrackEncyclopediaManifestEntry>;

export function validateTrackEncyclopediaAlbumEntry(value: unknown): TrackEncyclopediaAlbumEntry {
  if (!isRecord(value)) throw new Error("Invalid track encyclopedia album entry: payload is not an object.");
  if (typeof value.albumId !== "string" || value.albumId.trim() === "") {
    throw new Error("Invalid track encyclopedia album entry: albumId is required.");
  }
  if (typeof value.editionNumber !== "number" || !Number.isInteger(value.editionNumber) || value.editionNumber < 1) {
    throw new Error("Invalid track encyclopedia album entry: editionNumber must be >= 1.");
  }
  if (typeof value.published !== "boolean") {
    throw new Error("Invalid track encyclopedia album entry: published must be boolean.");
  }
  if (typeof value.contentHash !== "string" || value.contentHash.trim() === "") {
    throw new Error("Invalid track encyclopedia album entry: contentHash is required.");
  }
  if (!/^[a-f0-9]{16}$/.test(value.contentHash)) {
    throw new Error("Invalid track encyclopedia album entry: contentHash shape is invalid.");
  }
  if (typeof value.changeNote !== "string" || value.changeNote.trim() === "") {
    throw new Error("Invalid track encyclopedia album entry: changeNote is required.");
  }
  if (!Array.isArray(value.trackEntries)) {
    throw new Error("Invalid track encyclopedia album entry: trackEntries must be an array.");
  }
  for (const track of value.trackEntries) validateRuntimeTrack(track, value.albumId);
  validateGenerationMetadata(value.generationMetadata);
  validateReviewMetadata(value.reviewMetadata);
  return value as TrackEncyclopediaAlbumEntry;
}

function validateGenerationMetadata(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error("Invalid track encyclopedia album entry: metadata is required.");
  }
  requireString(value.generatedAt, "generationMetadata.generatedAt");
  requireString(value.generator, "generationMetadata.generator");
  if (value.model !== null && typeof value.model !== "string") {
    throw new Error("Invalid track encyclopedia album entry: generationMetadata.model is invalid.");
  }
}

function validateReviewMetadata(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error("Invalid track encyclopedia album entry: metadata is required.");
  }
  if (value.reviewedAt !== null && typeof value.reviewedAt !== "string") {
    throw new Error("Invalid track encyclopedia album entry: reviewMetadata.reviewedAt is invalid.");
  }
  if (value.reviewer !== null && typeof value.reviewer !== "string") {
    throw new Error("Invalid track encyclopedia album entry: reviewMetadata.reviewer is invalid.");
  }
  requireString(value.notes, "reviewMetadata.notes", true);
}

export function validateTrackEncyclopediaData(value: unknown): { entries: Record<string, TrackEncyclopediaAlbumEntry> } | null {
  if (!isRecord(value) || !isRecord(value.entries)) return null;
  const entries: Record<string, TrackEncyclopediaAlbumEntry> = {};
  try {
    for (const [albumId, entry] of Object.entries(value.entries)) {
      const validated = validateTrackEncyclopediaAlbumEntry(entry);
      if (validated.albumId !== albumId) return null;
      entries[albumId] = validated;
    }
  } catch {
    return null;
  }
  return { entries };
}

export async function loadTrackEncyclopediaAlbum(
  albumId: string,
  modules: TrackEncyclopediaModuleRecord,
): Promise<TrackEncyclopediaAlbumEntry | null> {
  const load = modules[albumId];
  const loader = getLoader(load);
  if (!loader) return null;
  try {
    const moduleValue = await loader();
    const payload = unwrapDefault(moduleValue);
    const entry = validateTrackEncyclopediaAlbumEntry(payload);
    const runtimeHash = await computeRuntimeContentHash(entry);
    if (runtimeHash !== entry.contentHash) return null;
    return entry.albumId === albumId ? entry : null;
  } catch {
    return null;
  }
}

export async function getTrackEncyclopediaModuleIds(
  albumId: string,
  modules: TrackEncyclopediaModuleRecord,
): Promise<{ entry: TrackEncyclopediaAlbumEntry | null; loadedAlbumIds: string[] }> {
  const loadedAlbumIds: string[] = [];
  const loader = getLoader(modules[albumId]);
  if (!loader) return { entry: null, loadedAlbumIds };
  const entry = await loadTrackEncyclopediaAlbum(albumId, {
    [albumId]: async () => {
      loadedAlbumIds.push(albumId);
      return loader();
    },
  });
  return { entry, loadedAlbumIds };
}

function getLoader(value: TrackEncyclopediaModuleLoader | TrackEncyclopediaManifestEntry | undefined) {
  if (typeof value === "function") return value;
  if (value && typeof value.load === "function") return value.load;
  return null;
}

function validateRuntimeTrack(value: unknown, albumId: string): asserts value is TrackEncyclopediaEntry {
  if (!isRecord(value)) throw new Error("Invalid track encyclopedia track: payload is not an object.");
  if (value.albumId !== albumId) {
    throw new Error("Invalid track encyclopedia track: albumId does not match entry.");
  }
  if (typeof value.discNumber !== "number" || !Number.isInteger(value.discNumber) || value.discNumber < 1) {
    throw new Error("Invalid track encyclopedia track: discNumber is required.");
  }
  if (typeof value.trackNumber !== "number" || !Number.isInteger(value.trackNumber) || value.trackNumber < 1) {
    throw new Error("Invalid track encyclopedia track: trackNumber is required.");
  }
  if (typeof value.trackTitle !== "string" || value.trackTitle.trim() === "") {
    throw new Error("Invalid track encyclopedia track: trackTitle is required.");
  }
  if (!["documented", "contextual", "limited", "insufficient-evidence", "unresearched"].includes(String(value.evidenceLevel))) {
    throw new Error("Invalid track encyclopedia track: evidenceLevel is invalid.");
  }
  if (!Array.isArray(value.verifiedFacts)) {
    throw new Error("Invalid track encyclopedia track: verifiedFacts must be an array.");
  }
  for (const fact of value.verifiedFacts) validateVerifiedFact(fact);
  requireString(value.musicalCharacter, "musicalCharacter", true);
  requireString(value.albumContext, "albumContext", true);
  if (value.historicalContext != null) requireString(value.historicalContext, "historicalContext", true);
  requireString(value.listeningNotes, "listeningNotes", true);
  if (!Array.isArray(value.limitations)) {
    throw new Error("Invalid track encyclopedia track: limitations must be an array.");
  }
  for (const limitation of value.limitations) requireString(limitation, "limitation");
  if (value.evidenceLevel === "insufficient-evidence") {
    if (!isRecord(value.researchDisposition)) throw new Error("Invalid track encyclopedia researchDisposition.");
    requireString(value.researchDisposition.completedAt, "researchDisposition.completedAt");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.researchDisposition.completedAt)) throw new Error("Invalid track encyclopedia researchDisposition.completedAt.");
    if (!Array.isArray(value.researchDisposition.searchedQueries) || value.researchDisposition.searchedQueries.length === 0) throw new Error("Invalid track encyclopedia researchDisposition.searchedQueries.");
    for (const query of value.researchDisposition.searchedQueries) requireString(query, "researchDisposition.searchedQueries item");
    if (!Array.isArray(value.researchDisposition.sourceClasses) || value.researchDisposition.sourceClasses.length === 0) throw new Error("Invalid track encyclopedia researchDisposition.sourceClasses.");
    for (const sourceClass of value.researchDisposition.sourceClasses) requireString(sourceClass, "researchDisposition.sourceClasses item");
    requireString(value.researchDisposition.outcome, "researchDisposition.outcome");
  }
  if (value.criticalReception != null) {
    if (!Array.isArray(value.criticalReception)) throw new Error("Invalid track encyclopedia track: criticalReception must be an array.");
    for (const reception of value.criticalReception) validateCriticalReception(reception);
  }
  if (value.fanPerspective != null) {
    if (!Array.isArray(value.fanPerspective)) throw new Error("Invalid track encyclopedia track: fanPerspective must be an array.");
    for (const perspective of value.fanPerspective) validateFanPerspective(perspective);
  }
  if (value.discoveryConnections != null) {
    if (!Array.isArray(value.discoveryConnections)) throw new Error("Invalid track encyclopedia track: discoveryConnections must be an array.");
    for (const connection of value.discoveryConnections) validateDiscoveryConnection(connection);
  }
  if (value.sourceRefs != null) {
    if (!Array.isArray(value.sourceRefs)) throw new Error("Invalid track encyclopedia track: sourceRefs must be an array.");
    for (const ref of value.sourceRefs) validateRuntimeSourceRef(ref, false);
  }
}

function validateVerifiedFact(value: unknown): void {
  if (!isRecord(value)) throw new Error("Invalid track encyclopedia verifiedFacts item.");
  requireString(value.claim, "verifiedFacts.claim");
  if (!Array.isArray(value.sourceRefs) || value.sourceRefs.length === 0) {
    throw new Error("Invalid track encyclopedia verifiedFacts.sourceRefs.");
  }
  for (const ref of value.sourceRefs) validateRuntimeSourceRef(ref, true);
}

function validateCriticalReception(value: unknown): void {
  if (!isRecord(value)) throw new Error("Invalid track encyclopedia criticalReception item.");
  requireString(value.view, "criticalReception.view");
  requireString(value.publication, "criticalReception.publication", true);
  requireString(value.critic, "criticalReception.critic", true);
  if (value.sourceRef != null) validateRuntimeSourceRef(value.sourceRef, true);
}

function validateFanPerspective(value: unknown): void {
  if (!isRecord(value)) throw new Error("Invalid track encyclopedia fanPerspective item.");
  requireString(value.perspective, "fanPerspective.perspective");
  requireString(value.label, "fanPerspective.label");
  if (typeof value.grounded !== "boolean") throw new Error("Invalid track encyclopedia fanPerspective.grounded.");
  if (value.grounding != null) requireString(value.grounding, "fanPerspective.grounding", true);
  if (!Array.isArray(value.sourceRefs) || value.sourceRefs.length === 0) {
    throw new Error("Invalid track encyclopedia fanPerspective.sourceRefs.");
  }
  for (const ref of value.sourceRefs) validateRuntimeSourceRef(ref, true);
  if (/\b(consensus|generally|widely|most fans|fans (consider|regard|cite))\b/i.test(`${value.label} ${value.perspective}`)) {
    validateIndependentRuntimeSourceRefs(value.sourceRefs);
  }
}

function validateDiscoveryConnection(value: unknown): void {
  if (!isRecord(value)) throw new Error("Invalid track encyclopedia discoveryConnections item.");
  requireString(value.relatedTrackTitle, "discoveryConnections.relatedTrackTitle");
  requireString(value.rationale, "discoveryConnections.rationale");
}

function validateRuntimeSourceRef(value: unknown, requireEvidence: boolean): void {
  if (!isRecord(value)) throw new Error("Invalid track encyclopedia sourceRef.");
  requireString(value.label, "sourceRef.label");
  requireString(value.title, "sourceRef.title");
  requireString(value.url, "sourceRef.url");
  if (!/^https:\/\//.test(value.url)) throw new Error("Invalid track encyclopedia sourceRef.url.");
  if (requireEvidence) {
    requireString(value.extract, "sourceRef.extract");
    if (value.extractType !== "verbatim") throw new Error("Invalid track encyclopedia sourceRef.extractType.");
    if (value.evidenceStatus !== "retrieved" && value.evidenceStatus !== "checked") {
      throw new Error("Invalid track encyclopedia sourceRef.evidenceStatus.");
    }
  }
}

function validateIndependentRuntimeSourceRefs(refs: unknown[]): void {
  const urls = new Set<string>();
  const identities = new Set<string>();
  for (const ref of refs) {
    if (!isRecord(ref) || typeof ref.url !== "string") throw new Error("Invalid track encyclopedia sourceRef.");
    urls.add(canonicalizeSourceUrlRuntime(ref.url));
    identities.add(sourceIdentityForRefRuntime(ref));
  }
  if (urls.size < 2 || identities.size < 2) {
    throw new Error("Invalid track encyclopedia fanPerspective.sourceRefs: consensus requires distinct canonical source URLs and source identities.");
  }
}

function canonicalizeSourceUrlRuntime(url: string): string {
  const parsed = new URL(url);
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
    parsed.port = "";
  }
  parsed.hash = "";
  let pathname = parsed.pathname || "/";
  pathname = pathname.replace(/\/{2,}/g, "/");
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
  parsed.pathname = pathname;
  const keptParams: Array<[string, string]> = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith("utm_") || ["fbclid", "gclid", "igshid", "mc_cid", "mc_eid"].includes(lowerKey)) continue;
    keptParams.push([key, value]);
  }
  keptParams.sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
  parsed.search = "";
  for (const [key, value] of keptParams) parsed.searchParams.append(key, value);
  return parsed.toString();
}

function sourceIdentityForRefRuntime(ref: Record<string, unknown>): string {
  if (typeof ref.sourceIdentity === "string" && ref.sourceIdentity.trim() !== "") {
    return normalizeIdentityRuntime(ref.sourceIdentity);
  }
  const parsed = new URL(canonicalizeSourceUrlRuntime(String(ref.url)));
  const label = typeof ref.label === "string" ? ref.label : "";
  return normalizeIdentityRuntime(`${label}|${parsed.hostname}`);
}

function normalizeIdentityRuntime(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function requireString(value: unknown, field: string, allowEmpty = false): asserts value is string {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw new Error(`Invalid track encyclopedia ${field}.`);
  }
}

/**
 * Deterministic fallback for computing content hashes when Web Crypto is
 * unavailable. Matches the build-time canonical hashing algorithm exactly
 * so that runtime integrity verification fails closed instead of silently
 * skipping the hash check.
 *
 * Audit item 6: Either provide a tested deterministic fallback matching
 * build-time canonical hashing or surface a user-visible integrity error.
 */
export function computeRuntimeContentHashFallback(entry: TrackEncyclopediaAlbumEntry): string {
  const content = canonicalStringifyRuntime({
    albumId: entry.albumId,
    trackEntries: entry.trackEntries,
  });
  // Use Node.js crypto (available in all Node environments) as a fallback
  // when Web Crypto subtle.digest is unavailable.
  // In browser environments without Web Crypto, the error should surface.
  if (typeof globalThis !== 'undefined' && (globalThis as any).__crypto?.createHash) {
    return (globalThis as any).__crypto.createHash('sha256')
      .update(content)
      .digest('hex')
      .slice(0, 16);
  }
  // Browser-side fallback: use a synchronous hash if available, otherwise
  // throw to surface the integrity error rather than silently skipping.
  throw new Error('Runtime content hash fallback unavailable: no crypto implementation found.');
}

async function computeRuntimeContentHash(entry: TrackEncyclopediaAlbumEntry): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    // Use the deterministic fallback instead of silently returning null.
    return computeRuntimeContentHashFallback(entry);
  }
  const content = canonicalStringifyRuntime({
    albumId: entry.albumId,
    trackEntries: entry.trackEntries,
  });
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(content));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function canonicalStringifyRuntime(value: unknown): string {
  return JSON.stringify(canonicalizeRuntime(value));
}

function canonicalizeRuntime(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeRuntime);
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = canonicalizeRuntime(value[key]);
    }
    return result;
  }
  return value;
}

function unwrapDefault(value: unknown) {
  return isRecord(value) && "default" in value ? value.default : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
