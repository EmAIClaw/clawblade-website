// listeningGuidance.ts — Pilot listening-guidance loader for AlbumVault.
//
// Pure, synchronous lookup of pilot listening exercises by exact catalog
// identity (albumId / discNumber / trackNumber / trackTitle).  Returns
// undefined when no match exists — no fuzzy matching, no cross-edition
// borrowing.  The data lives in a separately versioned JSON file outside the
// immutable track-encyclopedia research objects.
//
// Bound provenance: each entry carries editionNumber + contentHash from the
// manifest.  If a future edition changes either field the guidance must be
// re-validated; this loader does NOT silently reattach.

import guidanceData from "./data/listening-guidance.generated.json" with { type: "json" };

// ─── Types ───────────────────────────────────────────────────────

export type ListeningGuidanceVocabulary = {
  term: string;
  definition: string;
};

export type ListeningGuidanceEntry = {
  /** Exact catalog album identity (e.g. "001-marvin-gaye-what-s-going-on-fd00dde9"). */
  albumId: string;
  discNumber: number;
  trackNumber: number;
  /** Canonical catalog track title — must match catalog.generated.json exactly. */
  trackTitle: string;
  /** Manifest-selected edition number for the album's current research object. */
  editionNumber: number;
  /** Manifest contentHash for provenance binding. */
  contentHash: string;
  /** Optional reference to an existing verifiedFact claimId in versioned research. */
  claimId?: string;
  /** One open listening question — one sentence, no presupposed answer. */
  question: string;
  /** Optional deeper-listen follow-up question. */
  followUp?: string;
  /** Optional beginner vocabulary term + plain-language definition. */
  vocabulary?: ListeningGuidanceVocabulary;
  /** Short label describing the listening attention this exercise invites. */
  explorationLens: string;
  /** Editorial entry-point flag — at most 2 true per album. */
  isEntryPoint: boolean;
};

type GuidanceData = {
  entries: ListeningGuidanceEntry[];
};

const data = guidanceData as GuidanceData;

// ─── Loader ──────────────────────────────────────────────────────

/**
 * Load pilot listening guidance for an exact track identity.
 *
 * Returns the matching entry, or `undefined` when no match exists.
 * No fuzzy matching, no cross-edition borrowing, no title normalization.
 */
export function loadListeningGuidance(
  albumId: string,
  discNumber: number,
  trackNumber: number,
  trackTitle: string,
): ListeningGuidanceEntry | undefined {
  return data.entries.find(
    (e) =>
      e.albumId === albumId &&
      e.discNumber === discNumber &&
      e.trackNumber === trackNumber &&
      e.trackTitle === trackTitle,
  );
}

/**
 * Load all pilot guidance entries for a given album.
 * Returns an array (possibly empty) in catalog track order.
 */
export function loadAlbumGuidance(albumId: string): ListeningGuidanceEntry[] {
  return data.entries
    .filter((e) => e.albumId === albumId)
    .sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber);
}