import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "src/data/catalog.generated.json");
const coversDir = path.join(root, "public/covers");
const requestTimeoutMs = 20_000;
const userAgent = "AlbumVault/0.1 personal catalog repair";

const repairs = [
  { id: "032-beyonce-lemonade-d3bb0f63", releaseGroupId: "c1f22e07-7bdf-4a4f-8b50-7747c1091ef6", releaseId: "beb70fb9-7284-472f-96cc-c429f4cdc79f", trackCount: 12, genre: "Pop" },
  { id: "037-dr-dre-the-chronic-08e42779", releaseGroupId: "ad444843-7160-33d7-b0c9-fc99f2c14a99", releaseId: "924a0c96-6967-4452-9d27-f04987b55b69", trackCount: 16, genre: "Hip-Hop/Rap" },
  { id: "042-a-tribe-called-quest-the-low-end-theory-dd3040be", releaseGroupId: "c3733436-fcba-3c08-b082-d548df5c5139", releaseId: "69959f4a-29fd-4867-83ec-bfb4036b30d1", trackCount: 14, genre: "Hip-Hop/Rap" },
  { id: "054-liz-phair-exile-in-guyville-2b33a458", releaseGroupId: "c186db82-9988-367e-8486-2e38e9b6c8db", releaseId: "b08b6174-7f4d-4064-a4d8-b6824e0dc1c3", trackCount: 18, genre: "Alternative" },
  { id: "065-jay-z-reasonable-doubt-6a8e6823", releaseGroupId: "a7f852ba-08bc-36f1-92f3-4dc127f4b70a", releaseId: "e9a5f123-447f-4430-8efb-0921e1761ddf", trackCount: 14, genre: "Hip-Hop/Rap" },
  { id: "076-elvis-presley-the-sun-sessions-adb13ddd", releaseGroupId: "2ac479cc-0126-3709-bb55-7028e4c559ef", releaseId: "ffd6800b-e446-4a89-8db7-bda486845d8a", trackCount: 16, genre: "Rock" },
  { id: "087-erykah-badu-baduizm-d494a5ec", releaseGroupId: "45536412-c62c-34fc-9524-0bac1d2542c1", releaseId: "92c85c68-e8e4-3c39-bf4e-dd9e7339427c", trackCount: 14, genre: "R&B/Soul" },
  { id: "112-the-strokes-is-this-it-10c57aaf", releaseGroupId: "efea26d1-a016-30f6-b8e2-bc8c02336b0a", releaseId: "05f9032d-fda8-4ce6-99a5-fdd0fc8af8ee", trackCount: 11, genre: "Alternative" },
  { id: "123-beastie-boys-paul-s-boutique-28b8e212", releaseGroupId: "b534aa01-d621-31ba-9278-38a500e3cdca", releaseId: "c4944da6-84d6-498a-9aaa-94687305c8c2", trackCount: 15, genre: "Hip-Hop/Rap" },
  { id: "128-prince-1999-91b2e168", releaseGroupId: "561be5b7-a39c-3866-859d-d86f30816ae7", releaseId: "94fc4664-8562-4842-8fb9-9d246aff2669", trackCount: 11, genre: "Pop" },
  { id: "134-funkadelic-maggot-brain-4a5b90a5", releaseGroupId: "a334e612-e736-3b4f-82b4-c4dfb774983c", releaseId: "e0424f4b-0be7-4bae-b163-3f6b63723c41", trackCount: 7, genre: "R&B/Soul" },
  { id: "149-the-pretenders-pretenders-ab925375", releaseGroupId: "448c8d23-3118-397f-9b81-a560c799f27a", releaseId: "223b4ea0-846a-4ee4-8ad1-1e778dd26f4b", trackCount: 12, genre: "Rock" },
  { id: "150-pj-harvey-rid-of-me-1826b64c", releaseGroupId: "c1bb54cc-751d-300c-ba29-d7502d571c2d", releaseId: "1a46452f-5711-3bc2-99d2-257d0e60ba09", trackCount: 14, genre: "Alternative" },
  { id: "159-pulp-different-class-47b7d265", releaseGroupId: "88f69eab-8f07-343b-847c-b944ad33dfcf", releaseId: "c65de253-52cf-4e9e-b48e-2042dbbbecdf", trackCount: 12, genre: "Alternative" },
  { id: "161-buddy-holly-20-golden-greats-83b1a203", releaseGroupId: "5e762b33-2f63-3124-9912-251dbb1c0a83", releaseId: "53f6cc56-16eb-49f6-8e5d-d43476d53e65", trackCount: 20, genre: "Rock" },
  { id: "190-robyn-body-talk-7b7f26d0", releaseGroupId: "1e151a63-e906-4903-b108-b3ecf21218b4", releaseId: "afebe204-c664-474e-8bbc-4a4f49a7025c", trackCount: 15, genre: "Pop" },
  { id: "191-the-beatles-meet-the-beatles-19b8da50", releaseGroupId: "c2c696fc-6beb-3dfb-bb15-7bb021ebeb5d", releaseId: "13242fda-9a04-4e95-a9de-a63edc0dac80", trackCount: 12, genre: "Rock" },
  { id: "193-pavement-slanted-and-enchanted-b504cf59", releaseGroupId: "869f9eac-2a40-3a41-80a3-6bf2297a7cbc", releaseId: "6d6cec89-77e0-4808-9f4a-3e2e946ed4e3", trackCount: 14, genre: "Alternative" },
  { id: "194-sade-diamond-life-94eccc39", releaseGroupId: "af2a0c41-e612-3232-949d-bdca340c407c", releaseId: "98063a3f-563e-3b9e-be19-af33da0fef52", trackCount: 9, genre: "R&B/Soul" },
  { id: "195-a-tribe-called-quest-midnight-marauders-a267b50d", releaseGroupId: "c2afedfb-034a-3683-ad47-e4404cd7c485", releaseId: "66970091-71ab-47a6-a62a-30ee44109fae", trackCount: 14, genre: "Hip-Hop/Rap" },
  { id: "196-bjork-homogenic-e339214b", releaseGroupId: "810272e0-aef1-3d85-b2d3-e512e87fc38c", releaseId: "b0b0473a-e3ea-49b5-a332-5e2106317d74", trackCount: 10, genre: "Alternative" },
  { id: "200-rage-against-the-machine-rage-against-the-machine-fa5282b5", releaseGroupId: "1305859b-8937-397f-9c33-39f62eb672fb", releaseId: "e956c901-acb7-48d6-9dc6-389a5f91f372", trackCount: 10, genre: "Rock" },
  { id: "213-raekwon-only-built-4-cuban-linx-6ee43350", releaseGroupId: "ab981b48-9a7b-34c4-b46a-f6266317ce7c", releaseId: "876f4c16-f0e1-40db-8586-87884d49b70d", trackCount: 18, genre: "Hip-Hop/Rap" }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, accept, attempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: accept, "User-Agent": userAgent },
        redirect: "follow",
        signal: AbortSignal.timeout(requestTimeoutMs)
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(1_000 * (2 ** attempt));
    }
  }
  throw lastError;
}

function releaseTracks(release) {
  return (release.media ?? []).flatMap((medium, mediumIndex) =>
    (medium.tracks ?? []).map((track, trackIndex) => ({
      discNumber: medium.position ?? mediumIndex + 1,
      trackNumber: track.position ?? trackIndex + 1,
      title: track.title ?? track.recording?.title,
      durationMs: track.length ?? track.recording?.length ?? null,
      previewUrl: null
    }))
  );
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const stagedCovers = [];

for (const repair of repairs) {
  const album = catalog.albums.find((item) => item.id === repair.id);
  if (!album) throw new Error(`Catalog album not found: ${repair.id}`);

  const releaseResponse = await fetchWithRetry(
    `https://musicbrainz.org/ws/2/release/${repair.releaseId}?inc=recordings+release-groups+media&fmt=json`,
    "application/json"
  );
  const release = await releaseResponse.json();
  if (release["release-group"]?.id !== repair.releaseGroupId) {
    throw new Error(`${repair.id}: release does not belong to the verified release group`);
  }
  const tracks = releaseTracks(release);
  if (tracks.length !== repair.trackCount || tracks.some((track) => !track.title)) {
    throw new Error(`${repair.id}: expected ${repair.trackCount} tracks, received ${tracks.length}`);
  }

  await sleep(1_100);
  const coverResponse = await fetchWithRetry(
    `https://coverartarchive.org/release-group/${repair.releaseGroupId}/front-500`,
    "image/jpeg"
  );
  const contentType = coverResponse.headers.get("content-type") ?? "";
  const coverBytes = new Uint8Array(await coverResponse.arrayBuffer());
  if (!contentType.startsWith("image/jpeg") || coverBytes.length > 5_000_000) {
    throw new Error(`${repair.id}: unexpected cover response ${contentType} (${coverBytes.length} bytes)`);
  }
  if (coverBytes[0] !== 0xff || coverBytes[1] !== 0xd8 || coverBytes[2] !== 0xff) {
    throw new Error(`${repair.id}: Cover Art Archive response is not a JPEG`);
  }

  const coverPath = `/covers/${repair.id}.jpg`;
  stagedCovers.push({ filePath: path.join(root, "public", coverPath), bytes: coverBytes });
  Object.assign(album, {
    genre: repair.genre,
    appleCollectionId: null,
    appleCollectionUrl: null,
    appleArtworkUrl: null,
    coverSource: "musicbrainz-cover-art-archive",
    coverSourceUrl: `https://coverartarchive.org/release-group/${repair.releaseGroupId}`,
    musicBrainzReleaseGroupId: repair.releaseGroupId,
    coverPath,
    tracks
  });

  console.log(`Verified #${album.rank} ${album.artist} — ${album.title}: ${tracks.length} tracks`);
  await sleep(1_100);
}

for (const cover of stagedCovers) await writeFile(cover.filePath, cover.bytes);
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Repaired ${repairs.length} stale provider matches.`);
