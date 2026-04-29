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
  notes?: string;
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

export type View = "dashboard" | "collection" | "album" | "session" | "insights";
