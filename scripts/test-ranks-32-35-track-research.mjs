import assert from 'node:assert/strict';
import catalogData from '../src/data/catalog.generated.json' with { type: 'json' };
import encyclopediaData from '../src/data/encyclopedia.generated.json' with { type: 'json' };

const selectedRanks = [32, 33, 34, 35];
const selectedAlbums = (catalogData.albums ?? []).filter((album) => selectedRanks.includes(album.rank));
const entries = encyclopediaData.entries ?? {};
const sourced = selectedAlbums.flatMap((album) =>
  (entries[album.id]?.trackGuide ?? [])
    .filter((guide) => guide.source?.url && guide.guide?.length > 50 && guide.focus?.length > 10)
    .map((guide) => ({ album, guide }))
);
const perAlbum = new Map();
for (const { album } of sourced) perAlbum.set(album.id, (perAlbum.get(album.id) ?? 0) + 1);

assert.deepEqual(selectedAlbums.map((album) => album.rank), selectedRanks, 'research scope must cover rank 32 plus the next three coverage gaps with adequate direct evidence');
assert.ok(sourced.length >= 12, `expected at least 12 substantive source-backed notes, found ${sourced.length}`);
assert.ok(selectedAlbums.every((album) => (perAlbum.get(album.id) ?? 0) >= 3), 'every selected album requires three substantive source-backed guides');
assert.ok(sourced.every(({ guide }) => /^https:\/\//.test(guide.source.url)), 'every curated guide requires an inspectable direct source URL');

console.log(`ranks 32–35 track-research regression test passed: ${sourced.length} sourced guides across ${perAlbum.size} albums`);
