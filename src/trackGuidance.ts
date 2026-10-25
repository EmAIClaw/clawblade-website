// trackGuidance.ts — Shared guidance trust/identity selector for Listen and Focus.
//
// Reader policy: only versioned research supplies track commentary. Legacy
// prose is retained in the source data but never returned, even when it has a
// source URL or a unique title. Neither establishes claim-level review.
// Loading/error states remain explicit; missing research gets an honest gap.
// Legacy input/types and exact-title helpers remain compatible with existing
// callers, but editorial-unqualified/ambiguous are no longer emitted.

import type {
  EvidenceLevel,
  TrackEncyclopediaEntry,
  EncyclopediaSource,
} from "./types";

// ─── Types ───────────────────────────────────────────────────────

export type LegacyTrackGuide = {
  trackTitle: string;
  guide: string;
  focus: string;
  source?: EncyclopediaSource | null;
};

export type CatalogTrack = {
  discNumber: number;
  trackNumber: number;
  title: string;
  durationMs: number | null;
};

export type ResearchLoadStatus =
  | "loading"
  | "loaded"
  | "missing"
  | "error";

export type TrackGuidanceKind =
  | "loading"
  | "error"
  | "missing"
  | "documented"
  | "insufficient-evidence"
  | "contextual"
  | "limited"
  | "unresearched"
  | "editorial-unqualified"
  | "editorial-ambiguous";

export type TrackGuidance =
  | { kind: "loading"; leadText: string; legacyGuide: LegacyTrackGuide | undefined; legacySuppressed: boolean }
  | { kind: "error"; leadText: string; message: string; legacyGuide: LegacyTrackGuide | undefined; legacySuppressed: boolean }
  | { kind: "missing"; leadText: string; legacyGuide: LegacyTrackGuide | undefined; legacySuppressed: boolean }
  | { kind: "documented"; leadText: string; entry: TrackEncyclopediaEntry; legacyGuide: LegacyTrackGuide | undefined; legacySuppressed: boolean; editorialLabel?: string }
  | { kind: "insufficient-evidence"; leadText: string; entry: TrackEncyclopediaEntry; legacyGuide: LegacyTrackGuide | undefined; legacySuppressed: boolean; editorialLabel?: string }
  | { kind: "contextual"; leadText: string; entry: TrackEncyclopediaEntry; legacyGuide: LegacyTrackGuide | undefined; legacySuppressed: boolean; editorialLabel?: string }
  | { kind: "limited"; leadText: string; entry: TrackEncyclopediaEntry; legacyGuide: LegacyTrackGuide | undefined; legacySuppressed: boolean; editorialLabel?: string }
  | { kind: "unresearched"; leadText: string; entry: TrackEncyclopediaEntry; legacyGuide: LegacyTrackGuide | undefined; legacySuppressed: boolean; editorialLabel?: string }
  | { kind: "editorial-unqualified"; leadText: string; legacyGuide: LegacyTrackGuide; legacySuppressed: false; editorialLabel: string }
  | { kind: "editorial-ambiguous"; leadText: string; legacyGuide: undefined; legacySuppressed: true; editorialLabel: string };

export type ResolveTrackGuidanceInput = {
  researchLoadStatus: ResearchLoadStatus;
  researchEntry: TrackEncyclopediaEntry | undefined;
  legacyGuide: LegacyTrackGuide | undefined;
  titleAmbiguous: boolean;
  researchErrorMessage?: string;
};

// ─── Constants ───────────────────────────────────────────────────

const DEFAULT_LISTENING_LEAD =
  "Listen for the arrangement, dynamics, and placement of this track inside the album arc.";
const LOADING_LEAD = "Loading track research…";
const ERROR_LEAD = "Track research could not be loaded.";
const MISSING_LEAD = "Track commentary not yet researched.";
const AMBIGUOUS_LEAD =
  "Editorial note omitted: track title is not uniquely identifiable in this edition.";
const EDITORIAL_LABEL = "Editorial listening note";

const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  documented: "Documented",
  contextual: "Contextual",
  limited: "Limited",
  "insufficient-evidence": "Research complete — insufficient evidence",
  unresearched: "Unresearched",
};

// ─── detectTitleAmbiguity ────────────────────────────────────────

/**
 * Detect whether a track title is ambiguous for legacy title-only matching.
 * Returns true if the title appears on multiple catalog tracks OR multiple
 * legacy guides.  Uses exact string comparison — no fuzzy matching, no
 * borrowing across edition.
 */
export function detectTitleAmbiguity(
  title: string,
  catalogTracks: CatalogTrack[],
  legacyGuides: LegacyTrackGuide[],
): boolean {
  const catalogCount = catalogTracks.filter((t) => t.title === title).length;
  if (catalogCount > 1) return true;
  const guideCount = legacyGuides.filter((g) => g.trackTitle === title).length;
  if (guideCount > 1) return true;
  return false;
}

// ─── resolveTrackGuidance ────────────────────────────────────────

/** Shared reader selector: async state → versioned entry → research gap. */
export function resolveTrackGuidance(
  input: ResolveTrackGuidanceInput,
): TrackGuidance {
  const {
    researchLoadStatus,
    researchEntry,
    researchErrorMessage,
  } = input;

  // Legacy guides have no claim-level review contract. A source URL or an
  // unambiguous title does not make their prose safe to display. Keep source
  // data intact, but exclude it from every reader-facing state.
  const effectiveLegacyGuide = undefined;
  const legacySuppressed = true;

  // ── Async states ──
  if (researchLoadStatus === "loading") {
    return {
      kind: "loading",
      leadText: LOADING_LEAD,
      legacyGuide: effectiveLegacyGuide,
      legacySuppressed,
    };
  }

  if (researchLoadStatus === "error") {
    return {
      kind: "error",
      leadText: ERROR_LEAD,
      message: researchErrorMessage ?? "Track research could not be loaded.",
      legacyGuide: effectiveLegacyGuide,
      legacySuppressed,
    };
  }

  // ── Versioned research entry exists (loaded state with entry) ──
  if (researchEntry) {
    return resolveVersionedEntry(researchEntry, effectiveLegacyGuide, legacySuppressed);
  }

  // No reviewed track entry: show an honest gap instead of legacy prose.

  return {
    kind: "missing",
    leadText: MISSING_LEAD,
    legacyGuide: undefined,
    legacySuppressed,
  };
}

function resolveVersionedEntry(
  entry: TrackEncyclopediaEntry,
  legacyGuide: LegacyTrackGuide | undefined,
  legacySuppressed: boolean,
): TrackGuidance {
  const leadText = versionedLeadText(entry);
  const editorialLabel = legacyGuide ? EDITORIAL_LABEL : undefined;

  // Versioned evidence takes precedence and its lead text is unchanged
  // regardless of ambiguity.  When titleAmbiguous, the caller has already
  // stripped legacyGuide (undefined) and set legacySuppressed true — the
  // versioned entry stands alone without an unqualified legacy secondary.
  switch (entry.evidenceLevel) {
    case "documented":
      return {
        kind: "documented",
        leadText,
        entry,
        legacyGuide,
        legacySuppressed,
        editorialLabel,
      };
    case "insufficient-evidence":
      return {
        kind: "insufficient-evidence",
        leadText,
        entry,
        legacyGuide,
        legacySuppressed,
        editorialLabel,
      };
    case "contextual":
      return {
        kind: "contextual",
        leadText,
        entry,
        legacyGuide,
        legacySuppressed,
        editorialLabel,
      };
    case "limited":
      return {
        kind: "limited",
        leadText,
        entry,
        legacyGuide,
        legacySuppressed,
        editorialLabel,
      };
    case "unresearched":
      // Unresearched is a versioned state ("we looked, there's nothing
      // versioned for this track") — the kind is still "unresearched".
      return {
        kind: "unresearched",
        leadText: leadText || MISSING_LEAD,
        entry,
        legacyGuide,
        legacySuppressed,
        editorialLabel,
      };
    default:
      // Should never happen with validated data, but handle defensively.
      return {
        kind: "unresearched",
        leadText: leadText || MISSING_LEAD,
        entry,
        legacyGuide,
        legacySuppressed,
        editorialLabel,
      };
  }
}

function versionedLeadText(entry: TrackEncyclopediaEntry): string {
  if (entry.evidenceLevel === "unresearched") return MISSING_LEAD;
  // Priority: first verified fact claim → listening notes → first limitation
  // → evidence label
  if (entry.verifiedFacts.length > 0 && entry.verifiedFacts[0].claim) {
    return entry.verifiedFacts[0].claim;
  }
  if (entry.listeningNotes) {
    return entry.listeningNotes;
  }
  if (entry.limitations.length > 0) {
    return entry.limitations[0];
  }
  return EVIDENCE_LABELS[entry.evidenceLevel];
}

// ─── Helper for building ambiguity map ───────────────────────────

/**
 * Pre-compute a Set of ambiguous titles for a given album's catalog tracks
 * and legacy guides.  Returns a Set of title strings that are ambiguous.
 */
export function buildAmbiguousTitleSet(
  catalogTracks: CatalogTrack[],
  legacyGuides: LegacyTrackGuide[],
): Set<string> {
  const ambiguous = new Set<string>();

  // Count catalog track titles
  const catalogCounts = new Map<string, number>();
  for (const t of catalogTracks) {
    catalogCounts.set(t.title, (catalogCounts.get(t.title) ?? 0) + 1);
  }
  for (const [title, count] of catalogCounts) {
    if (count > 1) ambiguous.add(title);
  }

  // Count legacy guide titles
  const guideCounts = new Map<string, number>();
  for (const g of legacyGuides) {
    guideCounts.set(g.trackTitle, (guideCounts.get(g.trackTitle) ?? 0) + 1);
  }
  for (const [title, count] of guideCounts) {
    if (count > 1) ambiguous.add(title);
  }

  return ambiguous;
}

// ─── Exports for UI labels ───────────────────────────────────────

export { EVIDENCE_LABELS as TRACK_GUIDANCE_EVIDENCE_LABELS, EDITORIAL_LABEL as TRACK_GUIDANCE_EDITORIAL_LABEL, DEFAULT_LISTENING_LEAD as TRACK_GUIDANCE_DEFAULT_LISTENING_LEAD };