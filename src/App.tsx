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
import { normalizeVaultState, safeParseVaultState } from "./vaultState";

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

// --- Spotify PKCE OAuth helpers ---

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "";
const SPOTIFY_REDIRECT_URI =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? `${window.location.origin}/`;

async function getSpotifyOAuthConfig() {
  if (SPOTIFY_CLIENT_ID) {
    return { clientId: SPOTIFY_CLIENT_ID, redirectUri: SPOTIFY_REDIRECT_URI };
  }

  const response = await fetch('/.netlify/functions/spotify-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'config' })
  });
  if (!response.ok) throw new Error('Spotify is not configured');
  const config = await response.json();
  if (!config.client_id || !config.redirect_uri) throw new Error('Spotify is not configured');
  return { clientId: config.client_id as string, redirectUri: config.redirect_uri as string };
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function persistVaultState(next: VaultState) {
  try {
    localStorage.setItem("albumvault-state", JSON.stringify(next));
  } catch {
    console.warn("AlbumVault: local vault persistence failed");
  }
}

function useVaultState() {
  const [state, setState] = useState<VaultState>(() => {
    const stored = localStorage.getItem("albumvault-state");
    return stored ? safeParseVaultState(stored) ?? blankState() : blankState();
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
    persistVaultState(state);
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
      const remote = normalizeVaultState(await response.json());
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
      persistVaultState(next);
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
      persistVaultState(next);
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
  trackTitle,
  isPlaying,
  onToggle,
  sourceLabel = "preview"
}: {
  trackTitle: string;
  isPlaying: boolean;
  onToggle: () => void;
  sourceLabel?: string;
}) {
  return (
    <button
      className="previewBtn"
      onClick={onToggle}
      aria-label={`${isPlaying ? "Pause" : "Play"} ${sourceLabel} of ${trackTitle}`}
      title={`${sourceLabel}: ${trackTitle}`}
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

  // Spotify OAuth token state. Refresh tokens are held in an httpOnly cookie by the Netlify auth function.
  const [spotifyToken, setSpotifyToken] = useState<{
    accessToken: string | null;
    expiresAt: number;
    connected: boolean;
  }>(() => {
    try {
      const stored = sessionStorage.getItem('albumvault-spotify-access');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.accessToken === 'string' && parsed.expiresAt > Date.now()) {
          return { accessToken: parsed.accessToken, expiresAt: parsed.expiresAt, connected: true };
        }
      }
    } catch { /* ignore corrupt data */ }
    return { accessToken: null, expiresAt: 0, connected: false };
  });

  // Spotify Web Playback SDK refs
  const spotifyPlayerRef = useRef<any>(null);
  const spotifyDeviceIdRef = useRef<string | null>(null);
  const spotifyCurrentTrackIndex = useRef<number>(-1);
  const spotifyCurrentAlbumId = useRef<string | null>(null);

  // Persist only the short-lived access token in tab-scoped storage.
  useEffect(() => {
    try {
      if (spotifyToken.accessToken && spotifyToken.expiresAt) {
        sessionStorage.setItem('albumvault-spotify-access', JSON.stringify({
          accessToken: spotifyToken.accessToken,
          expiresAt: spotifyToken.expiresAt
        }));
      } else {
        sessionStorage.removeItem('albumvault-spotify-access');
      }
    } catch {
      console.warn('AlbumVault: Spotify token persistence failed');
    }
  }, [spotifyToken]);

  // Handle OAuth callback on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const codeVerifier = sessionStorage.getItem('albumvault-code-verifier');
    sessionStorage.removeItem('albumvault-code-verifier');

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);

    if (!codeVerifier) return;

    (async () => {
      try {
        const response = await fetch('/.netlify/functions/spotify-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'token', code, code_verifier: codeVerifier })
        });
        if (!response.ok) throw new Error('Token exchange failed');
        const data = await response.json();
        setSpotifyToken({
          accessToken: data.access_token,
          expiresAt: Date.now() + (data.expires_in - 60) * 1000,
          connected: true
        });
      } catch {
        console.warn('AlbumVault: Spotify OAuth token exchange failed');
      }
    })();
  }, []);

  // --- Spotify connect / disconnect ---

  async function connectSpotify() {
    let oauthConfig: { clientId: string; redirectUri: string };
    try {
      oauthConfig = await getSpotifyOAuthConfig();
    } catch {
      console.warn('AlbumVault: Spotify OAuth is not configured');
      return;
    }
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem('albumvault-code-verifier', verifier);
    const params = new URLSearchParams({
      client_id: oauthConfig.clientId,
      response_type: 'code',
      redirect_uri: oauthConfig.redirectUri,
      scope: 'streaming user-read-email user-read-private user-modify-playback-state',
      code_challenge_method: 'S256',
      code_challenge: challenge
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  }

  function disconnectSpotify() {
    if (spotifyPlayerRef.current) {
      try { spotifyPlayerRef.current.disconnect(); } catch { /* ignore */ }
      spotifyPlayerRef.current = null;
    }
    spotifyDeviceIdRef.current = null;
    sessionStorage.removeItem('albumvault-spotify-access');
    void fetch('/.netlify/functions/spotify-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'logout' })
    }).catch(() => undefined);
    setSpotifyToken({ accessToken: null, expiresAt: 0, connected: false });
  }

  async function getValidAccessToken(): Promise<string | null> {
    if (spotifyToken.accessToken && spotifyToken.expiresAt > Date.now()) {
      return spotifyToken.accessToken;
    }

    // Token expired — refresh via httpOnly cookie.
    try {
      const response = await fetch('/.netlify/functions/spotify-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'refresh' })
      });
      if (!response.ok) throw new Error('Refresh failed');
      const data = await response.json();
      const expiresAt = Date.now() + (data.expires_in - 60) * 1000;
      const accessToken = data.access_token;
      setSpotifyToken({ accessToken, expiresAt, connected: true });
      return accessToken;
    } catch {
      // Refresh failed — disconnect
      disconnectSpotify();
      return null;
    }
  }

  // Spotify search state
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

  // --- Spotify Web Playback SDK initialization ---

  function playNextTrackOnSpotify(albumId: string, fromIndex: number) {
    const album = albums.find(a => a.id === albumId);
    if (!album || !spotifyToken.connected) return;

    spotifyCurrentAlbumId.current = albumId;

    (async () => {
      for (let i = fromIndex + 1; i < album.tracks.length; i++) {
        const track = album.tracks[i];
        if (!track.title) continue;

        const token = await getValidAccessToken();
        if (!token) break;

        try {
          const q = encodeURIComponent(`${album.artist} ${track.title}`);
          const response = await fetch(`/.netlify/functions/spotify?q=${q}`);
          const data = await response.json();
          const uri = data.spotifyTrackUri;
          if (!uri) continue;

          spotifyCurrentTrackIndex.current = i;
          const deviceId = spotifyDeviceIdRef.current;
          if (!deviceId) continue;

          // Transfer playback to our device
          await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_ids: [deviceId], play: false })
          });
          // Play the track
          await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris: [uri] })
          });
          return;
        } catch {
          // Try next track
          continue;
        }
      }
    })();
  }

  async function playOnSpotify(artist: string, trackTitle: string, albumId: string, trackIndex: number) {
    const token = await getValidAccessToken();
    if (!token) return false;

    spotifyCurrentAlbumId.current = albumId;
    spotifyCurrentTrackIndex.current = trackIndex;

    try {
      const q = encodeURIComponent(`${artist} ${trackTitle}`);
      const response = await fetch(`/.netlify/functions/spotify?q=${q}`);
      if (!response.ok) return false;
      const data = await response.json();
      const uri = data.spotifyTrackUri;
      if (!uri) return false;

      const deviceId = spotifyDeviceIdRef.current;
      if (!deviceId) return false;

      // Stop any iTunes/Apple preview before handing playback to Spotify.
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingPreview(null);

      // Transfer + play. These calls require Spotify Premium and user-modify-playback-state.
      const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [deviceId], play: false })
      });
      if (!transferResponse.ok) return false;

      const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] })
      });
      return playResponse.ok;
    } catch {
      return false;
    }
  }

  // Initialize Spotify Web Playback SDK when connected
  useEffect(() => {
    if (!spotifyToken.connected || !spotifyToken.accessToken) return;

    let cancelled = false;
    let player: any = null;

    function initPlayer() {
      const Spotify = (window as any).Spotify;
      if (!Spotify) return;

      player = new Spotify.Player({
        name: 'AlbumVault',
        getOAuthToken: (cb: (token: string) => void) => {
          getValidAccessToken().then(token => { if (token) cb(token); });
        }
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        if (cancelled) return;
        spotifyDeviceIdRef.current = device_id;
      });

      player.addListener('not_ready', () => {
        spotifyDeviceIdRef.current = null;
      });

      player.addListener('player_state_changed', (state: any) => {
        if (cancelled || !state) return;
        // Auto-continue: when track ends, play next
        if (state.paused && state.position > 0 && state.duration > 0) {
          const nearEnd = state.position > state.duration - 2000;
          if (nearEnd && spotifyCurrentAlbumId.current && spotifyCurrentTrackIndex.current >= 0) {
            playNextTrackOnSpotify(spotifyCurrentAlbumId.current, spotifyCurrentTrackIndex.current);
          }
        }
      });

      player.connect();
    }

    // Wait for SDK to be available
    if ((window as any).Spotify) {
      initPlayer();
    } else {
      const onReady = () => initPlayer();
      (window as any).onSpotifyWebPlaybackSDKReady = onReady;
    }

    return () => {
      cancelled = true;
      if (player) {
        try {
          player.removeListener('ready');
          player.removeListener('not_ready');
          player.removeListener('player_state_changed');
          player.disconnect();
        } catch { /* ignore */ }
      }
    };
  }, [spotifyToken.connected, spotifyToken.accessToken]);

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
    const next = safeParseVaultState(await file.text());
    if (!next) {
      alert("That file is not a valid AlbumVault backup.");
      event.target.value = "";
      return;
    }
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

  async function handleTrackPlay(
    previewUrl: string | null | undefined,
    artist: string,
    trackTitle: string,
    albumId: string,
    trackIndex: number
  ) {
    if (spotifyToken.connected) {
      const playedOnSpotify = await playOnSpotify(artist, trackTitle, albumId, trackIndex);
      if (playedOnSpotify) return;
    }

    if (previewUrl) {
      handlePreviewToggle(previewUrl, albumId, trackIndex);
    }
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
          <button
            className={view === "log" ? "active" : ""}
            onClick={() => setView("log")}
          >
            <BookOpen size={18} /> Log
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
            <button type="button" onClick={loadCloud}>
              <Cloud size={16} /> Load
            </button>
            <button type="button" onClick={() => saveCloud()}>
              <Upload size={16} /> Save
            </button>
          </div>
          <p className={`cloudStatus ${cloudStatus}`}>{cloudMessage}</p>
          <div className="spotifyStatus">
            <span className={`spotifyDot ${spotifyToken.connected ? 'connected' : 'disconnected'}`} />
            {spotifyToken.connected ? (
              <>
                <span>Spotify connected</span>
                <button type="button" onClick={disconnectSpotify} style={{ marginLeft: 'auto', fontSize: '0.75rem', minHeight: '1.8rem', padding: '0 0.5rem' }}>
                  Disconnect
                </button>
              </>
            ) : (
              <button type="button" onClick={connectSpotify} className="spotifyBtn" style={{ marginLeft: 'auto', fontSize: '0.75rem', minHeight: '1.8rem', padding: '0 0.5rem' }}>
                Connect Spotify
              </button>
            )}
          </div>
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
            <button type="button" onClick={pickRandom} title="Pick a random unlistened album">
              <Shuffle size={16} /> Random
            </button>
            <button type="button" onClick={exportState}>
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
            handlePreviewToggle={handleTrackPlay}
            spotifyUrl={spotifyResult.spotifyAlbumUrl || spotifyResult.spotifyTrackUrl}
            spotifyUri={spotifyResult.spotifyAlbumUri}
            spotifyConfigured={spotifyResult.configured}
            spotifyLoading={spotifyResult.loading}
            spotifyConnected={spotifyToken.connected}
          />
        )}

        {view === "insights" && <Insights state={state} openAlbum={openAlbum} />}
        {view === "log" && <ListeningLog state={state} openAlbum={openAlbum} />}
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
          <button type="button" onClick={() => setView("collection")}>
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
  spotifyLoading,
  spotifyConnected
}: {
  album: Album;
  entry?: EncyclopediaEntry;
  albumState: AlbumState;
  updateAlbum: (albumId: string, patch: Partial<AlbumState>) => void;
  addSession: (session: ListeningSession) => void;
  playingPreview: string | null;
  handlePreviewToggle: (
    previewUrl: string | null | undefined,
    artist: string,
    trackTitle: string,
    albumId: string,
    trackIndex: number
  ) => void;
  spotifyUrl: string | null;
  spotifyUri: string | null;
  spotifyConfigured: boolean;
  spotifyLoading: boolean;
  spotifyConnected: boolean;
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
            <button type="button" className="primary" onClick={startSession}>
              <ListMusic size={17} /> Start listening session
            </button>
          ) : null}
          {spotifyConnected && spotifyUrl && (
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noreferrer"
              className="button spotifyLink"
              style={{ marginTop: '0.5rem' }}
            >
              <Headphones size={17} /> Open on Spotify
              <ExternalLink size={12} />
            </a>
          )}
          {spotifyConnected && !spotifyConfigured && (
            <span className="chip muted" style={{ marginTop: '0.5rem' }}>
              <Music size={14} /> Album not found on Spotify
            </span>
          )}
          {!spotifyConnected && spotifyConfigured && spotifyUrl && (
            <button
              className="spotifyBtn"
              onClick={() => window.open(spotifyUrl!, '_blank', 'noreferrer')}
              style={{ marginTop: '0.5rem' }}
            >
              <Headphones size={16} /> Listen on Spotify
              <ExternalLink size={11} />
            </button>
          )}
          {!spotifyConnected && !spotifyConfigured && spotifyLoading && (
            <span className="chip muted" style={{ marginTop: '0.5rem' }}>
              <Music size={14} /> Searching Spotify…
            </span>
          )}
          {!spotifyConnected && !spotifyConfigured && !spotifyLoading && (
            <span className="chip muted" style={{ marginTop: '0.5rem' }}>
              <Music size={14} /> Add SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET env vars for Spotify links
            </span>
          )}
        </div>
      </section>


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
            <p className="eyebrow">{sessionActive ? "Active session" : "Track guide"}</p>
            <h3>
              {album.tracks.length
                ? `${album.tracks.length} tracks`
                : "Awaiting Apple track enrichment"}
            </h3>
          </div>
          {sessionActive ? <ListMusic size={20} /> : <ListMusic size={20} />}
        </div>
        {album.tracks.length ? (
          <div className="trackList">
            {album.tracks.map((track, idx) => {
              const guide = guideByTitle.get(track.title);
              return (
                <article
                  key={`${track.discNumber}-${track.trackNumber}-${track.title}`}
                  className={`trackRow${sessionActive ? " sessionActive" : ""}${checkedTracks.includes(track.title) ? " checked" : ""}`}
                >
                  {sessionActive && (
                    <label className="trackCheck">
                      <input
                        type="checkbox"
                        checked={checkedTracks.includes(track.title)}
                        onChange={() => toggleTrack(track.title)}
                      />
                    </label>
                  )}
                  <span>
                    {track.trackNumber || <CircleDot size={12} />}
                  </span>
                  {(spotifyConnected || track.previewUrl) && (
                    <AudioPreview
                      trackTitle={track.title}
                      isPlaying={!spotifyConnected && playingPreview === track.previewUrl}
                      sourceLabel={spotifyConnected ? "Spotify or preview" : "preview"}
                      onToggle={() =>
                        handlePreviewToggle(
                          track.previewUrl,
                          album.artist,
                          track.title,
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
                      {guide?.guide ?? "Close listening reveals the nuances in this track's arrangement, dynamics, and placement within the album's arc."}
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
        {sessionActive && (
          <>
            <label className="notesField">
              Session reflection
              <textarea
                value={sessionNotes}
                onChange={(event) => setSessionNotes(event.target.value)}
                placeholder="What stood out during this listen? How does it hold up?"
              />
            </label>
            <div className="sessionActions">
              <button type="button" className="primary" onClick={finishSession}>
                <Check size={17} /> Complete session
              </button>
              <button type="button" onClick={cancelSession}>
                Cancel
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Insights({
  state,
  openAlbum
}: {
  state: VaultState;
  openAlbum: (albumId: string) => void;
}) {
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

function ListeningLog({
  state,
  openAlbum
}: {
  state: VaultState;
  openAlbum: (id: string) => void;
}) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const toggleNote = (sessionId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const sessionsWithAlbums = useMemo(() => {
    return state.sessions.map((session) => {
      const album = albums.find((a) => a.id === session.albumId);
      const rating = state.albums[session.albumId]?.rating ?? null;
      return { session, album, rating };
    });
  }, [state]);

  return (
    <div className="insightsGrid">
      <section className="heroPanel">
        <div>
          <p className="eyebrow">Listening log</p>
          <h2>{state.sessions.length} sessions</h2>
          <p>
            Complete history of every guided listening session. Click any entry to revisit the album.
          </p>
        </div>
        <div className="progressDial" style={{ "--progress": "100%" } as React.CSSProperties}>
          <BookOpen size={28} />
        </div>
      </section>

      <section className="panel full">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Complete history</p>
            <h3>All listening sessions</h3>
          </div>
          <ListMusic size={20} />
        </div>
        {sessionsWithAlbums.length ? (
          <ul className="compactList logList">
            {sessionsWithAlbums.map(({ session, album, rating }) => (
              <li key={session.id} className="logEntry">
                <button
                  className="logAlbumBtn"
                  onClick={() => openAlbum(session.albumId)}
                  title="Open album"
                >
                  {album && <AlbumCover album={album} />}
                </button>
                <div className="logDetails">
                  <div className="logTitleRow">
                    <strong>{album?.title ?? "Unknown album"}</strong>
                    <span className="logArtist">{album?.artist ?? ""}</span>
                  </div>
                  <div className="logMeta">
                    <span>
                      {new Date(
                        session.completedAt ?? session.startedAt
                      ).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </span>
                    {session.checkedTracks.length > 0 && (
                      <span>{session.checkedTracks.length} tracks checked</span>
                    )}
                    {rating && (
                      <span className="logRating">
                        {Array.from({ length: rating }).map((_, i) => (
                          <Star key={i} size={10} fill="currentColor" />
                        ))}
                      </span>
                    )}
                  </div>
                  {session.notes && (
                    <div className="logNotes">
                      {expandedNotes.has(session.id) ? (
                        <>
                          <p>"{session.notes}"</p>
                          <button
                            className="logExpandBtn"
                            onClick={() => toggleNote(session.id)}
                          >
                            Show less
                          </button>
                        </>
                      ) : (
                        <>
                          <p>"{session.notes.slice(0, 80)}{session.notes.length > 80 ? "…" : ""}"</p>
                          {session.notes.length > 80 && (
                            <button
                              className="logExpandBtn"
                              onClick={() => toggleNote(session.id)}
                            >
                              Read more
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Complete your first listening session to build history.</p>
        )}
      </section>
    </div>
  );
}

export default App;
