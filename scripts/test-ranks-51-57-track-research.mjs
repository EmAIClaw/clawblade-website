import assert from 'node:assert/strict';
import catalogData from '../src/data/catalog.generated.json' with { type: 'json' };
import encyclopediaData from '../src/data/encyclopedia.generated.json' with { type: 'json' };

const selectedAlbums = (catalogData.albums ?? []).filter((album) => album.rank >= 51 && album.rank <= 57);
const entries = encyclopediaData.entries ?? {};
const sourced = selectedAlbums.flatMap((album) =>
  (entries[album.id]?.trackGuide ?? [])
    .filter((guide) => guide.source?.url)
    .map((guide) => ({ album, guide }))
);
const perAlbum = new Map();
for (const { album } of sourced) perAlbum.set(album.id, (perAlbum.get(album.id) ?? 0) + 1);

assert.equal(selectedAlbums.length, 7, 'research scope must remain catalog ranks 51–57');
assert.ok(sourced.length >= 21, `expected at least 21 vetted source-backed research notes, found ${sourced.length}`);
assert.equal(perAlbum.size, 7, `every selected album needs source-backed coverage; found ${perAlbum.size} covered albums`);
assert.ok(
  selectedAlbums.every((album) => (perAlbum.get(album.id) ?? 0) >= 3),
  'every selected album requires at least three source-backed notes'
);
assert.ok(
  sourced.every(({ guide }) =>
    guide.guide.length > 50 && guide.focus.length > 10 && /^https:\/\//.test(guide.source.url)
  ),
  'each curated note requires substantive copy, focus, and inspectable source'
);

console.log(`ranks 51–57 research regression test passed: ${sourced.length} source-backed guides across ${perAlbum.size} albums`);
