import assert from 'node:assert/strict';
import catalogData from '../src/data/catalog.generated.json' with { type: 'json' };
import encyclopediaData from '../src/data/encyclopedia.generated.json' with { type: 'json' };

const albums = catalogData.albums ?? [];
const entries = encyclopediaData.entries ?? {};
const failures = [];

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
