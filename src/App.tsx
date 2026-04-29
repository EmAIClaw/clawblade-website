import {
  BarChart3,
  BookOpen,
  Check,
  CircleDot,
  Cloud,
  Disc3,
  Download,
  Filter,
  Gauge,
  Heart,
  Import,
  Library,
  ListMusic,
  Lock,
  Search,
  Star,
  Upload,
  Wand2
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import catalogData from "./data/catalog.generated.json";
import encyclopediaData from "./data/encyclopedia.generated.json";
import type { Album, AlbumState, EncyclopediaEntry, ListeningSession, VaultState, View } from "./types";

const albums = catalogData.albums as Album[];
const encyclopedia = encyclopediaData.entries as Record<string, EncyclopediaEntry>;
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
  const [passcode, setPasscode] = useState(() => sessionStorage.getItem("albumvault-passcode") ?? "");
  const [cloudStatus, setCloudStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [cloudMessage, setCloudMessage] = useState("Local browser backup active.");

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
      setCloudMessage(error instanceof Error ? error.message : "Cloud load failed.");
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
      setCloudMessage(error instanceof Error ? error.message : "Cloud save failed; local backup remains current.");
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

  return { state, setState, passcode, setPasscode, cloudStatus, cloudMessage, loadCloud, saveCloud, updateAlbum, addSession };
}

function Stat({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Gauge }) {
  return (
    <section className="stat">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function AlbumCover({ album }: { album: Album }) {
  return <img className="cover" src={album.coverPath || "/covers/placeholder.svg"} alt={`${album.title} cover`} loading="lazy" />;
}

function App() {
  const { state, setState, passcode, setPasscode, cloudStatus, cloudMessage, loadCloud, saveCloud, updateAlbum, addSession } =
    useVaultState();
  const [view, setView] = useState<View>("dashboard");
  const [selectedAlbumId, setSelectedAlbumId] = useState(albums[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "owned" | "wantlist" | "listened" | "missing">("all");
  const importInputRef = useRef<HTMLInputElement>(null);

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId) ?? albums[0];
  const selectedEntry = selectedAlbum ? encyclopedia[selectedAlbum.id] : undefined;

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
    return albums.filter((album) => {
      const albumState = state.albums[album.id] ?? {};
      const matchesTerm = !term || `${album.title} ${album.artist} ${album.year} ${album.genre ?? ""}`.toLowerCase().includes(term);
      const matchesFilter =
        filter === "all" ||
        (filter === "owned" && albumState.owned) ||
        (filter === "wantlist" && albumState.wantlist) ||
        (filter === "listened" && albumState.listened) ||
        (filter === "missing" && !albumState.owned);
      return matchesTerm && matchesFilter;
    });
  }, [filter, query, state]);

  const topQueue = useMemo(
    () => albums.filter((album) => !state.albums[album.id]?.listened).slice(0, 6),
    [state]
  );

  function openAlbum(albumId: string) {
    setSelectedAlbumId(albumId);
    setView("album");
  }

  function exportState() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `albumvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
            <Gauge size={18} /> Dashboard
          </button>
          <button className={view === "collection" ? "active" : ""} onClick={() => setView("collection")}>
            <Library size={18} /> Collection
          </button>
          <button className={view === "session" ? "active" : ""} onClick={() => setView("session")}>
            <ListMusic size={18} /> Session
          </button>
          <button className={view === "insights" ? "active" : ""} onClick={() => setView("insights")}>
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
            <h1>{view === "album" ? selectedAlbum.title : "Greatest Albums Vault"}</h1>
          </div>
          <div className="actions">
            <button onClick={exportState}>
              <Download size={16} /> Export
            </button>
            <button onClick={() => importInputRef.current?.click()}>
              <Import size={16} /> Import
            </button>
            <input ref={importInputRef} className="hidden" type="file" accept="application/json" onChange={importState} />
          </div>
        </header>

        {view === "dashboard" && (
          <Dashboard
            stats={stats}
            state={state}
            queue={topQueue}
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
            state={state}
            openAlbum={openAlbum}
            updateAlbum={updateAlbum}
          />
        )}

        {view === "album" && selectedAlbum && (
          <AlbumDetail
            album={selectedAlbum}
            entry={selectedEntry}
            albumState={state.albums[selectedAlbum.id] ?? {}}
            updateAlbum={updateAlbum}
            startSession={() => setView("session")}
          />
        )}

        {view === "session" && selectedAlbum && (
          <SessionView
            album={selectedAlbum}
            entry={selectedEntry}
            albums={albums}
            selectedAlbumId={selectedAlbumId}
            setSelectedAlbumId={setSelectedAlbumId}
            addSession={addSession}
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
  openAlbum,
  setView
}: {
  stats: { owned: number; wantlist: number; listened: number; rated: number };
  state: VaultState;
  queue: Album[];
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
            {stats.listened} of {catalogTotal} albums completed. {stats.owned} CDs owned and {stats.wantlist} on the wantlist.
          </p>
          <button onClick={() => setView("collection")}>
            <Library size={17} /> Manage collection
          </button>
        </div>
        <div className="progressDial" style={{ "--progress": `${listenedPct}%` } as React.CSSProperties}>
          <span>{listenedPct}%</span>
        </div>
      </section>

      <div className="statsGrid">
        <Stat label="Owned" value={`${stats.owned}/${catalogTotal}`} icon={Disc3} />
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
            <button key={album.id} className="stripItem" onClick={() => openAlbum(album.id)}>
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
              const album = albums.find((item) => item.id === session.albumId);
              return (
                <li key={session.id}>
                  <span>{album?.title ?? "Unknown album"}</span>
                  <strong>{new Date(session.completedAt ?? session.startedAt).toLocaleDateString()}</strong>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No sessions yet. Pick an album and start a guided listen.</p>
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
  state,
  openAlbum,
  updateAlbum
}: {
  filteredAlbums: Album[];
  query: string;
  setQuery: (query: string) => void;
  filter: "all" | "owned" | "wantlist" | "listened" | "missing";
  setFilter: (filter: "all" | "owned" | "wantlist" | "listened" | "missing") => void;
  state: VaultState;
  openAlbum: (id: string) => void;
  updateAlbum: (albumId: string, patch: Partial<AlbumState>) => void;
}) {
  return (
    <section className="panel full">
      <div className="toolbar">
        <label className="searchBox">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search albums, artists, years" />
        </label>
        <label className="filterBox">
          <Filter size={18} />
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
            <option value="all">All albums</option>
            <option value="owned">Owned</option>
            <option value="wantlist">Wantlist</option>
            <option value="listened">Listened</option>
            <option value="missing">Missing CDs</option>
          </select>
        </label>
      </div>
      <div className="albumTable">
        {filteredAlbums.map((album) => {
          const albumState = state.albums[album.id] ?? {};
          return (
            <article key={album.id} className="albumRow">
              <button className="albumIdentity" onClick={() => openAlbum(album.id)}>
                <AlbumCover album={album} />
                <span className="rank">#{album.rank}</span>
                <span>
                  <strong>{album.title}</strong>
                  <small>
                    {album.artist} • {album.year} {album.genre ? `• ${album.genre}` : ""}
                  </small>
                </span>
              </button>
              <div className="rowToggles">
                <button className={albumState.owned ? "toggle on" : "toggle"} onClick={() => updateAlbum(album.id, { owned: !albumState.owned })}>
                  <Disc3 size={16} /> Owned
                </button>
                <button
                  className={albumState.wantlist ? "toggle on want" : "toggle"}
                  onClick={() => updateAlbum(album.id, { wantlist: !albumState.wantlist })}
                >
                  <Heart size={16} /> Want
                </button>
                <button
                  className={albumState.listened ? "toggle on done" : "toggle"}
                  onClick={() => updateAlbum(album.id, { listened: !albumState.listened, lastListened: !albumState.listened ? todayIso() : albumState.lastListened })}
                >
                  <Check size={16} /> Heard
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AlbumDetail({
  album,
  entry,
  albumState,
  updateAlbum,
  startSession
}: {
  album: Album;
  entry?: EncyclopediaEntry;
  albumState: AlbumState;
  updateAlbum: (albumId: string, patch: Partial<AlbumState>) => void;
  startSession: () => void;
}) {
  const guideByTitle = new Map((entry?.trackGuide ?? []).map((guide) => [guide.trackTitle, guide]));

  return (
    <div className="albumDetail">
      <section className="albumHero">
        <AlbumCover album={album} />
        <div>
          <p className="eyebrow">#{album.rank} / {catalogTotal}</p>
          <h2>{album.title}</h2>
          <p>{album.artist} • {album.year}{album.genre ? ` • ${album.genre}` : ""}</p>
          <div className="chipRow">
            <button className={albumState.owned ? "chip active" : "chip"} onClick={() => updateAlbum(album.id, { owned: !albumState.owned })}>
              <Disc3 size={16} /> CD owned
            </button>
            <button className={albumState.wantlist ? "chip active" : "chip"} onClick={() => updateAlbum(album.id, { wantlist: !albumState.wantlist })}>
              <Heart size={16} /> Wantlist
            </button>
            <button className={albumState.listened ? "chip active" : "chip"} onClick={() => updateAlbum(album.id, { listened: !albumState.listened })}>
              <Check size={16} /> Listened
            </button>
          </div>
          <button className="primary" onClick={startSession}>
            <ListMusic size={17} /> Start listening session
          </button>
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
            <p>{entry?.artistInfo?.summary ?? "No confident artist source was matched for this entry."}</p>
            {entry?.artistInfo?.source && (
              <a className="sourceLink" href={entry.artistInfo.source.url} target="_blank" rel="noreferrer">
                Source: {entry.artistInfo.source.title}
              </a>
            )}
          </article>
          <article>
            <h4>Album</h4>
            <p>{entry?.albumInfo?.summary ?? entry?.context}</p>
            {entry?.albumInfo?.source && (
              <a className="sourceLink" href={entry.albumInfo.source.url} target="_blank" rel="noreferrer">
                Source: {entry.albumInfo.source.title}
              </a>
            )}
          </article>
        </div>
        <p>{entry?.relevance}</p>
        <div className="themeRow">{entry?.themes.map((theme) => <span key={theme}>{theme}</span>)}</div>
      </section>

      <section className="panel full">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Track guide</p>
            <h3>{album.tracks.length ? `${album.tracks.length} tracks` : "Awaiting Apple track enrichment"}</h3>
          </div>
          <ListMusic size={20} />
        </div>
        {album.tracks.length ? (
          <div className="trackList">
            {album.tracks.map((track) => {
              const guide = guideByTitle.get(track.title);
              return (
                <article key={`${track.discNumber}-${track.trackNumber}-${track.title}`} className="trackRow">
                  <span>{track.trackNumber || <CircleDot size={12} />}</span>
                  <div>
                    <strong>{track.title}</strong>
                    {guide?.focus && <em>{guide.focus}</em>}
                    <p>{guide?.guide ?? "Guide text will appear after encyclopedia regeneration."}</p>
                    {guide?.source && (
                      <a className="sourceLink compact" href={guide.source.url} target="_blank" rel="noreferrer">
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
          <p>Run `npm run prepare:catalog` with network access to fetch Apple track listings and cover art.</p>
        )}
      </section>
    </div>
  );
}

function SessionView({
  album,
  entry,
  albums: allAlbums,
  selectedAlbumId,
  setSelectedAlbumId,
  addSession
}: {
  album: Album;
  entry?: EncyclopediaEntry;
  albums: Album[];
  selectedAlbumId: string;
  setSelectedAlbumId: (id: string) => void;
  addSession: (session: ListeningSession) => void;
}) {
  const [notes, setNotes] = useState("");
  const [checkedTracks, setCheckedTracks] = useState<string[]>([]);

  useEffect(() => {
    setCheckedTracks([]);
    setNotes("");
  }, [selectedAlbumId]);

  function toggleTrack(title: string) {
    setCheckedTracks((current) => (current.includes(title) ? current.filter((item) => item !== title) : [...current, title]));
  }

  function finishSession() {
    addSession({
      id: crypto.randomUUID(),
      albumId: album.id,
      startedAt: todayIso(),
      completedAt: todayIso(),
      notes,
      checkedTracks
    });
    setNotes("");
    setCheckedTracks([]);
  }

  return (
    <div className="sessionLayout">
      <section className="sessionNow">
        <AlbumCover album={album} />
        <div>
          <p className="eyebrow">Guided listen</p>
          <h2>{album.title}</h2>
          <p>{album.artist} • #{album.rank}</p>
          <select value={selectedAlbumId} onChange={(event) => setSelectedAlbumId(event.target.value)}>
            {allAlbums.map((item) => (
              <option value={item.id} key={item.id}>
                #{item.rank} {item.title} — {item.artist}
              </option>
            ))}
          </select>
        </div>
      </section>
      <section className="panel">
        <h3>Track checklist</h3>
        {album.tracks.length ? (
          <div className="sessionTracks">
            {album.tracks.map((track) => (
              <label key={`${track.discNumber}-${track.trackNumber}-${track.title}`}>
                <input type="checkbox" checked={checkedTracks.includes(track.title)} onChange={() => toggleTrack(track.title)} />
                <span>{track.title}</span>
              </label>
            ))}
          </div>
        ) : (
          <p>Tracks will appear after Apple enrichment. You can still finish the album-level session.</p>
        )}
      </section>
      <section className="panel full">
        <label className="notesField">
          Session reflection
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What changed after an attentive listen?" />
        </label>
        <button className="primary" onClick={finishSession}>
          <Check size={17} /> Finish session
        </button>
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
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [state]);

  const listened = albums.filter((album) => state.albums[album.id]?.listened).length;
  const owned = albums.filter((album) => state.albums[album.id]?.owned).length;
  const longestBar = Math.max(...ownedByDecade.map(([, count]) => count), 1);

  return (
    <div className="insightsGrid">
      <section className="heroPanel">
        <div>
          <p className="eyebrow">Insights</p>
          <h2>{owned} CDs owned</h2>
          <p>{listened} albums completed, {state.sessions.length} listening sessions logged, and {catalogTotal - owned} catalog gaps remaining.</p>
        </div>
        <div className="progressDial" style={{ "--progress": `${Math.round((owned / catalogTotal) * 100)}%` } as React.CSSProperties}>
          <span>{Math.round((owned / catalogTotal) * 100)}%</span>
        </div>
      </section>
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
                  <i style={{ width: `${(count / longestBar) * 100}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))
          ) : (
            <p>Mark albums as owned to build the decade map.</p>
          )}
        </div>
      </section>
      <section className="panel">
        <h3>Most recent activity</h3>
        <ul className="compactList">
          {state.sessions.slice(0, 8).map((session) => {
            const album = albums.find((item) => item.id === session.albumId);
            return (
              <li key={session.id}>
                <span>{album?.title ?? "Unknown album"}</span>
                <strong>{new Date(session.completedAt ?? session.startedAt).toLocaleDateString()}</strong>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export default App;
