import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import catalogData from '../src/data/catalog.generated.json' with { type: 'json' };
import encyclopediaData from '../src/data/encyclopedia.generated.json' with { type: 'json' };

const albums = catalogData.albums ?? [];
const entries = encyclopediaData.entries ?? {};
const failures = [];

const velvetUndergroundAndNico = albums.find(
  (album) => album.id === '023-the-velvet-underground-the-velvet-underground-and-nico-0913adef'
);

try {
  assert.ok(velvetUndergroundAndNico, 'The Velvet Underground & Nico must exist in the catalog');
  assert.equal(velvetUndergroundAndNico.artist, 'The Velvet Underground & Nico', 'The Velvet Underground & Nico must credit Nico in the album artist');
  assert.equal(velvetUndergroundAndNico.appleCollectionId, 1440851613, 'The Velvet Underground & Nico must use its matching Apple collection');
  assert.match(velvetUndergroundAndNico.appleArtworkUrl, /9293397f-a707-237e-ec7e-0ca613a67e3c/, 'The Velvet Underground & Nico must use its matching Apple cover art');
  assert.match(velvetUndergroundAndNico.coverSourceUrl, /1440851613/, 'The Velvet Underground & Nico cover must link to its matching Apple release');
  assert.deepEqual(
    velvetUndergroundAndNico.tracks.map((track) => track.title),
    [
      'Sunday Morning',
      "I'm Waiting for the Man",
      'Femme Fatale',
      'Venus In Furs',
      'Run Run Run',
      "All Tomorrow's Parties",
      'Heroin',
      'There She Goes Again',
      "I'll Be Your Mirror",
      "The Black Angel's Death Song",
      'European Son'
    ],
    'The Velvet Underground & Nico must use its original 11-track sequence'
  );
} catch (error) {
  failures.push(error.message);
}

const bobMarleyLegend = albums.find(
  (album) => album.id === '047-bob-marley-and-the-wailers-legend-e2c8278d'
);

try {
  assert.ok(bobMarleyLegend, 'Bob Marley and the Wailers — Legend must exist in the catalog');
  assert.equal(bobMarleyLegend.appleCollectionId, 1469575763, 'Legend must use Apple’s original compilation release, not Legend Remixed');
  assert.deepEqual(
    bobMarleyLegend.tracks.map((track) => track.title),
    [
      'Is This Love',
      'No Woman, No Cry (Live At The Lyceum, London/1975)',
      'Could You Be Loved',
      'Three Little Birds',
      'Buffalo Soldier',
      'Get Up, Stand Up',
      'Stir It Up',
      'Easy Skanking',
      'One Love / People Get Ready',
      'I Shot The Sheriff',
      'Waiting In Vain',
      'Redemption Song',
      'Satisfy My Soul',
      'Exodus',
      'Jamming',
      'Punky Reggae Party (12\" Version)'
    ],
    'Legend must use the original 16-track compilation sequence'
  );
} catch (error) {
  failures.push(error.message);
}

for (const album of albums) {
  if (!album.coverPath?.startsWith('/covers/')) {
    failures.push(`#${album.rank} ${album.artist} — ${album.title}: invalid public cover path ${album.coverPath}`);
  } else {
    try {
      await access(new URL(`../public${album.coverPath}`, import.meta.url));
    } catch {
      failures.push(`#${album.rank} ${album.artist} — ${album.title}: cover file does not exist at ${album.coverPath}`);
    }
  }

  const entry = entries[album.id];
  if (!entry) {
    failures.push(`#${album.rank} ${album.artist} — ${album.title}: missing encyclopedia entry`);
    continue;
  }

  if (!entry.artistInfo?.summary) {
    failures.push(`#${album.rank} ${album.artist} — ${album.title}: missing artist reference`);
  } else if (!entry.artistInfo.source?.url) {
    failures.push(`#${album.rank} ${album.artist} — ${album.title}: artist reference is not source-backed`);
  }
  if (!entry.albumInfo?.summary) {
    failures.push(`#${album.rank} ${album.artist} — ${album.title}: missing album reference`);
  } else if (!entry.albumInfo.source?.url) {
    failures.push(`#${album.rank} ${album.artist} — ${album.title}: album reference is not source-backed`);
  }
  if ((entry.sources ?? []).some((source) => !source?.url)) {
    failures.push(`#${album.rank} ${album.artist} — ${album.title}: contains a source record without a URL`);
  }
  if (!entry.relevance?.includes(`${album.tracks.length} catalog tracks`)) {
    failures.push(`#${album.rank} ${album.artist} — ${album.title}: stale catalogue track count in relevance summary`);
  }

  const trackTitles = album.tracks.map((track) => track.title);
  const guideTitles = (entry.trackGuide ?? []).map((guide) => guide.trackTitle);

  try {
    assert.deepEqual(
      guideTitles,
      trackTitles,
      `trackGuide must mirror catalog track order for ${album.artist} — ${album.title}`
    );
  } catch {
    const missingGuides = trackTitles.filter((title) => !guideTitles.includes(title));
    const extraGuides = guideTitles.filter((title) => !trackTitles.includes(title));
    failures.push(
      `#${album.rank} ${album.artist} — ${album.title}: ${trackTitles.length} catalog tracks vs ${guideTitles.length} guides` +
        (missingGuides.length ? `; missing guides: ${missingGuides.slice(0, 8).join(', ')}` : '') +
        (extraGuides.length ? `; extra guides: ${extraGuides.slice(0, 8).join(', ')}` : '')
    );
  }
}

const jaggedLittlePill = albums.find(
  (album) => album.id === '067-alanis-morissette-jagged-little-pill-4c683edc'
);
try {
  assert.ok(jaggedLittlePill, 'Jagged Little Pill must exist');
  assert.equal(jaggedLittlePill.appleCollectionId, null, 'Jagged Little Pill must not use the Little Drummer Boy Apple single');
  assert.equal(jaggedLittlePill.musicBrainzReleaseGroupId, 'ee3d18ed-d6a8-37c7-a964-41bbdb6d59f1');
  assert.equal(jaggedLittlePill.genre, 'Alternative');
  assert.match(jaggedLittlePill.coverSourceUrl, /ee3d18ed-d6a8-37c7-a964-41bbdb6d59f1/);
  assert.deepEqual(
    jaggedLittlePill.tracks.map((track) => track.title),
    [
      'All I Really Want',
      'You Oughta Know',
      'Perfect',
      'Hand in My Pocket',
      'Right Through You',
      'Forgiven',
      'You Learn',
      'Head Over Feet',
      'Mary Jane',
      'Ironic',
      'Not the Doctor',
      'Wake Up',
      'You Oughta Know (Jimmy the Saint Blend) / Your House'
    ],
    'Jagged Little Pill must use the original 13-track CD sequence'
  );
  assert.ok(jaggedLittlePill.tracks.every((track) => track.previewUrl === null), 'Jagged Little Pill must not borrow previews from another release');
  assert.match(entries[jaggedLittlePill.id]?.relevance ?? '', /Alternative; 13 catalog tracks/);
  assert.ok(!(entries[jaggedLittlePill.id]?.themes ?? []).includes('Christmas'), 'Jagged Little Pill must not retain the wrong Christmas genre');
} catch (error) {
  failures.push(error.message);
}

const hotelCalifornia = albums.find((album) => album.id === '116-eagles-hotel-california-9e650795');
const hotelCaliforniaEntry = hotelCalifornia ? entries[hotelCalifornia.id] : null;
try {
  assert.ok(hotelCaliforniaEntry, 'Hotel California encyclopedia entry must exist');
  assert.equal(
    hotelCaliforniaEntry.artistInfo?.source?.url,
    'https://en.wikipedia.org/wiki/Eagles_(band)',
    'Hotel California must use the Eagles artist article'
  );
  assert.equal(
    hotelCaliforniaEntry.albumInfo?.source?.url,
    'https://en.wikipedia.org/wiki/Hotel_California_(album)',
    'Hotel California must use its matching album article'
  );
  assert.ok(
    hotelCaliforniaEntry.trackGuide.every((guide) => guide.source?.url || /static track metadata only/.test(guide.guide)),
    'Hotel California guides must be source-backed or explicitly metadata-only'
  );
} catch (error) {
  failures.push(error.message);
}

const pearlJamTen = albums.find((album) => album.id === '157-pearl-jam-ten-4e010abd');
try {
  assert.equal(
    entries[pearlJamTen?.id]?.albumInfo?.source?.url,
    'https://en.wikipedia.org/wiki/Ten_(Pearl_Jam_album)',
    'Pearl Jam — Ten must not resolve to a different Pearl Jam album'
  );
  assert.equal(pearlJamTen.appleCollectionId, null, 'Ten must not use the Live on Ten Legs Apple collection');
  assert.equal(pearlJamTen.musicBrainzReleaseGroupId, 'cea5d18a-1924-3cda-bebc-38933834b25d');
  assert.deepEqual(
    pearlJamTen.tracks.map((track) => track.title),
    ['Once', 'Even Flow', 'Alive', 'Why Go', 'Black', 'Jeremy', 'Oceans', 'Porch', 'Garden', 'Deep', 'Release / Master/Slave'],
    'Ten must use its original studio-album sequence'
  );
} catch (error) {
  failures.push(error.message);
}

const slimShady = albums.find((album) => album.id === '220-eminem-the-slim-shady-lp-e8c4b177');
try {
  assert.ok(slimShady, 'The Slim Shady LP must exist');
  assert.equal(slimShady.appleCollectionId, null, 'The Slim Shady LP must not use The Marshall Mathers LP Apple collection');
  assert.equal(slimShady.musicBrainzReleaseGroupId, 'be725de4-4633-3c8a-9a03-f2c4392b6e0d');
  assert.equal(slimShady.tracks[0]?.title, 'Public Service Announcement');
  assert.equal(slimShady.tracks[1]?.title, 'My Name Is');
  assert.equal(slimShady.tracks.at(-1)?.title, 'Still Don’t Give a Fuck');
  assert.equal(entries[slimShady.id]?.albumInfo?.source?.url, 'https://en.wikipedia.org/wiki/The_Slim_Shady_LP');
  assert.deepEqual(
    entries[slimShady.id]?.themes,
    ['Celebrity and fame', 'Mental instability', 'Violence and controversy', 'Satire and provocation', 'Fan obsession'],
    'The Slim Shady LP must retain its curated descriptive themes'
  );
} catch (error) {
  failures.push(error.message);
}

const samCookeLive = albums.find((album) => album.id === '233-sam-cooke-live-at-the-harlem-square-club-f021bcc8');
try {
  assert.equal(samCookeLive?.year, 1985, 'Live at the Harlem Square Club must use its 1985 release year');
} catch (error) {
  failures.push(error.message);
}

const verifiedProviderRepairs = [
  ['032-beyonce-lemonade-d3bb0f63', 'c1f22e07-7bdf-4a4f-8b50-7747c1091ef6', 12],
  ['037-dr-dre-the-chronic-08e42779', 'ad444843-7160-33d7-b0c9-fc99f2c14a99', 16],
  ['042-a-tribe-called-quest-the-low-end-theory-dd3040be', 'c3733436-fcba-3c08-b082-d548df5c5139', 14],
  ['054-liz-phair-exile-in-guyville-2b33a458', 'c186db82-9988-367e-8486-2e38e9b6c8db', 18],
  ['065-jay-z-reasonable-doubt-6a8e6823', 'a7f852ba-08bc-36f1-92f3-4dc127f4b70a', 14],
  ['076-elvis-presley-the-sun-sessions-adb13ddd', '2ac479cc-0126-3709-bb55-7028e4c559ef', 16],
  ['087-erykah-badu-baduizm-d494a5ec', '45536412-c62c-34fc-9524-0bac1d2542c1', 14],
  ['112-the-strokes-is-this-it-10c57aaf', 'efea26d1-a016-30f6-b8e2-bc8c02336b0a', 11],
  ['123-beastie-boys-paul-s-boutique-28b8e212', 'b534aa01-d621-31ba-9278-38a500e3cdca', 15],
  ['128-prince-1999-91b2e168', '561be5b7-a39c-3866-859d-d86f30816ae7', 11],
  ['134-funkadelic-maggot-brain-4a5b90a5', 'a334e612-e736-3b4f-82b4-c4dfb774983c', 7],
  ['149-the-pretenders-pretenders-ab925375', '448c8d23-3118-397f-9b81-a560c799f27a', 12],
  ['150-pj-harvey-rid-of-me-1826b64c', 'c1bb54cc-751d-300c-ba29-d7502d571c2d', 14],
  ['159-pulp-different-class-47b7d265', '88f69eab-8f07-343b-847c-b944ad33dfcf', 12],
  ['161-buddy-holly-20-golden-greats-83b1a203', '5e762b33-2f63-3124-9912-251dbb1c0a83', 20],
  ['190-robyn-body-talk-7b7f26d0', '1e151a63-e906-4903-b108-b3ecf21218b4', 15],
  ['191-the-beatles-meet-the-beatles-19b8da50', 'c2c696fc-6beb-3dfb-bb15-7bb021ebeb5d', 12],
  ['193-pavement-slanted-and-enchanted-b504cf59', '869f9eac-2a40-3a41-80a3-6bf2297a7cbc', 14],
  ['194-sade-diamond-life-94eccc39', 'af2a0c41-e612-3232-949d-bdca340c407c', 9],
  ['195-a-tribe-called-quest-midnight-marauders-a267b50d', 'c2afedfb-034a-3683-ad47-e4404cd7c485', 14],
  ['196-bjork-homogenic-e339214b', '810272e0-aef1-3d85-b2d3-e512e87fc38c', 10],
  ['200-rage-against-the-machine-rage-against-the-machine-fa5282b5', '1305859b-8937-397f-9c33-39f62eb672fb', 10],
  ['213-raekwon-only-built-4-cuban-linx-6ee43350', 'ab981b48-9a7b-34c4-b46a-f6266317ce7c', 18]
];
for (const [albumId, releaseGroupId, trackCount] of verifiedProviderRepairs) {
  const album = albums.find((item) => item.id === albumId);
  if (!album) {
    failures.push(`${albumId}: verified provider repair album is missing`);
    continue;
  }
  if (album.appleCollectionId !== null) failures.push(`${albumId}: stale Apple collection must be cleared`);
  if (album.musicBrainzReleaseGroupId !== releaseGroupId) failures.push(`${albumId}: wrong MusicBrainz release group`);
  if (album.tracks.length !== trackCount) failures.push(`${albumId}: expected ${trackCount} verified tracks, found ${album.tracks.length}`);
  if (album.tracks.some((track) => track.previewUrl !== null)) failures.push(`${albumId}: must not borrow Apple previews from another release`);
  if (album.coverSource !== 'musicbrainz-cover-art-archive') failures.push(`${albumId}: cover must come from Cover Art Archive`);
}

const forbiddenSources = [
  ['053-pink-floyd-the-dark-side-of-the-moon-c8bed536', 'Comfortably Numb'],
  ['069-bob-marley-and-the-wailers-exodus-2395620b', 'Kaya (album)'],
  ['152-jay-z-the-black-album-9747cc3a', 'The Grey Album'],
  ['166-sonic-youth-daydream-nation-babbcc05', "Touch Me I'm Sick"]
];
for (const [albumId, sourceTitle] of forbiddenSources) {
  if ((entries[albumId]?.sources ?? []).some((source) => source.title === sourceTitle)) {
    failures.push(`${albumId}: unrelated source ${sourceTitle} must be removed`);
  }
}

const repairedGuideChecks = [
  ['017-kanye-west-my-beautiful-dark-twisted-fantasy-6d18b087', 'See Me Now (feat. Beyoncé, Charlie Wilson & Big Sean) [Bonus Track]'],
  ['029-the-beatles-the-beatles-white-album-29eb84d8', 'Long, Long, Long'],
  ['052-james-brown-star-time-1d7aca32', 'Mother Popcorn (Pts.1 & 2)'],
  ['107-new-order-substance-6d4ec0bb', '1963'],
  ['127-pink-floyd-the-wall-504e3a21', 'Comfortably Numb'],
  ['217-dixie-chicks-fly-b6577223', 'Sin Wagon']
];
for (const [albumId, trackTitle] of repairedGuideChecks) {
  const guide = entries[albumId]?.trackGuide?.find((item) => item.trackTitle === trackTitle);
  if (!guide || (!guide.source?.url && !/static track metadata only/.test(guide.guide))) {
    failures.push(`${albumId}: ${trackTitle} must retain a repaired metadata guide or a source-backed editorial replacement`);
  }
}

if (failures.length) {
  console.error(`Data integrity failed for ${failures.length} album(s):`);
  for (const failure of failures.slice(0, 80)) console.error(`- ${failure}`);
  if (failures.length > 80) console.error(`...and ${failures.length - 80} more`);
  process.exit(1);
}

console.log(`data integrity tests passed for ${albums.length} albums`);
