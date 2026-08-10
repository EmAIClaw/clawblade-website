import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'src/data/catalog.generated.json');
const encyclopediaPath = path.join(root, 'src/data/encyclopedia.generated.json');
const cachePath = path.join(root, 'src/data/musicbrainz-track-facts.cache.json');
const delayMs = Number(process.env.MUSICBRAINZ_DELAY_MS ?? 1050);
const limit = Number(process.env.TRACK_FACT_ALBUM_LIMIT ?? 9999);
const retry = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const userAgent = 'AlbumVault/0.1 (source-backed personal music catalog; contact: local-app)';

const compact = (value) => String(value ?? '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
  .replace(/\b(the|a|an)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

const scoreGroup = (album, group) => {
  const title = compact(group.title);
  const artist = compact((group['artist-credit'] ?? []).map((credit) => credit.name ?? credit.artist?.name).join(' '));
  const targetTitle = compact(album.title);
  const targetArtist = compact(album.artist);
  const dateYear = Number(String(group['first-release-date'] ?? '').slice(0, 4));
  const titleScore = title === targetTitle ? 8 : title.includes(targetTitle) || targetTitle.includes(title) ? 4 : 0;
  const artistScore = artist.includes(targetArtist) || targetArtist.includes(artist) ? 5 : 0;
  const yearScore = dateYear === album.year ? 2 : Math.abs(dateYear - album.year) <= 1 ? 1 : 0;
  return titleScore + artistScore + yearScore + (group['primary-type'] === 'Album' ? 1 : 0);
};

async function fetchJson(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': userAgent }, signal: AbortSignal.timeout(20_000) });
      if (response.ok) return response.json();
      if (response.status !== 503 && response.status !== 429) throw new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      if (attempt === 3) throw error;
    }
    await retry(2_000 * (attempt + 1));
  }
  throw new Error(`Unable to fetch ${url}`);
}

function selectRelease(releases, year) {
  return [...releases].sort((left, right) => {
    const leftYear = Number(String(left.date ?? '').slice(0, 4));
    const rightYear = Number(String(right.date ?? '').slice(0, 4));
    const leftScore = (left.status === 'Official' ? 3 : 0) - Math.min(Math.abs(leftYear - year), 10) / 10;
    const rightScore = (right.status === 'Official' ? 3 : 0) - Math.min(Math.abs(rightYear - year), 10) / 10;
    return rightScore - leftScore;
  })[0] ?? null;
}

function recordingMatch(track, release) {
  const target = compact(track.title);
  const candidates = (release.media ?? []).flatMap((medium) => medium.tracks ?? []);
  return candidates.find((candidate) => compact(candidate.title ?? candidate.recording?.title) === target)
    ?? candidates.find((candidate) => {
      const value = compact(candidate.title ?? candidate.recording?.title);
      return value && (value.includes(target) || target.includes(value));
    })
    ?? null;
}

function fallbackSource(album) {
  return {
    label: 'Apple Music',
    title: `${album.artist} — ${album.title}`,
    url: album.appleCollectionUrl ?? `https://music.apple.com/search?term=${encodeURIComponent(`${album.artist} ${album.title}`)}`,
    summary: 'AlbumVault runtime edition and ordered track metadata.',
    description: 'Runtime collection source',
    score: 1
  };
}

function sourceBackedGuide(album, track, index, match, release) {
  const duration = track.durationMs ? `${Math.floor(track.durationMs / 60000)}:${String(Math.round(track.durationMs / 1000) % 60).padStart(2, '0')}` : 'an unlisted duration';
  if (!match?.recording?.id) {
    const source = fallbackSource(album);
    return {
      trackTitle: track.title,
      guide: `Apple Music’s ${album.title} edition identifies “${track.title}” as track ${index + 1} (${duration}). The linked collection is the runtime source for this exact album sequence; independent recording-level research is still pending.`,
      focus: 'Verified runtime edition, title, order, and duration',
      source
    };
  }
  const creditedArtists = (match.recording['artist-credit'] ?? match['artist-credit'] ?? [])
    .map((credit) => credit.name ?? credit.artist?.name).filter(Boolean).join(', ') || album.artist;
  const releaseTitle = release.title ?? album.title;
  const source = {
    label: 'MusicBrainz',
    title: `${match.recording.title ?? track.title} — recording`,
    url: `https://musicbrainz.org/recording/${match.recording.id}`,
    summary: `MusicBrainz identifies this recording as “${match.recording.title ?? track.title}” credited to ${creditedArtists}, on the matched release ${releaseTitle}.`,
    description: 'MusicBrainz recording record',
    score: 1
  };
  return {
    trackTitle: track.title,
    guide: `MusicBrainz identifies “${match.recording.title ?? track.title}” as a recording credited to ${creditedArtists} on ${releaseTitle}. AlbumVault places it at track ${index + 1} of this edition (${duration}); open the recording record for linked release and artist-credit details.`,
    focus: 'Verified recording identity, artist credit, release association, order, and duration',
    source
  };
}

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const encyclopedia = JSON.parse(await readFile(encyclopediaPath, 'utf8'));
let cache = {};
try { cache = JSON.parse(await readFile(cachePath, 'utf8')); } catch { cache = {}; }
let processed = 0;
let sourceBacked = 0;
let fallbacks = 0;
let failures = 0;

for (const album of catalog.albums) {
  if (processed >= limit) break;
  const entry = encyclopedia.entries?.[album.id];
  if (!entry?.trackGuide || !album.tracks?.length) continue;
  processed += 1;
  let release = cache[album.id]?.release ?? null;
  try {
    if (!release) {
      const search = await fetchJson(`https://musicbrainz.org/ws/2/release-group?fmt=json&limit=5&query=${encodeURIComponent(`releasegroup:"${album.title}" AND artist:"${album.artist}"`)}`);
      const group = [...(search['release-groups'] ?? [])].sort((a, b) => scoreGroup(album, b) - scoreGroup(album, a))[0];
      if (!group || scoreGroup(album, group) < 10) throw new Error('No confident release-group match');
      await retry(delayMs);
      const releaseSearch = await fetchJson(`https://musicbrainz.org/ws/2/release?fmt=json&limit=20&inc=recordings+artist-credits&release-group=${group.id}`);
      release = selectRelease(releaseSearch.releases ?? [], album.year);
      if (!release?.media?.length) throw new Error('No release track metadata');
      cache[album.id] = { release };
      await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
      await retry(delayMs);
    }
    entry.trackGuide = album.tracks.map((track, index) => {
      const existing = entry.trackGuide.find((guide) => guide.trackTitle === track.title);
      if (existing?.source?.url && !/static track metadata only/.test(existing.guide ?? '')) return existing;
      const guide = sourceBackedGuide(album, track, index, recordingMatch(track, release), release);
      if (guide.source.label === 'MusicBrainz') sourceBacked += 1;
      else fallbacks += 1;
      return guide;
    });
    entry.relevance = String(entry.relevance ?? '').replace(/Track-specific source summaries: \d+\./, `Track-specific source summaries: ${entry.trackGuide.filter((guide) => guide.source?.url).length}.`);
    entry.sources = Array.from(new Map([...(entry.sources ?? []), ...entry.trackGuide.map((guide) => guide.source)].filter((source) => source?.url).map((source) => [source.url, source])).values());
    console.log(`#${album.rank} ${album.artist} — ${album.title}: enriched`);
  } catch (error) {
    failures += 1;
    entry.trackGuide = album.tracks.map((track, index) => {
      const existing = entry.trackGuide.find((guide) => guide.trackTitle === track.title);
      if (existing?.source?.url && !/static track metadata only/.test(existing.guide ?? '')) return existing;
      fallbacks += 1;
      return sourceBackedGuide(album, track, index, null, null);
    });
    console.warn(`#${album.rank} ${album.title}: ${error.message}; used Apple Music runtime fallback`);
  }
  if (processed % 10 === 0) await writeFile(encyclopediaPath, `${JSON.stringify(encyclopedia, null, 2)}\n`);
}

encyclopedia.metadata = { ...(encyclopedia.metadata ?? {}), allTrackFactsEnrichedAt: new Date().toISOString(), allTrackFacts: { processedAlbums: processed, musicBrainzGuides: sourceBacked, runtimeFallbackGuides: fallbacks, failures } };
await writeFile(encyclopediaPath, `${JSON.stringify(encyclopedia, null, 2)}\n`);
console.log(JSON.stringify({ processed, sourceBacked, fallbacks, failures }, null, 2));
