import assert from 'node:assert/strict';
import catalogData from '../src/data/catalog.generated.json' with { type: 'json' };
import encyclopediaData from '../src/data/encyclopedia.generated.json' with { type: 'json' };

const selectedRanks = [11, 12, 13, 14, 15, 16, 17];
const selectedAlbums = (catalogData.albums ?? []).filter((album) => selectedRanks.includes(album.rank));
const entries = encyclopediaData.entries ?? {};
const sourced = selectedAlbums.flatMap((album) =>
  (entries[album.id]?.trackGuide ?? [])
    .filter((guide) => guide.source?.url && guide.guide?.length > 50 && guide.focus?.length > 10)
    .map((guide) => ({ album, guide }))
);
const perAlbum = new Map();
for (const { album } of sourced) perAlbum.set(album.id, (perAlbum.get(album.id) ?? 0) + 1);

assert.deepEqual(selectedAlbums.map((album) => album.rank), selectedRanks, 'research scope must remain the lowest seven catalog coverage gaps');
assert.ok(sourced.length >= 21, `expected at least 21 substantive source-backed notes, found ${sourced.length}`);
assert.ok(selectedAlbums.every((album) => (perAlbum.get(album.id) ?? 0) >= 3), 'every selected album requires three substantive source-backed guides');
assert.ok(sourced.every(({ guide }) => /^https:\/\//.test(guide.source.url)), 'every curated guide requires an inspectable direct source URL');

console.log(`ranks 11–17 coverage-gap regression test passed: ${sourced.length} sourced guides across ${perAlbum.size} albums`);
