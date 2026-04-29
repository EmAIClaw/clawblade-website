import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "src/data/catalog.generated.json");
const reportPath = path.join(root, "src/data/cover-fallback-report.json");
const coversDir = path.join(root, "public/covers");
const requestTimeoutMs = Number(process.env.COVER_REQUEST_TIMEOUT_MS ?? 20000);
const musicBrainzDelayMs = Number(process.env.MUSICBRAINZ_DELAY_MS ?? 1100);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function luceneEscape(value) {
  return String(value).replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  return fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      "User-Agent": "AlbumVault/0.1 (personal cover cache; https://localhost)",
      ...(options.headers ?? {})
    }
  }).finally(() => clearTimeout(timeout));
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

function artistCreditName(candidate) {
  return (candidate["artist-credit"] ?? []).map((credit) => credit.name ?? credit.artist?.name ?? "").join(" ");
}

function scoreReleaseGroup(album, candidate) {
  const titleScore = similarity(album.title, candidate.title);
  const artistScore = similarity(album.artist, artistCreditName(candidate));
  const releaseYear = candidate["first-release-date"] ? Number(String(candidate["first-release-date"]).slice(0, 4)) : undefined;
  const yearScore = releaseYear === album.year ? 1 : releaseYear && Math.abs(releaseYear - album.year) <= 1 ? 0.7 : 0;
  const typeScore = candidate["primary-type"] === "Album" ? 1 : 0.25;
  const mbScore = Number(candidate.score ?? 0) / 100;
  return titleScore * 0.38 + artistScore * 0.32 + yearScore * 0.16 + typeScore * 0.08 + mbScore * 0.06;
}

async function searchReleaseGroup(album) {
  const query = `releasegroup:"${luceneEscape(album.title)}" AND artist:"${luceneEscape(album.artist)}"`;
  const url = `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(query)}&fmt=json&limit=10`;
  const data = await fetchJson(url);
  const ranked = (data["release-groups"] ?? [])
    .map((candidate) => ({ candidate, score: scoreReleaseGroup(album, candidate) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= 0.58 ? ranked[0] : null;
}

function bestCoverUrl(metadata) {
  const images = metadata.images ?? [];
  const front = images.find((image) => image.front && image.approved !== false) ?? images.find((image) => image.front) ?? images[0];
  if (!front) return null;
  return front.thumbnails?.["500"] ?? front.thumbnails?.large ?? front.thumbnails?.["1200"] ?? front.image ?? null;
}

async function coverForReleaseGroup(releaseGroupId) {
  const url = `https://coverartarchive.org/release-group/${releaseGroupId}/`;
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json"
    }
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Cover Art Archive failed ${response.status}: ${response.statusText}`);
  }
  const metadata = await response.json();
  return {
    imageUrl: bestCoverUrl(metadata),
    sourceUrl: metadata.release ?? `https://musicbrainz.org/release-group/${releaseGroupId}`
  };
}

async function downloadImage(url, albumId) {
  if (!url) return null;
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }
  });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) return null;
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 5000) return null;
  const fileName = `${albumId}-mb.${extension}`;
  await writeFile(path.join(coversDir, fileName), bytes);
  return `/covers/${fileName}`;
}

async function main() {
  await mkdir(coversDir, { recursive: true });
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const report = {
    generatedAt: new Date().toISOString(),
    provider: "musicbrainz-cover-art-archive",
    totalMissingAtStart: catalog.albums.filter((album) => album.coverPath === "/covers/placeholder.svg").length,
    downloaded: [],
    unmatched: [],
    errors: []
  };

  for (const album of catalog.albums) {
    if (album.coverPath !== "/covers/placeholder.svg") continue;
    try {
      const match = await searchReleaseGroup(album);
      await sleep(musicBrainzDelayMs);
      if (!match) {
        report.unmatched.push({ rank: album.rank, title: album.title, artist: album.artist, reason: "no confident MusicBrainz release-group match" });
        continue;
      }

      const cover = await coverForReleaseGroup(match.candidate.id);
      if (!cover?.imageUrl) {
        report.unmatched.push({ rank: album.rank, title: album.title, artist: album.artist, reason: "matched release group has no front cover" });
        continue;
      }

      const coverPath = await downloadImage(cover.imageUrl, album.id);
      if (!coverPath) {
        report.unmatched.push({ rank: album.rank, title: album.title, artist: album.artist, reason: "cover download failed" });
        continue;
      }

      album.coverPath = coverPath;
      album.coverSource = "musicbrainz-cover-art-archive";
      album.coverSourceUrl = cover.sourceUrl;
      album.musicBrainzReleaseGroupId = match.candidate.id;
      report.downloaded.push({
        rank: album.rank,
        title: album.title,
        artist: album.artist,
        score: Number(match.score.toFixed(3)),
        coverPath
      });
    } catch (error) {
      report.errors.push({
        rank: album.rank,
        title: album.title,
        artist: album.artist,
        message: error instanceof Error ? error.message : String(error)
      });
    }
    await sleep(musicBrainzDelayMs);
  }

  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Downloaded ${report.downloaded.length} covers from MusicBrainz/Cover Art Archive.`);
  console.log(`Remaining unmatched: ${report.unmatched.length}; errors: ${report.errors.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
