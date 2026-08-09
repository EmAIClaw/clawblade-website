import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = process.env.CATALOG_SOURCE ?? "/Users/ai/Downloads/cd_collection.json";
const outputPath = path.join(root, "src/data/catalog.generated.json");
const reportPath = path.join(root, "src/data/import-report.json");
const coversDir = path.join(root, "public/covers");
const offline = process.argv.includes("--offline") || process.env.ALBUMVAULT_OFFLINE === "1";
const force = process.argv.includes("--force");
const appleDelayMs = Number(process.env.APPLE_DELAY_MS ?? 750);
const googleDelayMs = Number(process.env.GOOGLE_DELAY_MS ?? 300);
const requestTimeoutMs = Number(process.env.COVER_REQUEST_TIMEOUT_MS ?? 20000);
const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const googleCx = process.env.GOOGLE_CUSTOM_SEARCH_CX;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function albumId(album) {
  const base = `${String(album.number).padStart(3, "0")}-${slugify(album.artist)}-${slugify(album.album)}`;
  const hash = createHash("sha1").update(`${album.artist}|${album.album}|${album.year}`).digest("hex").slice(0, 8);
  return `${base}-${hash}`;
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

function scoreMatch(album, candidate) {
  const titleScore = similarity(album.album, candidate.collectionName);
  const artistScore = similarity(album.artist, candidate.artistName);
  const year = candidate.releaseDate ? Number(candidate.releaseDate.slice(0, 4)) : undefined;
  const yearScore = year === album.year ? 1 : year && Math.abs(year - album.year) <= 1 ? 0.6 : 0;
  return titleScore * 0.48 + artistScore * 0.42 + yearScore * 0.1;
}

const catalogYearOverrides = new Map([
  ["Sam Cooke|Live at the Harlem Square Club", 1985]
]);

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AlbumVault/0.1 personal catalog importer"
    },
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function searchApple(album) {
  const term = encodeURIComponent(`${album.artist} ${album.album}`);
  const urls = [
    `https://itunes.apple.com/search?term=${term}&media=music&entity=album&attribute=albumTerm&limit=12&country=US`,
    `https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=20&country=US`,
    `https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=20&country=GB`
  ];
  const ranked = [];
  for (const url of urls) {
    const data = await fetchJson(url);
    ranked.push(
      ...(data.results ?? [])
        .filter((candidate) => candidate.wrapperType === "collection")
        .map((candidate) => ({ candidate, score: scoreMatch(album, candidate) }))
    );
    await sleep(Math.round(appleDelayMs / 3));
  }
  ranked.sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) return null;
  // Prevent artist-only overlap from attaching a similarly named but
  // different album, such as Ten -> Live on Ten Legs.
  return best.score >= 0.52 && similarity(album.album, best.candidate.collectionName) >= 0.6 ? best : null;
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

function highResArtwork(url) {
  return url ? url.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, "/600x600bb.$1") : null;
}

function normalizeCoverPath(value) {
  if (typeof value !== "string") return "/covers/placeholder.svg";
  const publicPath = value.startsWith("/public/")
    ? value.slice("/public".length)
    : value;
  return publicPath.startsWith("/covers/")
    ? publicPath
    : "/covers/placeholder.svg";
}

async function downloadCover(url, id) {
  if (!url) return "/covers/placeholder.svg";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
  if (!response.ok) return "/covers/placeholder.svg";
  const bytes = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(coversDir, `${id}.jpg`);
  await writeFile(filePath, bytes);
  return `/covers/${id}.jpg`;
}

function googleEnabled() {
  return Boolean(googleApiKey && googleCx);
}

function googleScore(album, item) {
  const title = `${item.title ?? ""} ${item.snippet ?? ""}`;
  const image = item.image ?? {};
  const width = Number(image.width ?? 0);
  const height = Number(image.height ?? 0);
  const squareScore = width && height ? 1 - Math.min(Math.abs(width - height) / Math.max(width, height), 1) : 0.3;
  const textScore = similarity(`${album.artist} ${album.album}`, title);
  const sizeScore = Math.min(Math.max(width, height) / 600, 1);
  return textScore * 0.55 + squareScore * 0.3 + sizeScore * 0.15;
}

async function searchGoogleCover(album) {
  if (!googleEnabled()) return null;
  const query = encodeURIComponent(`"${album.artist}" "${album.album}" album cover`);
  const url =
    `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleApiKey)}` +
    `&cx=${encodeURIComponent(googleCx)}&q=${query}&searchType=image&num=8&safe=active&imgType=photo`;
  const data = await fetchJson(url);
  const ranked = (data.items ?? [])
    .filter((item) => item.link && /^https?:\/\//i.test(item.link))
    .map((item) => ({ item, score: googleScore(album, item) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= 0.42 ? ranked[0] : null;
}

async function downloadGoogleCover(item, id) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const response = await fetch(item.link, {
    headers: {
      "User-Agent": "AlbumVault/0.1 personal catalog importer",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    },
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) return null;
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 5000) return null;
  const filePath = path.join(coversDir, `${id}.${extension}`);
  await writeFile(filePath, bytes);
  return `/covers/${id}.${extension}`;
}

async function main() {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(coversDir, { recursive: true });

  const raw = JSON.parse(await readFile(sourcePath, "utf8"));
  let existingById = new Map();
  try {
    const existing = JSON.parse(await readFile(outputPath, "utf8"));
    existingById = new Map((existing.albums ?? []).map((album) => [album.id, album]));
  } catch {
    existingById = new Map();
  }

  if (!Array.isArray(raw.albums)) {
    throw new Error("Expected a top-level albums array in the catalog JSON.");
  }

  const report = {
    sourcePath,
    generatedAt: new Date().toISOString(),
    offline,
    total: raw.albums.length,
    matched: 0,
    googleMatched: 0,
    unmatched: [],
    errors: []
  };

  const albums = [];
  for (const sourceAlbum of raw.albums) {
    const id = albumId(sourceAlbum);
    const previous = existingById.get(id);
    const base = {
      id,
      rank: sourceAlbum.number,
      title: sourceAlbum.album,
      artist: sourceAlbum.artist,
      year: catalogYearOverrides.get(`${sourceAlbum.artist}|${sourceAlbum.album}`) ?? sourceAlbum.year,
      genre: previous?.genre ?? null,
      appleCollectionId: previous?.appleCollectionId ?? null,
      appleCollectionUrl: previous?.appleCollectionUrl ?? null,
      appleArtworkUrl: previous?.appleArtworkUrl ?? null,
      coverSource: previous?.coverSource ?? (previous?.coverPath && previous.coverPath !== "/covers/placeholder.svg" ? "apple" : null),
      coverSourceUrl: previous?.coverSourceUrl ?? previous?.appleCollectionUrl ?? null,
      coverPath: normalizeCoverPath(previous?.coverPath),
      tracks: previous?.tracks ?? []
    };

    if (!offline && (!base.appleCollectionId || force)) {
      try {
        const match = await searchApple(sourceAlbum);
        await sleep(appleDelayMs);
        if (match) {
          const artworkUrl = highResArtwork(match.candidate.artworkUrl100);
          base.genre = match.candidate.primaryGenreName ?? null;
          base.appleCollectionId = match.candidate.collectionId ?? null;
          base.appleCollectionUrl = match.candidate.collectionViewUrl ?? null;
          base.appleArtworkUrl = artworkUrl;
          base.coverPath = await downloadCover(artworkUrl, id);
          base.coverSource = "apple";
          base.coverSourceUrl = match.candidate.collectionViewUrl ?? artworkUrl;
          base.tracks = base.appleCollectionId ? await lookupTracks(base.appleCollectionId) : [];
          report.matched += 1;
          await sleep(appleDelayMs);
        } else {
          report.unmatched.push({ rank: sourceAlbum.number, title: sourceAlbum.album, artist: sourceAlbum.artist });
        }
      } catch (error) {
        report.errors.push({
          rank: sourceAlbum.number,
          title: sourceAlbum.album,
          artist: sourceAlbum.artist,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    } else if (base.appleCollectionId) {
      report.matched += 1;
    }

    if (!offline && base.coverPath === "/covers/placeholder.svg" && googleEnabled()) {
      try {
        const match = await searchGoogleCover(sourceAlbum);
        await sleep(googleDelayMs);
        if (match) {
          const coverPath = await downloadGoogleCover(match.item, id);
          if (coverPath) {
            base.coverPath = coverPath;
            base.coverSource = "google-custom-search";
            base.coverSourceUrl = match.item.image?.contextLink ?? match.item.link;
            report.googleMatched += 1;
          }
        }
      } catch (error) {
        report.errors.push({
          rank: sourceAlbum.number,
          title: sourceAlbum.album,
          artist: sourceAlbum.artist,
          provider: "google-custom-search",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    albums.push(base);
  }

  const generated = {
    metadata: {
      title: raw.metadata?.title ?? "AlbumVault Catalog",
      description: raw.metadata?.description ?? "",
      sourceRecordCount: raw.metadata?.record_count ?? raw.albums.length,
      recordCount: albums.length,
      generatedAt: report.generatedAt,
      enrichmentMode: offline ? "offline" : "apple-itunes-search-api"
    },
    albums
  };

  await writeFile(outputPath, `${JSON.stringify(generated, null, 2)}\n`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${albums.length} albums to ${outputPath}`);
  console.log(`Apple matches: ${report.matched}; Google cover matches: ${report.googleMatched}; unmatched: ${report.unmatched.length}; errors: ${report.errors.length}`);
  if (!googleEnabled()) {
    console.log("Google cover fallback skipped. Set GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_CX to enable it.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
