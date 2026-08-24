export type Track = {
  discNumber: number;
  trackNumber: number;
  title: string;
  durationMs: number | null;
  previewUrl?: string | null;
};

export type Album = {
  id: string;
  rank: number;
  title: string;
  artist: string;
  year: number;
  genre: string | null;
  appleCollectionId: number | null;
  appleCollectionUrl: string | null;
  appleArtworkUrl: string | null;
  coverSource?: "apple" | "google-custom-search" | "musicbrainz-cover-art-archive" | null;
  coverSourceUrl?: string | null;
  musicBrainzReleaseGroupId?: string;
  coverPath: string;
  tracks: Track[];
};

export type EncyclopediaEntry = {
  albumId: string;
  artistInfo?: {
    summary: string;
    source: EncyclopediaSource;
  } | null;
  albumInfo?: {
    summary: string;
    source: EncyclopediaSource;
  } | null;
  context: string;
  relevance: string;
  listeningNotes: string[];
  trackGuide: Array<{
    trackTitle: string;
    guide: string;
    focus: string;
    source?: EncyclopediaSource | null;
  }>;
  themes: string[];
  sources?: EncyclopediaSource[];
};

export type EncyclopediaSource = {
  label: string;
  title: string;
  url: string;
  extract?: string;
  summary?: string;
  description?: string | null;
  score?: number;
};

export type AlbumState = {
  owned?: boolean;
  wantlist?: boolean;
  listened?: boolean;
  rating?: number;
  condition?: "Mint" | "Near Mint" | "Very Good" | "Good" | "Fair" | "";
  shelfLocation?: string;
  editionNote?: string;
  notes?: string;
  whyItMatters?: string;
  listenCount?: number;
  lastListened?: string;
};

export type ListeningSession = {
  id: string;
  albumId: string;
  startedAt: string;
  completedAt?: string;
  notes: string;
  checkedTracks: string[];
};

export type VaultState = {
  albums: Record<string, AlbumState>;
  sessions: ListeningSession[];
  updatedAt: string;
};

// ─── Versioned Track Encyclopedia (Phase 1) ───────────────────────
//
// Backward-compatible: legacy EncyclopediaEntry.trackGuide still works.
// New structured types layer alongside the legacy field set.

export type EvidenceLevel = "documented" | "contextual" | "limited" | "insufficient-evidence" | "unresearched";

export type InsufficientEvidenceResearchDisposition = {
  completedAt: string;
  searchedQueries: string[];
  sourceClasses: string[];
  outcome: string;
};

export type TrackEncyclopediaSourceRef = {
  label: string;
  title: string;
  url: string;
  sourceIdentity?: string;
  extract?: string;
  extractType?: "verbatim" | "paraphrase";
  evidenceStatus?: "retrieved" | "checked" | "unavailable";
  checkedAt?: string;
  snapshotId?: string;
};

export type VerifiedFact = {
  claim: string;
  sourceRefs: TrackEncyclopediaSourceRef[];
};

export type CriticalReception = {
  view: string;
  publication: string;
  critic: string;
  sourceRef?: TrackEncyclopediaSourceRef | null;
};

export type FanPerspective = {
  perspective: string;
  label: string;
  grounded: boolean;
  grounding?: string;
  sourceRefs?: TrackEncyclopediaSourceRef[];
};

export type DiscoveryConnection = {
  relatedTrackTitle: string;
  rationale: string;
};

export type TrackEncyclopediaEntry = {
  albumId: string;
  discNumber: number;
  trackNumber: number;
  trackTitle: string;
  evidenceLevel: EvidenceLevel;
  verifiedFacts: VerifiedFact[];
  musicalCharacter: string;
  albumContext: string;
  historicalContext?: string;
  criticalReception?: CriticalReception[];
  fanPerspective?: FanPerspective[];
  listeningNotes: string;
  discoveryConnections?: DiscoveryConnection[];
  limitations: string[];
  sourceRefs?: TrackEncyclopediaSourceRef[];
  researchDisposition?: InsufficientEvidenceResearchDisposition;
};

export type GenerationMetadata = {
  generatedAt: string;
  generator: string;
  model: string | null;
};

export type ReviewMetadata = {
  reviewedAt: string | null;
  reviewer: string | null;
  notes: string;
};

export type TrackEncyclopediaAlbumEntry = {
  albumId: string;
  editionNumber: number;
  published: boolean;
  contentHash: string;
  changeNote: string;
  trackEntries: TrackEncyclopediaEntry[];
  generationMetadata: GenerationMetadata;
  reviewMetadata: ReviewMetadata;
  // Legacy compatibility: keep the old guide/focus/source readable during migration
  legacyTrackGuide?: Array<{
    trackTitle: string;
    guide: string;
    focus: string;
    source?: EncyclopediaSource | null;
  }>;
};

export type TrackEncyclopediaData = {
  metadata: {
    version: string;
    generatedAt: string;
    albumCount: number;
  };
  entries: Record<string, TrackEncyclopediaAlbumEntry>;
};

export type Sort = "rank" | "title" | "artist" | "year" | "genre" | "rating";
export type ViewMode = "list" | "grid" | "shelf";
export type View = "dashboard" | "collection" | "album" | "insights" | "log";
