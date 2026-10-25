import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolveEditorialAlbum, resolveTrackEditorial } from '../src/trackEditorial.ts';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const root = process.env.ALBUMVAULT_EDITORIAL_INPUT || 'src/data/next20-editorial';
const datasets = readdirSync(root).filter(f => /^\d{3}-.*\.json$/.test(f)).map(f => read(`${root}/${f}`));
const coverage = read(`${root}/coverage.json`);
const research = read('src/data/track-encyclopedia/track-encyclopedia.generated.json').entries;
const catalog = read('src/data/catalog.generated.json').albums;
const key = t => `${t.discNumber}:${t.trackNumber}:${t.trackTitle ?? t.title}`;
test('exact next20 catalogue coverage, copy, sources, optional questions and gaps', () => {
  assert.equal(datasets.length, 20);
  assert.deepEqual(datasets.map(d => catalog.find(a => a.id === d.albumId).rank).sort((a,b) => a-b), [1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20,21]);
  let authored = 0, questions = 0, gaps = 0;
  for (const data of datasets) {
    const album = research[data.albumId];
    assert.equal(resolveEditorialAlbum(album).scope, data.scope);
    assert.equal(resolveEditorialAlbum({ ...album, contentHash: 'stale' }), undefined);
    assert.equal(resolveEditorialAlbum({ ...album, editionNumber: 999 }), undefined);
    const rows = coverage.filter(r => r.albumId === data.albumId);
    const tracks = catalog.find(a => a.id === data.albumId).tracks;
    assert.deepEqual(rows.map(key).sort(), tracks.map(key).sort());
    assert.equal(new Set(rows.map(key)).size, rows.length);
    for (const row of rows) {
      const identity = { ...row };
      const note = resolveTrackEditorial(album, identity);
      const expected = data.entries.find(e => key(e) === key(row));
      if (row.disposition !== 'authored') {
        assert.equal(expected, undefined); assert.equal(note, undefined); gaps++; continue;
      }
      assert.ok(note, `${data.albumId}/${row.trackTitle}`);
      assert.equal(note.description, expected.description);
      assert.equal(note.question, expected.question);
      assert.equal(note.scope, data.scope);
      assert.equal(note.sourceContext, expected.sourceContext);
      assert.deepEqual(Object.fromEntries(note.sources.map(s => [s.url, s.label])), expected.sourceLabels);
      const original = album.trackEntries.find(t => key(t) === key(row));
      for (const patch of [
        { verifiedFacts: [] }, { evidenceLevel: 'unresearched' },
        { verifiedFacts: original.verifiedFacts.map(f => ({ ...f, sourceRefs: [] })) },
        { verifiedFacts: original.verifiedFacts.map(f => ({ ...f, sourceRefs: f.sourceRefs.map(s => ({ ...s, url: 'https://unapproved.invalid/' })) })) },
      ]) {
        const changed = { ...album, trackEntries: album.trackEntries.map(t => t === original ? { ...t, ...patch } : t) };
        assert.equal(resolveTrackEditorial(changed, identity), undefined);
      }
      assert.equal(resolveTrackEditorial({ ...album, trackEntries: [...album.trackEntries, original] }, identity), undefined);
      authored++; if (note.question) questions++;
      for (const patch of [{ contentHash: 'stale' }, { editionNumber: 999 }, { albumId: 'other' }]) assert.equal(resolveTrackEditorial({ ...album, ...patch }, identity), undefined);
      for (const patch of [{ discNumber: 999 }, { trackNumber: 999 }, { trackTitle: row.trackTitle + ' alternate' }, { albumId: 'other' }]) assert.equal(resolveTrackEditorial(album, { ...identity, ...patch }), undefined);
    }
  }
  assert.deepEqual({ authored, questions, gaps, rows: coverage.length }, { authored: 211, questions: 112, gaps: 83, rows: 294 });
});
test('all catalogue identities outside approved albums remain without editorial; research is immutable', () => {
  const before = JSON.stringify(research);
  for (const album of Object.values(research)) for (const track of album.trackEntries) {
    const note = resolveTrackEditorial(album, track);
    if (!datasets.some(d => d.albumId === album.albumId) && ![7,31].includes(Number(album.albumId.slice(0,3)))) assert.equal(note, undefined);
  }
  assert.equal(JSON.stringify(research), before);
});
