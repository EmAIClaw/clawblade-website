import assert from 'node:assert/strict';
import catalogData from '../src/data/catalog.generated.json' with { type: 'json' };
import encyclopediaData from '../src/data/encyclopedia.generated.json' with { type: 'json' };

const selectedRanks = [27, 29, 43, 44, 45, 47];
const selectedAlbums = (catalogData.albums ?? []).filter((album) => selectedRanks.includes(album.rank));
const entries = encyclopediaData.entries ?? {};
const substantive = (guide) =>
  /^https:\/\//.test(guide.source?.url ?? '') &&
  guide.guide?.trim().length >= 80 &&
  guide.focus?.trim().length >= 40 &&
  guide.source?.summary?.trim().length >= 40;
const sourced = selectedAlbums.flatMap((album) =>
  (entries[album.id]?.trackGuide ?? [])
    .filter(substantive)
    .map((guide) => ({ album, guide }))
);
const perAlbum = new Map();
for (const { album } of sourced) perAlbum.set(album.id, (perAlbum.get(album.id) ?? 0) + 1);

assert.deepEqual(selectedAlbums.map((album) => album.rank), selectedRanks, 'research scope must contain rank 27 plus the next directly sourced coverage gaps, with rank 46 deferred for inadequate track-specific evidence');
assert.ok(sourced.length >= 18, `expected at least 18 substantive source-backed notes, found ${sourced.length}`);
assert.ok(selectedAlbums.every((album) => (perAlbum.get(album.id) ?? 0) >= 3), 'every selected album requires three substantive source-backed guides');
assert.ok(sourced.every(({ guide }) => guide.source.url.startsWith('https://')), 'every curated guide requires an inspectable direct HTTPS source URL');

console.log(`ranks 27–47 track-research regression test passed: ${sourced.length} sourced guides across ${perAlbum.size} albums`);
