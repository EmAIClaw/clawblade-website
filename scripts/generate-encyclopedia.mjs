import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "src/data/catalog.generated.json");
const outputPath = path.join(root, "src/data/encyclopedia.generated.json");
const reportPath = path.join(root, "src/data/enrichment-report.json");
const requestTimeoutMs = Number(process.env.ENCYCLOPEDIA_REQUEST_TIMEOUT_MS ?? 20000);
const wikipediaDelayMs = Number(process.env.WIKIPEDIA_DELAY_MS ?? 90);
const trackLookupLimit = Number(process.env.TRACK_LOOKUP_LIMIT ?? 99999);
const albumLimit = Number(process.env.ENCYCLOPEDIA_ALBUM_LIMIT ?? 99999);
const force = process.argv.includes("--force");
const offline = process.argv.includes("--offline") || process.env.ALBUMVAULT_OFFLINE === "1";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sourceCache = new Map();

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(the|a|an)\b/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .toLowerCase()
    .trim();
}

function similarity(a, b) {
  const left = new Set(normalizeText(a).split(/\s+/).filter(Boolean));
  const right = new Set(normalizeText(b).split(/\s+/).filter(Boolean));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / Math.max(left.size, right.size);
}

function compactText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function firstSentences(text, limit = 3) {
  const value = compactText(text);
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    const sentences = Array.from(segmenter.segment(value), (segment) => segment.segment.trim()).filter(Boolean);
    return sentences.slice(0, limit).join(" ").trim();
  }
  const sentences = value.match(/[^.!?]+[.!?]+(?=\s+[A-Z"']|$)/g);
  return (sentences?.slice(0, limit).join(" ") ?? value).trim();
}

function formatDuration(ms) {
  if (!ms) return "duration unavailable";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function requestHeaders() {
  return {
    "User-Agent": "AlbumVault/0.1 (personal source-grounded encyclopedia; https://localhost)",
    Accept: "application/json"
  };
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const response = await fetch(url, {
    headers: requestHeaders(),
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

function sourceFromSummary(summary, score, label = "Wikipedia") {
  if (summary.type === "disambiguation" || !summary.extract) return null;
  return {
    label,
    title: summary.title,
    url: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(String(summary.title).replaceAll(" ", "_"))}`,
    extract: compactText(summary.extract),
    summary: firstSentences(summary.extract, 3),
    description: summary.description ?? null,
    score: Number(score.toFixed(3))
  };
}

async function wikipediaSearch(query, cacheKey) {
  if (offline) return [];
  if (sourceCache.has(cacheKey)) return sourceCache.get(cacheKey);
  const searchUrl =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit=8&srsearch=" +
    encodeURIComponent(query);
  const search = await fetchJson(searchUrl);
  const pages = search.query?.search ?? [];
  sourceCache.set(cacheKey, pages);
  await sleep(wikipediaDelayMs);
  return pages;
}

async function wikipediaSummary(title, score) {
  const cacheKey = `summary:${title}`;
  if (sourceCache.has(cacheKey)) return sourceCache.get(cacheKey);
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summary = await fetchJson(summaryUrl);
  const source = sourceFromSummary(summary, score);
  sourceCache.set(cacheKey, source);
  await sleep(wikipediaDelayMs);
  return source;
}

function scoreAlbumResult(album, page) {
  const title = page.title ?? "";
  const snippet = String(page.snippet ?? "").replace(/<[^>]+>/g, " ");
  const titleScore = Math.max(similarity(album.title, title), similarity(`${album.title} album`, title));
  const artistScore = similarity(album.artist, `${title} ${snippet}`);
  const albumHint = /\balbum\b/i.test(`${title} ${snippet}`) ? 1 : 0;
  const titleAlbumHint = /\(album\)/i.test(title) ? 1 : 0;
  return titleScore * 0.52 + artistScore * 0.26 + albumHint * 0.14 + titleAlbumHint * 0.08;
}

function scoreArtistResult(artist, page) {
  const title = page.title ?? "";
  const snippet = String(page.snippet ?? "").replace(/<[^>]+>/g, " ");
  const artistNorm = normalizeText(artist);
  const titleNorm = normalizeText(title);
  const exactTitle = titleNorm === artistNorm || String(title).toLowerCase().startsWith(`${String(artist).toLowerCase()} (`);
  const wrongPageType = /\b(album|song|single|discography|film|tour)\b/i.test(title);
  const nameScore = similarity(artist, title);
  const musicHint = /\b(singer|musician|band|rapper|group|artist|songwriter|composer|rock|jazz|soul|hip hop|pop)\b/i.test(snippet)
    ? 1
    : 0;
  const score = nameScore * 0.78 + musicHint * 0.22;
  if (wrongPageType && !exactTitle) return Math.min(score, 0.45);
  if (!exactTitle && nameScore < 0.82) return Math.min(score, 0.55);
  return score;
}

function scoreTrackResult(album, track, page) {
  const title = page.title ?? "";
  const snippet = String(page.snippet ?? "").replace(/<[^>]+>/g, " ");
  const haystack = `${title} ${snippet}`;
  const titleScore = Math.max(similarity(track.title, title), similarity(`${track.title} song`, title));
  const artistScore = similarity(album.artist, haystack);
  const songHint = /\b(song|single|track)\b/i.test(haystack) ? 1 : 0;
  const albumHint = similarity(album.title, haystack);
  return titleScore * 0.5 + artistScore * 0.25 + songHint * 0.15 + albumHint * 0.1;
}

async function albumSource(album) {
  const pages = await wikipediaSearch(`${album.title} ${album.artist} album`, `album:${album.id}`);
  const ranked = pages.map((page) => ({ page, score: scoreAlbumResult(album, page) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < 0.48) return null;
  return wikipediaSummary(best.page.title, best.score);
}

async function artistSource(artist) {
  const pages = await wikipediaSearch(`${artist}`, `artist:${normalizeText(artist)}`);
  const ranked = pages.map((page) => ({ page, score: scoreArtistResult(artist, page) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < 0.7) return null;
  return wikipediaSummary(best.page.title, best.score);
}

async function trackSource(album, track) {
  const pages = await wikipediaSearch(`${track.title} ${album.artist} song`, `track:${album.id}:${track.discNumber}:${track.trackNumber}:${track.title}`);
  const ranked = pages.map((page) => ({ page, score: scoreTrackResult(album, track, page) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < 0.6) return null;
  const source = await wikipediaSummary(best.page.title, best.score);
  if (!source) return null;
  const sourceText = `${source.title} ${source.extract}`;
  const artistEvidence = similarity(album.artist, sourceText);
  const titleEvidence = similarity(track.title, source.title);
  if (artistEvidence < 0.12 && titleEvidence < 0.72) return null;
  return source;
}

function trackPosition(index, total) {
  if (index === 0) return "opener";
  if (index === total - 1) return "closer";
  if (index < total / 3) return "early-album track";
  if (index < (total * 2) / 3) return "middle-section track";
  return "late-album track";
}

function trackGuide(album, trackSources) {
  const total = album.tracks.length;
  return album.tracks.map((track, index) => {
    const previous = index > 0 ? album.tracks[index - 1]?.title : null;
    const next = index < total - 1 ? album.tracks[index + 1]?.title : null;
    const source = trackSources[track.title] ?? null;
    const sequenceNote = previous && next
      ? `In the album sequence it follows "${previous}" and leads into "${next}".`
      : previous
        ? `In the album sequence it follows "${previous}" and closes the current track list.`
        : next
          ? `In the album sequence it opens the record and leads into "${next}".`
          : `It is the only listed track in the current metadata.`;
    const sourcedFact = source
      ? `${source.summary} Source: ${source.title}.`
      : `No confident track-specific external source was found, so this entry uses static track metadata only.`;
    return {
      trackTitle: track.title,
      guide: `Track ${track.trackNumber || index + 1} of ${total}, "${track.title}", is the album's ${trackPosition(index, total)} and runs ${formatDuration(track.durationMs)}. ${sequenceNote} ${sourcedFact}`,
      focus: source ? "Verified track source summary and album sequence context" : "Track metadata and album sequence context only",
      source
    };
  });
}

function listeningNotes(album, albumSourceValue, artistSourceValue, trackSourceCount) {
  return [
    artistSourceValue
      ? `Start with the artist context from ${artistSourceValue.title}; listen for how this album fits or breaks from that wider story.`
      : `No confident artist source was matched; keep artist notes tied to the album metadata and what you hear.`,
    albumSourceValue
      ? `Read the album summary from ${albumSourceValue.title}, then identify one audible detail that connects to the sourced context.`
      : `No confident album source was matched; treat this as a metadata-only entry until a source is added.`,
    trackSourceCount
      ? `${trackSourceCount} tracks have their own source summaries. Use those as anchors, and avoid adding unsourced claims to the remaining tracks.`
      : `No track-specific source summaries were found; use the track guide for sequence, duration, and close-listening structure only.`
  ];
}

function themes(album, artistSourceValue, albumSourceValue, trackSourceCount) {
  const values = ["Static reference", "Source-backed facts", "Track sequence"];
  if (album.genre) values.push(album.genre);
  if (artistSourceValue?.description) values.push(artistSourceValue.description);
  if (albumSourceValue?.description) values.push(albumSourceValue.description);
  if (trackSourceCount) values.push(`${trackSourceCount} sourced tracks`);
  return Array.from(new Set(values)).slice(0, 6);
}

function context(album, albumSourceValue) {
  if (!albumSourceValue) {
    return `${album.title} by ${album.artist} (${album.year}) is album #${album.rank} in this AlbumVault catalog. No confident album article was matched, so AlbumVault stores only catalog metadata for this album context.`;
  }
  return albumSourceValue.summary;
}

function relevance(album, artistSourceValue, albumSourceValue, trackSourceCount) {
  const metadata = `${album.genre ? `${album.genre}; ` : ""}${album.tracks.length ? `${album.tracks.length} Apple-derived tracks` : "no Apple track list"}; listed year ${album.year}.`;
  const artistLine = artistSourceValue ? `Artist source: ${artistSourceValue.title}.` : "Artist source: not confidently matched.";
  const albumLine = albumSourceValue ? `Album source: ${albumSourceValue.title}.` : "Album source: not confidently matched.";
  return `AlbumVault ranks it #${album.rank}. ${metadata} ${artistLine} ${albumLine} Track-specific source summaries: ${trackSourceCount}.`;
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  let existing = { entries: {} };
  try {
    existing = JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    existing = { entries: {} };
  }
  const entries = force ? {} : { ...(existing.entries ?? {}) };
  const artistSources = {};
  const report = {
    generatedAt: new Date().toISOString(),
    mode: offline ? "offline-static-reference" : "wikipedia-static-reference",
    total: catalog.albums.length,
    generated: 0,
    albumSourceMatches: 0,
    artistSourceMatches: 0,
    trackSourceMatches: 0,
    trackLookups: 0,
    unmatchedAlbumSources: [],
    unmatchedArtistSources: [],
    unmatchedTrackSources: [],
    errors: []
  };

  let processedThisRun = 0;
  for (const album of catalog.albums) {
    if (!force && entries[album.id]?.artistInfo !== undefined && entries[album.id]?.albumInfo !== undefined) {
      continue;
    }
    if (processedThisRun >= albumLimit) break;

    try {
      let artistSourceValue = artistSources[album.artist];
      if (artistSourceValue === undefined) {
        artistSourceValue = await artistSource(album.artist);
        artistSources[album.artist] = artistSourceValue;
        if (artistSourceValue) report.artistSourceMatches += 1;
        else report.unmatchedArtistSources.push(album.artist);
      }

      const albumSourceValue = await albumSource(album);
      if (albumSourceValue) report.albumSourceMatches += 1;
      else report.unmatchedAlbumSources.push({ albumId: album.id, title: album.title, artist: album.artist });

      const trackSources = {};
      for (const guide of existing.entries?.[album.id]?.trackGuide ?? []) {
        if (guide.source) {
          trackSources[guide.trackTitle] = guide.source;
        }
      }
      for (const track of album.tracks) {
        if (trackSources[track.title]) continue;
        if (report.trackLookups >= trackLookupLimit) break;
        report.trackLookups += 1;
        try {
          const source = await trackSource(album, track);
          if (source) {
            trackSources[track.title] = source;
          } else {
            report.unmatchedTrackSources.push({ albumId: album.id, album: album.title, artist: album.artist, track: track.title });
          }
        } catch (error) {
          report.errors.push({
            albumId: album.id,
            title: album.title,
            track: track.title,
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const trackSourceCount = Object.keys(trackSources).length;
      report.trackSourceMatches += trackSourceCount;
      const sources = [artistSourceValue, albumSourceValue, ...Object.values(trackSources)].filter(Boolean);
      entries[album.id] = {
        albumId: album.id,
        artistInfo: artistSourceValue
          ? {
              summary: artistSourceValue.summary,
              source: artistSourceValue
            }
          : null,
        albumInfo: albumSourceValue
          ? {
              summary: albumSourceValue.summary,
              source: albumSourceValue
            }
          : null,
        context: context(album, albumSourceValue),
        relevance: relevance(album, artistSourceValue, albumSourceValue, trackSourceCount),
        listeningNotes: listeningNotes(album, albumSourceValue, artistSourceValue, trackSourceCount),
        trackGuide: album.tracks.length ? trackGuide(album, trackSources) : [],
        themes: themes(album, artistSourceValue, albumSourceValue, trackSourceCount),
        sources
      };
      report.generated += 1;
      processedThisRun += 1;
    } catch (error) {
      entries[album.id] = {
        albumId: album.id,
        artistInfo: null,
        albumInfo: null,
        context: context(album, null),
        relevance: relevance(album, null, null, 0),
        listeningNotes: listeningNotes(album, null, null, 0),
        trackGuide: album.tracks.length ? trackGuide(album, {}) : [],
        themes: themes(album, null, null, 0),
        sources: []
      };
      report.errors.push({
        albumId: album.id,
        title: album.title,
        message: error instanceof Error ? error.message : String(error)
      });
      processedThisRun += 1;
    }

    await writeFile(outputPath, `${JSON.stringify({ metadata: report, entries }, null, 2)}\n`);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  report.unmatchedArtistSources = Array.from(new Set(report.unmatchedArtistSources)).sort();
  report.processedThisRun = processedThisRun;
  report.skippedExisting = catalog.albums.length - processedThisRun;
  await writeFile(outputPath, `${JSON.stringify({ metadata: report, entries }, null, 2)}\n`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote static reference entries for ${report.generated}/${report.total} albums.`);
  console.log(`Artist sources: ${report.artistSourceMatches}; album sources: ${report.albumSourceMatches}; track sources: ${report.trackSourceMatches}/${report.trackLookups}; errors: ${report.errors.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
