import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'src/data/catalog.generated.json');
const encyclopediaPath = path.join(root, 'src/data/encyclopedia.generated.json');

function formatDuration(ms) {
  if (!ms) return 'duration unavailable';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function trackPosition(index, total) {
  if (index === 0) return 'opener';
  if (index === total - 1) return 'closer';
  if (index < total / 3) return 'early-album track';
  if (index < (total * 2) / 3) return 'middle-section track';
  return 'late-album track';
}

function normalizeArticleTitle(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*(album|soundtrack|mixtape|box set)[^)]*\)/gi, ' ')
    .replace(/\b(the|a|an)\b/gi, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function artistEvidence(artist, source) {
  const artistTokens = new Set(normalizeArticleTitle(artist).split(' ').filter((token) => token && token !== 'and'));
  const sourceTokens = new Set(normalizeArticleTitle(`${source.extract ?? ''} ${source.description ?? ''}`).split(' '));
  let overlap = 0;
  for (const token of artistTokens) if (sourceTokens.has(token)) overlap += 1;
  return artistTokens.size ? overlap / artistTokens.size : 0;
}

function metadataGuide(album, track, index, source = null) {
  const total = album.tracks.length;
  const previous = index > 0 ? album.tracks[index - 1]?.title : null;
  const next = index < total - 1 ? album.tracks[index + 1]?.title : null;
  const sequenceNote = previous && next
    ? `In the album sequence it follows "${previous}" and leads into "${next}".`
    : previous
      ? `In the album sequence it follows "${previous}" and closes the current track list.`
      : next
        ? `In the album sequence it opens the record and leads into "${next}".`
        : 'It is the only listed track in the current metadata.';
  const sourcedFact = source
    ? `${source.summary} Source: ${source.title}.`
    : 'No confident track-specific external source was found, so this entry uses static track metadata only.';
  return {
    trackTitle: track.title,
    guide: `Track ${track.trackNumber || index + 1} of ${total}, "${track.title}", is the album's ${trackPosition(index, total)} and runs ${formatDuration(track.durationMs)}. ${sequenceNote} ${sourcedFact}`,
    focus: source ? 'Verified track source summary and album sequence context' : 'Track metadata and album sequence context only',
    source
  };
}

// These guides were confirmed to describe a different track than the title
// attached to them. Replacing them with catalog metadata is safer than trying
// to reconstruct unsupported studio or performance claims.
const mismatchedTracks = new Map([
  ['062-outkast-stankonia-9808fc51', new Set(['?'])],
  ['017-kanye-west-my-beautiful-dark-twisted-fantasy-6d18b087', new Set(['See Me Now (feat. Beyoncé, Charlie Wilson & Big Sean) [Bonus Track]'])],
  ['029-the-beatles-the-beatles-white-album-29eb84d8', new Set(['Long, Long, Long', 'Revolution 1', 'Cry Baby Cry'])],
  ['052-james-brown-star-time-1d7aca32', new Set(['Mother Popcorn (Pts.1 & 2)'])],
  ['076-elvis-presley-the-sun-sessions-adb13ddd', new Set(['If I Can Dream (Stereo Mix)'])],
  ['107-new-order-substance-6d4ec0bb', new Set(['In a Lonely Place', 'Cries and Whispers', 'Hurt (Substance Edit)', '1963'])],
  ['127-pink-floyd-the-wall-504e3a21', new Set(['Hey You', 'Bring the Boys Back Home', 'Comfortably Numb', 'Run Like Hell'])],
  ['130-hank-williams-40-greatest-hits-89cb7a38', new Set(["I Won't Be Home No More (Single Version)"])],
  ['138-bob-marley-and-the-wailers-catch-a-fire-6971dad6', new Set(['Midnight Ravers'])],
  ['217-dixie-chicks-fly-b6577223', new Set(['Sin Wagon'])],
  ['226-the-antlers-hospice-b6753937', new Set(['Sylvia, An Introduction (Bonus Track)'])]
]);

const unrelatedSourceTitles = new Map([
  ['053-pink-floyd-the-dark-side-of-the-moon-c8bed536', new Set(['Astronomy Domine', 'See Emily Play', 'The Happiest Days of Our Lives', 'Set the Controls for the Heart of the Sun', 'The Fletcher Memorial Home', 'Comfortably Numb', 'When the Tigers Broke Free', 'Arnold Layne', 'Jugband Blues'])],
  ['069-bob-marley-and-the-wailers-exodus-2395620b', new Set(['Kaya (album)'])],
  ['152-jay-z-the-black-album-9747cc3a', new Set(['The Grey Album'])],
  ['166-sonic-youth-daydream-nation-babbcc05', new Set(['Within You Without You', "Touch Me I'm Sick"])],
  ['220-eminem-the-slim-shady-lp-e8c4b177', new Set(['Kill You', 'The Real Slim Shady'])]
]);

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const encyclopedia = JSON.parse(await readFile(encyclopediaPath, 'utf8'));
let repairedGuides = 0;
let promotedAlbumSources = 0;

for (const album of catalog.albums) {
  const entry = encyclopedia.entries?.[album.id];
  if (!entry) continue;
  const deniedSources = unrelatedSourceTitles.get(album.id) ?? new Set();
  entry.sources = (entry.sources ?? []).filter((source) => source?.url && !deniedSources.has(source.title));
  const sourceBackedGuideCount = (entry.trackGuide ?? []).filter((guide) => guide.source?.url).length;
  entry.relevance = [
    `AlbumVault ranks it #${album.rank}.`,
    `${album.genre ?? 'Genre not cataloged'}; ${album.tracks.length} catalog tracks; listed year ${album.year}.`,
    `Artist source: ${entry.artistInfo?.source?.title ?? 'not available'}.`,
    `Album source: ${entry.albumInfo?.source?.title ?? 'not available'}.`,
    `Track-specific source summaries: ${sourceBackedGuideCount}.`,
  ].join(' ');
  const currentAlbumSourceUrl = entry.albumInfo?.source?.url;
  if (entry.albumInfo && !currentAlbumSourceUrl) {
    const exactAlbumSource = (entry.sources ?? []).find((source) => {
      const description = String(source?.description ?? '').toLowerCase();
      return source?.label === 'Wikipedia'
        && source.url
        && normalizeArticleTitle(source.title) === normalizeArticleTitle(album.title)
        && /album|soundtrack|box set|mixtape/.test(description)
        && artistEvidence(album.artist, source) >= 0.5;
    });
    if (exactAlbumSource) {
      entry.albumInfo = { summary: exactAlbumSource.summary, source: exactAlbumSource };
      entry.context = exactAlbumSource.summary;
      entry.sources = (entry.sources ?? []).filter((source) => source?.url || source?.label !== 'Curated Reference');
      promotedAlbumSources += 1;
    }
  }
  const explicit = mismatchedTracks.get(album.id) ?? new Set();
  const blanketDemoRepair = album.id === '016-the-clash-london-calling-7d75cf05';
  const blanketLiveRepair = album.id === '095-metallica-master-of-puppets-87b23472';
  const blanketCatalogRepair = new Set([
    '032-beyonce-lemonade-d3bb0f63',
    '037-dr-dre-the-chronic-08e42779',
    '042-a-tribe-called-quest-the-low-end-theory-dd3040be',
    '054-liz-phair-exile-in-guyville-2b33a458',
    '065-jay-z-reasonable-doubt-6a8e6823',
    '067-alanis-morissette-jagged-little-pill-4c683edc',
    '076-elvis-presley-the-sun-sessions-adb13ddd',
    '087-erykah-badu-baduizm-d494a5ec',
    '112-the-strokes-is-this-it-10c57aaf',
    '123-beastie-boys-paul-s-boutique-28b8e212',
    '128-prince-1999-91b2e168',
    '134-funkadelic-maggot-brain-4a5b90a5',
    '149-the-pretenders-pretenders-ab925375',
    '150-pj-harvey-rid-of-me-1826b64c',
    '157-pearl-jam-ten-4e010abd',
    '159-pulp-different-class-47b7d265',
    '161-buddy-holly-20-golden-greats-83b1a203',
    '190-robyn-body-talk-7b7f26d0',
    '191-the-beatles-meet-the-beatles-19b8da50',
    '193-pavement-slanted-and-enchanted-b504cf59',
    '194-sade-diamond-life-94eccc39',
    '195-a-tribe-called-quest-midnight-marauders-a267b50d',
    '196-bjork-homogenic-e339214b',
    '200-rage-against-the-machine-rage-against-the-machine-fa5282b5',
    '213-raekwon-only-built-4-cuban-linx-6ee43350'
  ]).has(album.id);

  if (blanketCatalogRepair) {
    entry.themes = [
      'Static reference',
      'Source-backed facts',
      'Track sequence',
      album.genre,
      entry.artistInfo?.source?.description,
      entry.albumInfo?.source?.description
    ].filter(Boolean);
  }

  entry.trackGuide = album.tracks.map((track, index) => {
    const existing = (entry.trackGuide ?? []).find((guide) => guide.trackTitle === track.title);
    const shouldRepair = blanketCatalogRepair
      || existing?._generated === true
      || explicit.has(track.title)
      || (blanketDemoRepair && /Vanilla Studios Demo Version/i.test(track.title))
      || (blanketLiveRepair && /Live at|Live at the/i.test(track.title));
    if (!shouldRepair) return existing ?? metadataGuide(album, track, index);
    repairedGuides += 1;
    return metadataGuide(album, track, index);
  });
}

const hotel = catalog.albums.find((album) => album.id === '116-eagles-hotel-california-9e650795');
const hotelEntry = encyclopedia.entries?.[hotel?.id];
if (!hotel || !hotelEntry?.artistInfo?.source?.url) {
  throw new Error('Hotel California artist reference is not source-backed');
}

const hotelAlbumSource = (hotelEntry.sources ?? []).find(
  (source) => source?.url && source.title === 'Hotel California (album)'
);
if (!hotelAlbumSource) throw new Error('Hotel California album source is missing');

const hotelTrackSources = new Map(
  (hotelEntry.sources ?? [])
    .filter((source) => source?.url && ['Hotel California', 'New Kid in Town', 'Life in the Fast Lane'].includes(source.title))
    .map((source) => [source.title.toLowerCase(), source])
);

hotelEntry.albumInfo = {
  summary: hotelAlbumSource.summary,
  source: hotelAlbumSource
};
hotelEntry.context = hotelAlbumSource.summary;
hotelEntry.relevance = `AlbumVault ranks it #${hotel.rank}. ${hotel.genre}; ${hotel.tracks.length} catalog tracks; listed year ${hotel.year}. Artist source: ${hotelEntry.artistInfo.source.title}. Album source: ${hotelAlbumSource.title}. Track-specific source summaries: ${hotelTrackSources.size}.`;
hotelEntry.listeningNotes = [
  `Start with the artist context from ${hotelEntry.artistInfo.source.title}; listen for how this album fits or breaks from that wider story.`,
  `Read the album summary from ${hotelAlbumSource.title}, then identify one audible detail that connects to the sourced context.`,
  `${hotelTrackSources.size} tracks have their own source summaries. Use those as anchors, and avoid adding unsourced claims to the remaining tracks.`
];
hotelEntry.trackGuide = hotel.tracks.map((track, index) => {
  const normalized = track.title.toLowerCase().replace(' in ', ' in ');
  const source = hotelTrackSources.get(normalized) ?? null;
  return metadataGuide(hotel, track, index, source);
});
hotelEntry.themes = [
  'Static reference',
  'Source-backed facts',
  'Track sequence',
  hotel.genre,
  hotelEntry.artistInfo.source.description,
  hotelAlbumSource.description
].filter(Boolean);
hotelEntry.sources = Array.from(
  new Map(
    [hotelEntry.artistInfo.source, hotelAlbumSource, ...hotelTrackSources.values()]
      .filter((source) => source?.url)
      .map((source) => [source.url, source])
  ).values()
);

encyclopedia.metadata = {
  ...(encyclopedia.metadata ?? {}),
  factualRepairAt: new Date().toISOString(),
  factualRepair: {
    sourceBackedHotelCalifornia: true,
    mismatchedTrackGuidesReplaced: repairedGuides,
    albumReferencesPromotedToExistingWikipediaSources: promotedAlbumSources
  }
};

await writeFile(encyclopediaPath, `${JSON.stringify(encyclopedia, null, 2)}\n`);
console.log(`Repaired ${repairedGuides} track guides, promoted ${promotedAlbumSources} album references, and source-backed Hotel California.`);
