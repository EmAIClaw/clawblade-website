import assert from 'node:assert/strict';
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
  const entry = entries[album.id];
  if (!entry) {
    failures.push(`#${album.rank} ${album.artist} — ${album.title}: missing encyclopedia entry`);
    continue;
  }

  const trackTitles = (album.tracks ?? []).map((track) => track.title);
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

if (failures.length) {
  console.error(`Data integrity failed for ${failures.length} album(s):`);
  for (const failure of failures.slice(0, 80)) console.error(`- ${failure}`);
  if (failures.length > 80) console.error(`...and ${failures.length - 80} more`);
  process.exit(1);
}

console.log(`data integrity tests passed for ${albums.length} albums`);
