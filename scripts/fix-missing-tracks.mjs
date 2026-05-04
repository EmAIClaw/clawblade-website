import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "src/data/catalog.generated.json");
const delayMs = Number(process.env.APPLE_DELAY_MS ?? 2000);
const requestTimeoutMs = 20000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

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

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "AlbumVault/0.1 fixer" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function lookupTracks(collectionId) {
  const url = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song&country=US`;
  const data = await fetchJson(url);
  return (data.results ?? [])
    .filter((item) => item.wrapperType === "track" && item.kind === "song")
    .sort((a, b) => (a.discNumber ?? 1) - (b.discNumber ?? 1) || (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
    .map((track) => ({
      discNumber: track.discNumber ?? 1,
      trackNumber: track.trackNumber ?? 0,
      title: track.trackName,
      durationMs: track.trackTimeMillis ?? null,
      previewUrl: track.previewUrl ?? null
    }));
}

function scoreMatch(album, candidate) {
  const titleScore = similarity(album.title, candidate.collectionName);
  const artistScore = similarity(album.artist, candidate.artistName);
  const year = candidate.releaseDate ? Number(candidate.releaseDate.slice(0, 4)) : undefined;
  const yearScore = year === album.year ? 1 : year && Math.abs(year - album.year) <= 1 ? 0.6 : 0;
  return titleScore * 0.48 + artistScore * 0.42 + yearScore * 0.1;
}

async function searchApple(album) {
  const term = encodeURIComponent(`${album.artist} ${album.title}`);
  const urls = [
    `https://itunes.apple.com/search?term=${term}&media=music&entity=album&attribute=albumTerm&limit=10&country=US`,
    `https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=15&country=US`,
    `https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=15&country=GB`
  ];
  const ranked = [];
  for (const url of urls) {
    try {
      const data = await fetchJson(url);
      ranked.push(
        ...(data.results ?? [])
          .filter((c) => c.wrapperType === "collection")
          .map((c) => ({ candidate: c, score: scoreMatch(album, c) }))
      );
    } catch (e) {
      console.log(`    ⚠ Search failed for ${album.title}: ${e.message}`);
    }
    await sleep(Math.round(delayMs / 3));
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= 0.5 ? ranked[0] : null;
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const empty = catalog.albums.filter((a) => a.tracks.length === 0);
  console.log(`Found ${empty.length} albums with 0 tracks\n`);

  let fixed = 0;
  let failed = 0;

  for (const album of empty) {
    console.log(`🎵 #${album.rank} "${album.title}" by ${album.artist}`);

    if (album.appleCollectionId) {
      // Has ID but no tracks — just lookup tracks
      console.log(`  → Has collectionId ${album.appleCollectionId}, looking up tracks...`);
      try {
        album.tracks = await lookupTracks(album.appleCollectionId);
        await sleep(delayMs);
        console.log(`  ✅ Got ${album.tracks.length} tracks`);
        fixed++;
      } catch (e) {
        console.log(`  ❌ Track lookup failed: ${e.message}`);
        failed++;
      }
    } else {
      // No collectionId — search Apple Music
      console.log(`  → No collectionId, searching Apple Music...`);
      try {
        const match = await searchApple(album);
        await sleep(delayMs);
        if (match) {
          album.appleCollectionId = match.candidate.collectionId;
          album.appleCollectionUrl = match.candidate.collectionViewUrl ?? null;
          album.appleArtworkUrl = match.candidate.artworkUrl100?.replace(/\/\d+x\d+bb\./, "/600x600bb.") ?? null;
          if (!album.genre) album.genre = match.candidate.primaryGenreName ?? null;
          
          console.log(`  → Matched: ${match.candidate.collectionName} (score: ${match.score.toFixed(3)}), looking up tracks...`);
          album.tracks = await lookupTracks(match.candidate.collectionId);
          await sleep(delayMs);
          console.log(`  ✅ Got ${album.tracks.length} tracks + collectionId=${album.appleCollectionId}`);
          fixed++;
        } else {
          console.log(`  ❌ No good match found (${ranked.length} candidates checked)`);
          failed++;
        }
      } catch (e) {
        console.log(`  ❌ Search failed: ${e.message}`);
        failed++;
      }
    }
  }

  // Save updated catalog
  catalog.metadata.generatedAt = new Date().toISOString();
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2));
  
  const stillEmpty = catalog.albums.filter((a) => a.tracks.length === 0);
  console.log(`\n🏁 Done. Fixed: ${fixed}, Failed: ${failed}, Still empty: ${stillEmpty.length}`);
  if (stillEmpty.length > 0) {
    console.log("Still missing:");
    for (const a of stillEmpty) {
      console.log(`  #${a.rank} "${a.title}" by ${a.artist}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
