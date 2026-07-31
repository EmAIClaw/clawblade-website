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
const repairMissing = process.argv.includes("--repair-missing");
const offline = process.argv.includes("--offline") || process.env.ALBUMVAULT_OFFLINE === "1";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sourceCache = new Map();

// Exact article titles for catalog names that Wikipedia search routinely
// disambiguates to a non-music page. Keep this list narrow and verified.
const artistArticleAliases = {
  "Marvin Gaye": "Marvin Gaye",
  "The Beach Boys": "The Beach Boys",
  "Joni Mitchell": "Joni Mitchell",
  "Prince and the Revolution": "The Revolution (band)",
  Drake: "Drake (musician)",
  "New Order": "New Order (band)",
  Eagles: "Eagles (band)",
  Queen: "Queen (band)",
  Portishead: "Portishead (band)",
  Pixies: "Pixies (band)",
  Blondie: "Blondie (band)",
  Pulp: "Pulp (band)",
  Pavement: "Pavement (band)",
  Sade: "Sade (band)",
  TLC: "TLC (group)",
  "Dixie Chicks": "The Chicks"
};

const albumArticleAliases = {
  "001-marvin-gaye-what-s-going-on-fd00dde9": "What's Going On (Marvin Gaye album)",
  "002-the-beach-boys-pet-sounds-eabcc325": "Pet Sounds",
  "003-joni-mitchell-blue-9c3a8b85": "Blue (Joni Mitchell album)",
  "025-carole-king-tapestry-b29b056b": "Tapestry (Carole King album)",
  "028-d-angelo-voodoo-b6406009": "Voodoo (D'Angelo album)",
  "038-frank-ocean-blonde-ef1630f4": "Blonde (Frank Ocean album)",
  "069-bob-marley-and-the-wailers-exodus-2395620b": "Exodus (Bob Marley and the Wailers album)",
  "070-neil-young-harvest-93a984b7": "Harvest (Neil Young album)",
  "074-curtis-mayfield-superfly-510928e7": "Super Fly (soundtrack)",
  "092-the-stooges-fun-house-9896fe5c": "Fun House (The Stooges album)",
  "097-taylor-swift-red-6f0a0ed0": "Red (Taylor Swift album)",
  "107-new-order-substance-6d4ec0bb": "Substance 1987",
  "114-the-cure-disintegration-6776240e": "Disintegration (The Cure album)",
  "124-mary-j-blige-my-life-da7feba0": "My Life (Mary J. Blige album)",
  "126-queen-a-night-at-the-opera-2045d295": "A Night at the Opera (Queen album)",
  "130-hank-williams-40-greatest-hits-89cb7a38": "40 Greatest Hits (Hank Williams album)",
  "135-adele-21-c2972a58": "21 (Adele album)",
  "144-jeff-buckley-grace-40adc563": "Grace (Jeff Buckley album)",
  "148-george-michael-faith-e774a01a": "Faith (George Michael album)",
  "152-jay-z-the-black-album-9747cc3a": "The Black Album (Jay-Z album)",
  "153-the-replacements-let-it-be-6ba5cb14": "Let It Be (The Replacements album)",
  "156-the-police-synchronicity-e8507abf": "Synchronicity (The Police album)",
  "157-pearl-jam-ten-4e010abd": "Ten (Pearl Jam album)",
  "158-crosby-stills-nash-and-young-deja-vu-2033c437": "Déjà Vu (Crosby, Stills, Nash & Young album)",
  "161-buddy-holly-20-golden-greats-83b1a203": "20 Golden Greats (Buddy Holly & The Crickets album)",
  "169-jimmy-cliff-the-harder-they-come-14dcb1c3": "The Harder They Come (soundtrack)",
  "173-otis-redding-otis-blue-26f8fa66": "Otis Blue/Otis Redding Sings Soul",
  "176-bob-dylan-bring-it-all-back-home-aa529df8": "Bringing It All Back Home",
  "178-d-angelo-brown-sugar-494ed407": "Brown Sugar (D'Angelo album)",
  "184-the-who-tommy-b4a199d7": "Tommy (The Who album)",
  "190-robyn-body-talk-7b7f26d0": "Body Talk (Robyn album)",
  "208-tom-petty-wildflowers-8b43694b": "Wildflowers (Tom Petty album)",
  "216-john-lennon-imagine-4759bad6": "Imagine (John Lennon album)",
  "217-dixie-chicks-fly-b6577223": "Fly (Dixie Chicks album)",
  "222-patsy-cline-showcase-830924eb": "Showcase (Patsy Cline album)",
  "229-daft-punk-discovery-c80db397": "Discovery (Daft Punk album)",
  "230-willie-nelson-stardust-aa298a2b": "Stardust (Willie Nelson album)",
  "235-the-velvet-underground-loaded-c69903c2": "Loaded (The Velvet Underground album)"
};

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
  const exactArticle = albumArticleAliases[album.id];
  if (exactArticle) return wikipediaSummary(exactArticle, 1);
  const pages = await wikipediaSearch(`${album.title} ${album.artist} album`, `album:${album.id}`);
  const ranked = pages.map((page) => ({ page, score: scoreAlbumResult(album, page) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < 0.48) return null;
  return wikipediaSummary(best.page.title, best.score);
}

async function artistSource(artist) {
  const exactArticle = artistArticleAliases[artist];
  if (exactArticle) return wikipediaSummary(exactArticle, 1);
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
    const currentEntry = existing.entries?.[album.id];
    const hasCompleteReference = Boolean(currentEntry?.artistInfo && currentEntry?.albumInfo);
    if (!force && currentEntry && (!repairMissing || hasCompleteReference)) {
      continue;
    }
    if (processedThisRun >= albumLimit) break;

    try {
      let artistSourceValue = currentEntry?.artistInfo?.source ?? artistSources[album.artist];
      if (!currentEntry?.artistInfo && artistSourceValue === undefined) {
        artistSourceValue = await artistSource(album.artist);
        artistSources[album.artist] = artistSourceValue;
        if (artistSourceValue) report.artistSourceMatches += 1;
        else report.unmatchedArtistSources.push(album.artist);
      }

      let albumSourceValue = currentEntry?.albumInfo?.source ?? null;
      if (!currentEntry?.albumInfo) {
        albumSourceValue = await albumSource(album);
        if (albumSourceValue) report.albumSourceMatches += 1;
        else report.unmatchedAlbumSources.push({ albumId: album.id, title: album.title, artist: album.artist });
      }

      if (repairMissing) {
        const nextArtistInfo = currentEntry?.artistInfo ?? (artistSourceValue
          ? { summary: artistSourceValue.summary, source: artistSourceValue }
          : null);
        const nextAlbumInfo = currentEntry?.albumInfo ?? (albumSourceValue
          ? { summary: albumSourceValue.summary, source: albumSourceValue }
          : null);
        const sources = [
          ...(currentEntry?.sources ?? []),
          artistSourceValue,
          albumSourceValue
        ].filter(Boolean);
        const dedupedSources = Array.from(
          new Map(sources.map((source) => [source.url || `${source.label}:${source.title}`, source])).values()
        );
        const nextListeningNotes = (currentEntry?.listeningNotes ?? listeningNotes(album, albumSourceValue, artistSourceValue, 0))
          .map((note) => !currentEntry?.artistInfo && /^No confident artist source was matched/.test(note)
            ? `Start with the artist context from ${artistSourceValue.title}; listen for how this album fits or breaks from that wider story.`
            : note)
          .map((note) => !currentEntry?.albumInfo && /^No confident album source was matched/.test(note)
            ? `Read the album summary from ${albumSourceValue.title}, then identify one audible detail that connects to the sourced context.`
            : note);
        entries[album.id] = {
          ...currentEntry,
          albumId: album.id,
          artistInfo: nextArtistInfo,
          albumInfo: nextAlbumInfo,
          context: currentEntry?.albumInfo ? currentEntry.context : context(album, albumSourceValue),
          relevance: relevance(
            album,
            nextArtistInfo?.source ?? null,
            nextAlbumInfo?.source ?? null,
            (currentEntry?.trackGuide ?? []).filter((guide) => guide.source).length
          ),
          listeningNotes: nextListeningNotes,
          trackGuide: currentEntry?.trackGuide ?? (album.tracks.length ? trackGuide(album, {}) : []),
          themes: currentEntry?.themes ?? themes(album, artistSourceValue, albumSourceValue, 0),
          sources: dedupedSources
        };
        report.generated += 1;
        processedThisRun += 1;
        await writeFile(outputPath, `${JSON.stringify({ metadata: report, entries }, null, 2)}\n`);
        await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
        continue;
      }

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
      entries[album.id] = repairMissing && currentEntry
        ? currentEntry
        : {
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
