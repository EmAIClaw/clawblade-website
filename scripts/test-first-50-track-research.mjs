import assert from 'node:assert/strict';
import catalogData from '../src/data/catalog.generated.json' with { type: 'json' };
import encyclopediaData from '../src/data/encyclopedia.generated.json' with { type: 'json' };

const firstFifty = catalogData.albums.filter((album) => album.rank <= 50);
const entries = encyclopediaData.entries ?? {};
const sourced = firstFifty.flatMap((album) => (entries[album.id]?.trackGuide ?? []).map((guide) => ({ album, guide }))).filter(({ guide }) => guide.source?.url);
const perAlbum = new Map();
for (const { album } of sourced) perAlbum.set(album.id, (perAlbum.get(album.id) ?? 0) + 1);

assert.equal(firstFifty.length, 50, 'research scope must remain the first 50 catalog albums');
assert.ok(sourced.length >= 57, `expected at least 57 vetted source-backed research notes, found ${sourced.length}`);
assert.ok(perAlbum.size >= 20, `expected research across at least 20 albums, found ${perAlbum.size}`);
assert.ok(firstFifty.filter((album) => album.rank <= 10).every((album) => (perAlbum.get(album.id) ?? 0) >= 3), 'ranks 1–10 require at least three source-backed notes each');
assert.ok(sourced.every(({ guide }) => guide.guide.length > 50 && guide.focus.length > 10 && /^https:\/\//.test(guide.source.url)), 'each curated note requires substantive copy, focus, and inspectable source');

console.log(`first-50 research regression test passed: ${sourced.length} source-backed guides across ${perAlbum.size} albums`);
