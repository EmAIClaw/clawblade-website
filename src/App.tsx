import {
  ArrowUpDown,
  BarChart3,
  BookOpen,
  Check,
  CircleDot,
  Cloud,
  Disc3,
  Download,
  ExternalLink,
  Filter,
  Gauge,
  Grid3X3,
  Headphones,
  Heart,
  Import,
  LayoutList,
  Library,
  ListMusic,
  Lock,
  Music,
  Pause,
  Play,
  Search,
  Shuffle,
  Star,
  TrendingUp,
  Upload,
  Wand2
} from "lucide-react";
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import catalogData from "./data/catalog.generated.json";
import encyclopediaData from "./data/encyclopedia.generated.json";
import type {
  Album,
  AlbumState,
  EncyclopediaEntry,
  ListeningSession,
  Sort,
  VaultState,
  View,
  ViewMode
} from "./types";

const albums = catalogData.albums as Album[];
const encyclopedia = encyclopediaData.entries as Record<
  string,
  EncyclopediaEntry
>;
const catalogTotal = catalogData.metadata.recordCount;

const blankState = (): VaultState => ({
  albums: {},
  sessions: [],
  updatedAt: new Date().toISOString()
});

function formatDuration(ms: number | null) {
  if (!ms) return "";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function decadeFor(year: number) {
  return `${Math.floor(year / 10) * 10}s`;
}

function todayIso() {
  return new Date().toISOString();
}

function useVaultState() {
  const [state, setState] = useState<VaultState>(() => {
    const stored = localStorage.getItem("albumvault-state");
    return stored ? JSON.parse(stored) : blankState();
  });
  const [passcode, setPasscode] = useState(
    () => sessionStorage.getItem("albumvault-passcode") ?? ""
  );
  const [cloudStatus, setCloudStatus] = useState<
    "idle" | "loading" | "saved" | "error"
  >("idle");
  const [cloudMessage, setCloudMessage] = useState(
    "Local browser backup active."
  );

  useEffect(() => {
    localStorage.setItem("albumvault-state", JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.removeItem("albumvault-passcode");
    if (passcode) sessionStorage.setItem("albumvault-passcode", passcode);
    else sessionStorage.removeItem("albumvault-passcode");
  }, [passcode]);

  async function loadCloud() {
    if (!passcode) {
      setCloudStatus("error");
      setCloudMessage("Enter your passcode before syncing.");
      return;
    }
    setCloudStatus("loading");
    try {
      const response = await fetch("/.netlify/functions/state", {
        headers: { "x-albumvault-passcode": passcode }
      });
      if (!response.ok) throw new Error(await response.text());
      const remote = (await response.json()) as VaultState;
      setState(remote);
      setCloudStatus("saved");
      setCloudMessage("Loaded from Netlify cloud.");
    } catch (error) {
      setCloudStatus("error");
      setCloudMessage(
        error instanceof Error ? error.message : "Cloud load failed."
      );
    }
  }

  async function saveCloud(nextState = state) {
    if (!passcode) {
      setCloudStatus("error");
      setCloudMessage("Enter your passcode before syncing.");
      return;
    }
    setCloudStatus("loading");
    try {
      const response = await fetch("/.netlify/functions/state", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-albumvault-passcode": passcode
        },
        body: JSON.stringify(nextState)
      });
      if (!response.ok) throw new Error(await response.text());
      setCloudStatus("saved");
      setCloudMessage("Saved to Netlify cloud.");
    } catch (error) {
      setCloudStatus("error");
      setCloudMessage(
        error instanceof Error
          ? error.message
          : "Cloud save failed; local backup remains current."
      );
    }
  }

  function updateAlbum(albumId: string, patch: Partial<AlbumState>) {
    setState((current) => {
      const currentAlbumState = current.albums[albumId] ?? {};
      const nextAlbumState = {
        ...currentAlbumState,
        ...patch
      };
      if (patch.owned === true) {
        nextAlbumState.wantlist = false;
      }
      if (patch.wantlist === true) {
        nextAlbumState.owned = false;
      }
      const next: VaultState = {
        ...current,
        albums: {
          ...current.albums,
          [albumId]: nextAlbumState
        },
        updatedAt: todayIso()
      };
      localStorage.setItem("albumvault-state", JSON.stringify(next));
      return next;
    });
  }

  function addSession(session: ListeningSession) {
    setState((current) => {
      const albumState = current.albums[session.albumId] ?? {};
      const next: VaultState = {
        ...current,
        albums: {
          ...current.albums,
          [session.albumId]: {
            ...albumState,
            listened: true,
            listenCount: (albumState.listenCount ?? 0) + 1,
            lastListened: session.completedAt ?? todayIso()
          }
        },
        sessions: [session, ...current.sessions].slice(0, 100),
        updatedAt: todayIso()
      };
      localStorage.setItem("albumvault-state", JSON.stringify(next));
      return next;
    });
  }

  return {
    state,
    setState,
    passcode,
    setPasscode,
    cloudStatus,
    cloudMessage,
    loadCloud,
    saveCloud,
    updateAlbum,
    addSession
  };
}

function Stat({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string | number;
  icon: typeof Gauge;
}) {
  return (
    <section className="stat">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function AlbumCover({ album }: { album: Album }) {
  const base = import.meta.env.BASE_URL;
  const resolvePath = (p: string) => p.startsWith('/') ? `${base}${p.slice(1)}` : p;
  return (
    <img
      className="cover"
      src={resolvePath(album.coverPath || "/covers/placeholder.svg")}
      alt={`${album.title} cover`}
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).src = resolvePath("/covers/placeholder.svg");
      }}
    />
  );
}

function StarRating({
  value,
  onChange,
  size = 18
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="starRating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className="starBtn"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            size={size}
            fill={star <= (hover || value) ? "currentColor" : "none"}
            strokeWidth={star <= (hover || value) ? 0 : 1.5}
          />
        </button>
      ))}
    </div>
  );
}

function AudioPreview({
  previewUrl,
  trackTitle,
  isPlaying,
  onToggle
}: {
  previewUrl: string;
  trackTitle: string;
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="previewBtn"
      onClick={onToggle}
      aria-label={`${isPlaying ? "Pause" : "Play"} preview of ${trackTitle}`}
      title={`Preview: ${trackTitle}`}
    >
      {isPlaying ? <Pause size={14} /> : <Play size={14} />}
    </button>
  );
}

function App() {
  const {
    state,
    setState,
    passcode,
    setPasscode,
    cloudStatus,
    cloudMessage,
    loadCloud,
    saveCloud,
    updateAlbum,
    addSession
  } = useVaultState();
  const [view, setView] = useState<View>("dashboard");
  const [selectedAlbumId, setSelectedAlbumId] = useState(
    albums[0]?.id ?? ""
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "owned" | "wantlist" | "listened" | "missing"
  >("all");
  const [sortBy, setSortBy] = useState<Sort>("rank");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null!);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Spotify integration state
  const [spotifyResult, setSpotifyResult] = useState<{
    spotifyTrackUrl: string | null;
    spotifyAlbumUrl: string | null;
    spotifyAlbumUri: string | null;
    configured: boolean;
    loading: boolean;
  }>({ spotifyTrackUrl: null, spotifyAlbumUrl: null, spotifyAlbumUri: null, configured: false, loading: false });
  const spotifyCache = useRef<Map<string, { url: string; uri: string }>>(new Map());

  async function lookupSpotify(albumId: string) {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;

    // Check cache first
    const cachedKey = `${album.artist} - ${album.title}`;
    if (spotifyCache.current.has(cachedKey)) {
      return;
    }

    setSpotifyResult(prev => ({ ...prev, loading: true }));
    try {
      const q = encodeURIComponent(`${album.artist} ${album.title}`);
      const response = await fetch(`/.netlify/functions/spotify?q=${q}`);
      const data = await response.json();
      if (data.configured) {
        spotifyCache.current.set(cachedKey, {
          url: data.spotifyAlbumUrl || data.spotifyTrackUrl || "",
          uri: data.spotifyAlbumUri || ""
        });
        setSpotifyResult({
          spotifyTrackUrl: data.spotifyTrackUrl,
          spotifyAlbumUrl: data.spotifyAlbumUrl,
          spotifyAlbumUri: data.spotifyAlbumUri,
          configured: true,
          loading: false
        });
      } else {
        setSpotifyResult({ spotifyTrackUrl: null, spotifyAlbumUrl: null, spotifyAlbumUri: null, configured: false, loading: false });
      }
    } catch {
      setSpotifyResult(prev => ({ ...prev, loading: false }));
    }
  }

  // Look up Spotify when album changes
  useEffect(() => {
    if (selectedAlbumId) {
      lookupSpotify(selectedAlbumId);
    }
  }, [selectedAlbumId]);

  const selectedAlbum =
    albums.find((album) => album.id === selectedAlbumId) ?? albums[0];
  const selectedEntry = selectedAlbum
    ? encyclopedia[selectedAlbum.id]
    : undefined;

  const stats = useMemo(() => {
    const values = albums.map((album) => state.albums[album.id] ?? {});
    const owned = values.filter((item) => item.owned).length;
    const wantlist = values.filter((item) => item.wantlist).length;
    const listened = values.filter((item) => item.listened).length;
    const rated = values.filter((item) => item.rating).length;
    return { owned, wantlist, listened, rated };
  }, [state]);

  const filteredAlbums = useMemo(() => {
    const term = query.trim().toLowerCase();
    let result = albums.filter((album) => {
      const albumState = state.albums[album.id] ?? {};
      const matchesTerm =
        !term ||
        `${album.title} ${album.artist} ${album.year} ${album.genre ?? ""}`
          .toLowerCase()
          .includes(term);
      const matchesFilter =
        filter === "all" ||
        (filter === "owned" && albumState.owned) ||
        (filter === "wantlist" && albumState.wantlist) ||
        (filter === "listened" && albumState.listened) ||
        (filter === "missing" && !albumState.owned);
      return matchesTerm && matchesFilter;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "artist":
          return a.artist.localeCompare(b.artist);
        case "year":
          return a.year - b.year;
        case "genre":
          return (a.genre ?? "").localeCompare(b.genre ?? "");
        case "rating": {
          const ra = state.albums[a.id]?.rating ?? 0;
          const rb = state.albums[b.id]?.rating ?? 0;
          return rb - ra;
        }
        default:
          return a.rank - b.rank;
      }
    });

    return result;
  }, [filter, query, state, sortBy]);

  const topQueue = useMemo(() => {
    // Only owned albums, sorted by: unlistened first, then longest-gap-since-listened
    const owned = albums.filter((album) => state.albums[album.id]?.owned);
    const now = Date.now();
    owned.sort((a, b) => {
      const aState = state.albums[a.id] ?? {};
      const bState = state.albums[b.id] ?? {};
      // Unlistened first
      if (!aState.listened && bState.listened) return -1;
      if (aState.listened && !bState.listened) return 1;
      // Then longest gap since last listened (null lastListened = never = longest gap)
      const aLast = aState.lastListened ? new Date(aState.lastListened).getTime() : 0;
      const bLast = bState.lastListened ? new Date(bState.lastListened).getTime() : 0;
      return aLast - bLast;
    });
    return owned.slice(0, 6);
  }, [state]);

  const randomAlbum = useMemo(() => {
    const candidates = albums.filter(
      (album) => !state.albums[album.id]?.listened
    );
    if (!candidates.length) return albums[Math.floor(Math.random() * albums.length)];
    return candidates[Math.floor(Math.random() * candidates.length)];
  }, [state]);

  function openAlbum(albumId: string) {
    setSelectedAlbumId(albumId);
    setView("album");
  }

  function pickRandom() {
    openAlbum(randomAlbum.id);
  }

  function exportState() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `albumvault-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importState(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const next = JSON.parse(await file.text()) as VaultState;
    setState({ ...next, updatedAt: todayIso() });
    event.target.value = "";
  }

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "SELECT"
      ) {
        e.preventDefault();
        setView("collection");
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function playNextTrack(albumId: string, fromIndex: number) {
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;
    for (let i = fromIndex + 1; i < album.tracks.length; i++) {
      if (album.tracks[i].previewUrl) {
        const audio = new Audio(album.tracks[i].previewUrl!);
        audioRef.current = audio;
        audio.addEventListener("ended", () => {
          setPlayingPreview(null);
          playNextTrack(albumId, i);
        });
        audio.play();
        setPlayingPreview(album.tracks[i].previewUrl!);
        return;
      }
    }
  }

  function handlePreviewToggle(
    previewUrl: string,
    albumId: string,
    trackIndex: number
  ) {
    if (playingPreview === previewUrl) {
      audioRef.current?.pause();
      setPlayingPreview(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    audio.addEventListener("ended", () => {
      setPlayingPreview(null);
      playNextTrack(albumId, trackIndex);
    });
    audio.play();
    setPlayingPreview(previewUrl);
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <Disc3 size={28} />
          <div>
            <strong>AlbumVault</strong>
            <span>{catalogTotal} album canon</span>
          </div>
        </div>
        <nav>
          <button
            className={view === "dashboard" ? "active" : ""}
            onClick={() => setView("dashboard")}
          >
            <Gauge size={18} /> Dashboard
          </button>
          <button
            className={view === "collection" ? "active" : ""}
            onClick={() => setView("collection")}
          >
            <Library size={18} /> Collection
          </button>
          <button
            className={view === "insights" ? "active" : ""}
            onClick={() => setView("insights")}
          >
            <BarChart3 size={18} /> Insights
          </button>
        </nav>
        <section className="syncPanel">
          <div className="syncTitle">
            <Lock size={16} />
            <span>Private sync</span>
          </div>
          <input
            type="password"
            value={passcode}
            placeholder="Netlify passcode"
            onChange={(event) => setPasscode(event.target.value)}
            aria-label="Netlify passcode"
          />
          <div className="buttonRow">
            <button onClick={loadCloud}>
              <Cloud size={16} /> Load
            </button>
            <button onClick={() => saveCloud()}>
              <Upload size={16} /> Save
            </button>
          </div>
          <p className={`cloudStatus ${cloudStatus}`}>{cloudMessage}</p>
        </section>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Personal CD tracking app</p>
            <h1>
              {view === "album"
                ? selectedAlbum.title
                : "Greatest Albums Vault"}
            </h1>
          </div>
          <div className="actions">
            <button onClick={pickRandom} title="Pick a random unlistened album">
              <Shuffle size={16} /> Random
            </button>
            <button onClick={exportState}>
              <Download size={16} /> Export
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
            >
              <Import size={16} /> Import
            </button>
            <input
              ref={importInputRef}
              className="hidden"
              type="file"
              accept="application/json"
              onChange={importState}
            />
          </div>
        </header>

        {view === "dashboard" && (
          <Dashboard
            stats={stats}
            state={state}
            queue={topQueue}
            randomAlbumId={randomAlbum.id}
            openAlbum={openAlbum}
            setView={setView}
          />
        )}

        {view === "collection" && (
          <CollectionView
            filteredAlbums={filteredAlbums}
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
            state={state}
            openAlbum={openAlbum}
            updateAlbum={updateAlbum}
            searchInputRef={searchInputRef}
          />
        )}

        {view === "album" && selectedAlbum && (
          <AlbumDetail
            album={selectedAlbum}
            entry={selectedEntry}
            albumState={state.albums[selectedAlbum.id] ?? {}}
            updateAlbum={updateAlbum}
            addSession={addSession}
            playingPreview={playingPreview}
            handlePreviewToggle={handlePreviewToggle}
            spotifyUrl={spotifyResult.spotifyAlbumUrl || spotifyResult.spotifyTrackUrl}
            spotifyUri={spotifyResult.spotifyAlbumUri}
            spotifyConfigured={spotifyResult.configured}
            spotifyLoading={spotifyResult.loading}
          />
        )}

        {view === "insights" && <Insights state={state} />}
      </main>
    </div>
  );
}

function Dashboard({
  stats,
  state,
  queue,
  randomAlbumId,
  openAlbum,
  setView
}: {
  stats: {
    owned: number;
    wantlist: number;
    listened: number;
    rated: number;
  };
  state: VaultState;
  queue: Album[];
  randomAlbumId: string;
  openAlbum: (id: string) => void;
  setView: (view: View) => void;
}) {
  const listenedPct = Math.round((stats.listened / catalogTotal) * 100);
  const ownedPct = Math.round((stats.owned / catalogTotal) * 100);
  const recent = state.sessions.slice(0, 4);

  return (
    <div className="grid dashboardGrid">
      <section className="heroPanel">
        <div>
          <p className="eyebrow">Vault progress</p>
          <h2>{listenedPct}% listened</h2>
          <p>
            {stats.listened} of {catalogTotal} albums completed. {stats.owned}{" "}
            CDs owned and {stats.wantlist} on the wantlist.
          </p>
          <button onClick={() => setView("collection")}>
            <Library size={17} /> Manage collection
          </button>
        </div>
        <div
          className="progressDial"
          style={
            { "--progress": `${listenedPct}%` } as React.CSSProperties
          }
        >
          <span>{listenedPct}%</span>
        </div>
      </section>

      <div className="statsGrid">
        <Stat
          label="Owned"
          value={`${stats.owned}/${catalogTotal}`}
          icon={Disc3}
        />
        <Stat label="Listened" value={stats.listened} icon={Check} />
        <Stat label="Wantlist" value={stats.wantlist} icon={Heart} />
        <Stat label="Rated" value={stats.rated} icon={Star} />
      </div>

      <section className="panel wide">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">On deck</p>
            <h3>Next listening candidates</h3>
          </div>
          <span className="pill">{ownedPct}% owned</span>
        </div>
        <div className="albumStrip">
          {queue.map((album) => (
            <button
              key={album.id}
              className="stripItem"
              onClick={() => openAlbum(album.id)}
            >
              <AlbumCover album={album} />
              <strong>#{album.rank}</strong>
              <span>{album.title}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Recent sessions</p>
            <h3>Listening log</h3>
          </div>
          <BookOpen size={20} />
        </div>
        {recent.length ? (
          <ul className="compactList">
            {recent.map((session) => {
              const album = albums.find(
                (item) => item.id === session.albumId
              );
              return (
                <li key={session.id}>
                  <span>{album?.title ?? "Unknown album"}</span>
                  <strong>
                    {new Date(
                      session.completedAt ?? session.startedAt
                    ).toLocaleDateString()}
                  </strong>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>
            No sessions yet. Pick an album and start a guided listen.
          </p>
        )}
      </section>
    </div>
  );
}

function CollectionView({
  filteredAlbums,
  query,
  setQuery,
  filter,
  setFilter,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  state,
  openAlbum,
  updateAlbum,
  searchInputRef,
}: {
  filteredAlbums: Album[];
  query: string;
  setQuery: (query: string) => void;
  filter: "all" | "owned" | "wantlist" | "listened" | "missing";
  setFilter: (
    filter: "all" | "owned" | "wantlist" | "listened" | "missing"
  ) => void;
  sortBy: Sort;
  setSortBy: (sort: Sort) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  state: VaultState;
  openAlbum: (id: string) => void;
  updateAlbum: (albumId: string, patch: Partial<AlbumState>) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <section className="panel full">
      <div className="toolbar">
        <label className="searchBox">
          <Search size={18} />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search albums, artists, years, genres..."
            aria-label="Search albums"
          />
          {query && (
            <button
              className="clearSearch"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </label>
        <label className="filterBox">
          <Filter size={18} />
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as typeof filter)
            }
          >
            <option value="all">All albums</option>
            <option value="owned">Owned</option>
            <option value="wantlist">Wantlist</option>
            <option value="listened">Listened</option>
            <option value="missing">Missing CDs</option>
          </select>
        </label>
        <label className="sortBox">
          <ArrowUpDown size={18} />
          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as Sort)
            }
          >
            <option value="rank">Rank</option>
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="year">Year</option>
            <option value="genre">Genre</option>
            <option value="rating">Rating</option>
          </select>
        </label>
        <div className="viewToggle">
          <button
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <LayoutList size={18} />
          </button>
          <button
            className={viewMode === "grid" ? "active" : ""}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <Grid3X3 size={18} />
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="albumTable">
          {filteredAlbums.map((album) => {
            const albumState = state.albums[album.id] ?? {};
            return (
              <article key={album.id} className="albumRow">
                <button
                  className="albumIdentity"
                  onClick={() => openAlbum(album.id)}
                >
                  <AlbumCover album={album} />
                  <span className="rank">#{album.rank}</span>
                  <span>
                    <strong>{album.title}</strong>
                    <small>
                      {album.artist} • {album.year}
                      {album.genre ? ` • ${album.genre}` : ""}
                    </small>
                  </span>
                </button>
                <div className="rowBadges">
                  {albumState.rating ? (
                    <span className="miniRating" title={`${albumState.rating} stars`}>
                      <Star size={12} fill="currentColor" /> {albumState.rating}
                    </span>
                  ) : null}
                </div>
                <div className="rowToggles">
                  <button
                    className={
                      albumState.owned ? "toggle on" : "toggle"
                    }
                    onClick={() =>
                      updateAlbum(album.id, {
                        owned: !albumState.owned
                      })
                    }
                  >
                    <Disc3 size={16} /> Owned
                  </button>
                  <button
                    className={
                      albumState.wantlist
                        ? "toggle on want"
                        : "toggle"
                    }
                    onClick={() =>
                      updateAlbum(album.id, {
                        wantlist: !albumState.wantlist
                      })
                    }
                  >
                    <Heart size={16} /> Want
                  </button>
                  <button
                    className={
                      albumState.listened
                        ? "toggle on done"
                        : "toggle"
                    }
                    onClick={() =>
                      updateAlbum(album.id, {
                        listened: !albumState.listened,
                        lastListened: !albumState.listened
                          ? todayIso()
                          : albumState.lastListened
                      })
                    }
                  >
                    <Check size={16} /> Heard
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="albumGrid">
          {filteredAlbums.map((album) => {
            const albumState = state.albums[album.id] ?? {};
            return (
              <article
                key={album.id}
                className="albumCard"
                onClick={() => openAlbum(album.id)}
              >
                <AlbumCover album={album} />
                <div className="cardInfo">
                  <strong>{album.title}</strong>
                  <small>
                    {album.artist} • {album.year}
                  </small>
                  <div className="cardBadges">
                    {albumState.owned && (
                      <span className="badge ownedBadge">
                        <Disc3 size={11} /> Owned
                      </span>
                    )}
                    {albumState.listened && (
                      <span className="badge doneBadge">
                        <Check size={11} /> Heard
                      </span>
                    )}
                    {albumState.rating ? (
                      <span className="badge ratedBadge">
                        <Star size={11} fill="currentColor" /> {albumState.rating}
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="resultCount">
        {filteredAlbums.length} of {albums.length} albums
        {query ? ` matching "${query}"` : ""}
      </p>
    </section>
  );
}

function AlbumDetail({
  album,
  entry,
  albumState,
  updateAlbum,
  addSession,
  playingPreview,
  handlePreviewToggle,
  spotifyUrl,
  spotifyUri,
  spotifyConfigured,
  spotifyLoading
}: {
  album: Album;
  entry?: EncyclopediaEntry;
  albumState: AlbumState;
  updateAlbum: (albumId: string, patch: Partial<AlbumState>) => void;
  addSession: (session: ListeningSession) => void;
  playingPreview: string | null;
  handlePreviewToggle: (
    previewUrl: string,
    albumId: string,
    trackIndex: number
  ) => void;
  spotifyUrl: string | null;
  spotifyUri: string | null;
  spotifyConfigured: boolean;
  spotifyLoading: boolean;
}) {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [checkedTracks, setCheckedTracks] = useState<string[]>([]);

  function startSession() {
    setSessionActive(true);
    setSessionNotes("");
    setCheckedTracks([]);
  }

  function toggleTrack(title: string) {
    setCheckedTracks((current) =>
      current.includes(title)
        ? current.filter((item) => item !== title)
        : [...current, title]
    );
  }

  function finishSession() {
    addSession({
      id: crypto.randomUUID(),
      albumId: album.id,
      startedAt: todayIso(),
      completedAt: todayIso(),
      notes: sessionNotes,
      checkedTracks
    });
    setSessionActive(false);
    setSessionNotes("");
    setCheckedTracks([]);
  }

  function cancelSession() {
    setSessionActive(false);
    setSessionNotes("");
    setCheckedTracks([]);
  }

  const guideByTitle = new Map(
    (entry?.trackGuide ?? []).map((guide) => [
      guide.trackTitle,
      guide
    ])
  );

  return (
    <div className="albumDetail">
      <section className="albumHero">
        <AlbumCover album={album} />
        <div>
          <p className="eyebrow">
            #{album.rank} / {catalogTotal}
          </p>
          <h2>{album.title}</h2>
          <p>
            {album.artist} • {album.year}
            {album.genre ? ` • ${album.genre}` : ""}
          </p>
          <StarRating
            value={albumState.rating ?? 0}
            onChange={(rating) => updateAlbum(album.id, { rating })}
          />
          <div className="chipRow">
            <button
              className={
                albumState.owned ? "chip active" : "chip"
              }
              onClick={() =>
                updateAlbum(album.id, { owned: !albumState.owned })
              }
            >
              <Disc3 size={16} /> CD owned
            </button>
            <button
              className={
                albumState.wantlist ? "chip active" : "chip"
              }
              onClick={() =>
                updateAlbum(album.id, {
                  wantlist: !albumState.wantlist
                })
              }
            >
              <Heart size={16} /> Wantlist
            </button>
            <button
              className={
                albumState.listened ? "chip active" : "chip"
              }
              onClick={() =>
                updateAlbum(album.id, {
                  listened: !albumState.listened
                })
              }
            >
              <Check size={16} /> Listened
            </button>
          </div>
          <div className="chipRow sessionChipRow">
            {albumState.listenCount ? (
              <span className="chip muted">
                <ListMusic size={14} /> Listened {albumState.listenCount}x
                {albumState.lastListened
                  ? ` · Last: ${new Date(albumState.lastListened).toLocaleDateString()}`
                  : ""}
              </span>
            ) : null}
          </div>
          {!sessionActive ? (
            <button className="primary" onClick={startSession}>
              <ListMusic size={17} /> Start listening session
            </button>
          ) : null}
          {spotifyUrl && (
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noreferrer"
              className="button spotifyLink"
              style={{ marginTop: '0.5rem' }}
            >
              <Headphones size={17} /> Listen on Spotify
              <ExternalLink size={12} />
            </a>
          )}
          {!spotifyConfigured && spotifyLoading && (
            <span className="chip muted" style={{ marginTop: '0.5rem' }}>
              <Music size={14} /> Searching Spotify…
            </span>
          )}
          {!spotifyConfigured && !spotifyLoading && (
            <span className="chip muted" style={{ marginTop: '0.5rem' }}>
              <Music size={14} /> Add SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET env vars for Spotify links
            </span>
          )}
        </div>
      </section>

      {sessionActive && (
        <section className="panel full sessionInline">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Active session</p>
              <h3>Track checklist</h3>
            </div>
            <ListMusic size={20} />
          </div>
          {album.tracks.length ? (
            <div className="sessionTracks">
              {album.tracks.map((track) => (
                <label
                  key={`${track.discNumber}-${track.trackNumber}-${track.title}`}
                  className={
                    checkedTracks.includes(track.title) ? "checked" : ""
                  }
                >
                  <input
                    type="checkbox"
                    checked={checkedTracks.includes(track.title)}
                    onChange={() => toggleTrack(track.title)}
                  />
                  <span>{track.trackNumber}. {track.title}</span>
                  <small>{formatDuration(track.durationMs)}</small>
                </label>
              ))}
            </div>
          ) : (
            <p>Tracks will appear after Apple enrichment.</p>
          )}
          <label className="notesField">
            Session reflection
            <textarea
              value={sessionNotes}
              onChange={(event) => setSessionNotes(event.target.value)}
              placeholder="What stood out during this listen? How does it hold up?"
            />
          </label>
          <div className="sessionActions">
            <button className="primary" onClick={finishSession}>
              <Check size={17} /> Complete session
            </button>
            <button onClick={cancelSession}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="panel full">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Encyclopedia</p>
            <h3>Artist and album reference</h3>
          </div>
          <Wand2 size={20} />
        </div>
        <div className="referenceGrid">
          <article>
            <h4>Artist</h4>
            <p>
              {entry?.artistInfo?.summary ??
                "No confident artist source was matched for this entry."}
            </p>
            {entry?.artistInfo?.source && (
              <a
                className="sourceLink"
                href={entry.artistInfo.source.url}
                target="_blank"
                rel="noreferrer"
              >
                Source: {entry.artistInfo.source.title}
              </a>
            )}
          </article>
          <article>
            <h4>Album</h4>
            <p>
              {entry?.albumInfo?.summary ?? entry?.context}
            </p>
            {entry?.albumInfo?.source && (
              <a
                className="sourceLink"
                href={entry.albumInfo.source.url}
                target="_blank"
                rel="noreferrer"
              >
                Source: {entry.albumInfo.source.title}
              </a>
            )}
          </article>
        </div>
        <p>{entry?.relevance}</p>
        <div className="themeRow">
          {entry?.themes.map((theme) => (
            <span key={theme}>{theme}</span>
          ))}
        </div>
      </section>

      <section className="panel full">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Track guide</p>
            <h3>
              {album.tracks.length
                ? `${album.tracks.length} tracks`
                : "Awaiting Apple track enrichment"}
            </h3>
          </div>
          <ListMusic size={20} />
        </div>
        {album.tracks.length ? (
          <div className="trackList">
            {album.tracks.map((track, idx) => {
              const guide = guideByTitle.get(track.title);
              return (
                <article
                  key={`${track.discNumber}-${track.trackNumber}-${track.title}`}
                  className="trackRow"
                >
                  <span>
                    {track.trackNumber || <CircleDot size={12} />}
                  </span>
                  {track.previewUrl && (
                    <AudioPreview
                      previewUrl={track.previewUrl}
                      trackTitle={track.title}
                      isPlaying={
                        playingPreview === track.previewUrl
                      }
                      onToggle={() =>
                        handlePreviewToggle(
                          track.previewUrl!,
                          album.id,
                          idx
                        )
                      }
                    />
                  )}
                  <div>
                    <strong>{track.title}</strong>
                    {guide?.focus && <em>{guide.focus}</em>}
                    <p>
                      {guide?.guide ??
                        "Guide text will appear after encyclopedia regeneration."}
                    </p>
                    {guide?.source && (
                      <a
                        className="sourceLink compact"
                        href={guide.source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source: {guide.source.title}
                      </a>
                    )}
                  </div>
                  <small>{formatDuration(track.durationMs)}</small>
                </article>
              );
            })}
          </div>
        ) : (
          <p>
            Run `npm run prepare:catalog` with network access to
            fetch Apple track listings and cover art.
          </p>
        )}
      </section>
    </div>
  );
}

function Insights({ state }: { state: VaultState }) {
  const ownedByDecade = useMemo(() => {
    const counts = new Map<string, number>();
    albums.forEach((album) => {
      if (!state.albums[album.id]?.owned) return;
      const decade = decadeFor(album.year);
      counts.set(decade, (counts.get(decade) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort(
      ([a], [b]) => a.localeCompare(b)
    );
  }, [state]);

  const genreDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    albums.forEach((album) => {
      if (!state.albums[album.id]?.owned) return;
      const genre = album.genre ?? "Unknown";
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [state]);

  const topRated = useMemo(() => {
    return albums
      .filter((album) => state.albums[album.id]?.rating)
      .sort(
        (a, b) =>
          (state.albums[b.id]?.rating ?? 0) -
          (state.albums[a.id]?.rating ?? 0)
      )
      .slice(0, 8);
  }, [state]);

  const listened = albums.filter(
    (album) => state.albums[album.id]?.listened
  ).length;
  const owned = albums.filter(
    (album) => state.albums[album.id]?.owned
  ).length;
  const longestDecadeBar = Math.max(
    ...ownedByDecade.map(([, count]) => count),
    1
  );
  const longestGenreBar = Math.max(
    ...genreDistribution.map(([, count]) => count),
    1
  );

  // Average rating
  const avgRating = useMemo(() => {
    const ratings = albums
      .filter((album) => state.albums[album.id]?.rating)
      .map((album) => state.albums[album.id]!.rating!);
    if (!ratings.length) return null;
    return (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(
      1
    );
  }, [state]);

  // Most-listened albums by listenCount
  const mostListened = useMemo(() => {
    return albums
      .filter((album) => (state.albums[album.id]?.listenCount ?? 0) > 0)
      .sort(
        (a, b) =>
          (state.albums[b.id]?.listenCount ?? 0) -
          (state.albums[a.id]?.listenCount ?? 0)
      )
      .slice(0, 8);
  }, [state]);

  // Recent sessions with album info
  const recentSessions = useMemo(() => {
    return state.sessions.slice(0, 10).map((session) => {
      const album = albums.find((a) => a.id === session.albumId);
      return { session, album };
    });
  }, [state]);

  // Sessions per month (last 12 months)
  const sessionsByMonth = useMemo(() => {
    const counts = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      counts.set(key, 0);
    }
    state.sessions.forEach((s) => {
      const d = new Date(s.completedAt ?? s.startedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const maxCount = Math.max(...counts.values(), 1);
    return { counts, maxCount };
  }, [state]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sessionMonths = Array.from(sessionsByMonth.counts.entries()).map(([key, count]) => {
    const [y, m] = key.split("-").map(Number);
    return { label: `${monthNames[m - 1]} ${String(y).slice(2)}`, count };
  });

  return (
    <div className="insightsGrid">
      <section className="heroPanel">
        <div>
          <p className="eyebrow">Insights</p>
          <h2>{owned} CDs owned</h2>
          <p>
            {listened} albums completed, {state.sessions.length}{" "}
            listening sessions logged, and {catalogTotal - owned} catalog
            gaps remaining.
          </p>
          {avgRating && (
            <p>
              Average rating: <strong className="avgRating">{avgRating}</strong> / 5
              across{" "}
              {albums.filter((a) => state.albums[a.id]?.rating)
                .length}{" "}
              rated albums
            </p>
          )}
        </div>
        <div
          className="progressDial"
          style={
            {
              "--progress": `${Math.round(
                (owned / catalogTotal) * 100
              )}%`
            } as React.CSSProperties
          }
        >
          <span>
            {Math.round((owned / catalogTotal) * 100)}%
          </span>
        </div>
      </section>

      {/* Listening History */}
      <section className="panel full">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Listening history</p>
            <h3>Recent sessions</h3>
          </div>
          <BookOpen size={20} />
        </div>
        {recentSessions.length ? (
          <ul className="compactList">
            {recentSessions.map(({ session, album }) => (
              <li key={session.id}>
                <div className="sessionListItem">
                  <span>{album?.title ?? "Unknown album"}</span>
                  {album && <small>{album.artist}</small>}
                </div>
                <div className="sessionListMeta">
                  <strong>
                    {new Date(
                      session.completedAt ?? session.startedAt
                    ).toLocaleDateString()}
                  </strong>
                  {session.notes && (
                    <small className="sessionNote">"{session.notes.slice(0, 60)}"</small>
                  )}
                  {session.checkedTracks.length > 0 && (
                    <small>{session.checkedTracks.length} tracks checked</small>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Complete your first listening session to build history.</p>
        )}
      </section>

      {/* Listening frequency */}
      <section className="panel full">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Listening rhythm</p>
            <h3>Sessions per month</h3>
          </div>
          <TrendingUp size={20} />
        </div>
        <div className="barList">
          {sessionMonths.map(({ label, count }) => (
            <div key={label} className="barRow">
              <span>{label}</span>
              <div>
                <i
                  style={{
                    width: `${(count / sessionsByMonth.maxCount) * 100}%`
                  }}
                />
              </div>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* Most listened */}
      {mostListened.length > 0 && (
        <section className="panel full">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Top listens</p>
              <h3>Most-listened albums</h3>
            </div>
            <ListMusic size={20} />
          </div>
          <div className="albumStrip">
            {mostListened.map((album) => (
              <div
                key={album.id}
                className="stripItem readonly"
              >
                <AlbumCover album={album} />
                <span className="listenCountBadge">
                  {state.albums[album.id]!.listenCount}x
                </span>
                <span>{album.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel full">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Collection shape</p>
            <h3>Owned by decade</h3>
          </div>
          <BarChart3 size={20} />
        </div>
        <div className="barList">
          {ownedByDecade.length ? (
            ownedByDecade.map(([decade, count]) => (
              <div key={decade} className="barRow">
                <span>{decade}</span>
                <div>
                  <i
                    style={{
                      width: `${
                        (count / longestDecadeBar) * 100
                      }%`
                    }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))
          ) : (
            <p>
              Mark albums as owned to build the decade map.
            </p>
          )}
        </div>
      </section>

      <section className="panel full">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Genre breakdown</p>
            <h3>Top genres in collection</h3>
          </div>
          <TrendingUp size={20} />
        </div>
        <div className="barList">
          {genreDistribution.length ? (
            genreDistribution.map(([genre, count]) => (
              <div key={genre} className="barRow">
                <span>{genre}</span>
                <div>
                  <i
                    style={{
                      width: `${
                        (count / longestGenreBar) * 100
                      }%`
                    }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))
          ) : (
            <p>
              Mark albums as owned to see genre distribution.
            </p>
          )}
        </div>
      </section>

      {topRated.length > 0 && (
        <section className="panel full">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Your ratings</p>
              <h3>Top rated albums</h3>
            </div>
            <Star size={20} />
          </div>
          <div className="albumStrip">
            {topRated.map((album) => (
              <div
                key={album.id}
                className="stripItem readonly"
              >
                <AlbumCover album={album} />
                <div className="miniStars">
                  {Array.from({
                    length: state.albums[album.id]!.rating!
                  }).map((_, i) => (
                    <Star
                      key={i}
                      size={10}
                      fill="currentColor"
                    />
                  ))}
                </div>
                <span>{album.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h3>All sessions</h3>
        <ul className="compactList">
          {state.sessions.length ? (
            state.sessions.map((session) => {
              const album = albums.find(
                (item) => item.id === session.albumId
              );
              return (
                <li key={session.id}>
                  <span>{album?.title ?? "Unknown album"}</span>
                  <strong>
                    {new Date(
                      session.completedAt ?? session.startedAt
                    ).toLocaleDateString()}
                  </strong>
                </li>
              );
            })
          ) : (
            <p>No sessions recorded yet.</p>
          )}
        </ul>
      </section>
    </div>
  );
}

export default App;
