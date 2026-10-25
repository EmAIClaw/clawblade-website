import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveTrackEditorial } from '../src/trackEditorial.ts';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const research = read('../src/data/track-encyclopedia/track-encyclopedia.generated.json').entries;
const cases = [
  { albumId: '007-fleetwood-mac-rumours-bc57e04c', file: 'rumours-editorial.json', credit: /Caillat/, sourceLabel: 'Ken Caillat · MusicRadar' },
  { albumId: '031-miles-davis-kind-of-blue-2148074c', file: 'kind-of-blue-editorial.json', credit: /Evans|liner notes/, sourceLabel: 'Bill Evans’s liner notes, via Wikipedia' },
];
for (const expected of cases) {
  const album = research[expected.albumId];
  test(`${expected.albumId}: every track has a distinct evidence-linked description and question`, () => {
    const descriptions = new Set(); const questions = new Set();
    for (const track of album.trackEntries) {
      const note = resolveTrackEditorial(album, track);
      assert.ok(note, `missing editorial entry: ${track.trackTitle}`);
      assert.ok(note.description.trim());
      assert.ok(note.question.endsWith('?'));
      assert.ok(note.claimIds.length > 0);
      for (const id of note.claimIds) assert.ok(track.verifiedFacts.some(f => f.claimId === id));
      assert.ok(note.sources.length > 0);
      assert.match(note.description, expected.credit);
      assert.equal(note.sourceLabel, expected.sourceLabel);
      assert.ok(note.scope);
      assert.doesNotMatch(note.description, /Track \d+ of|No confident|\b\d+:\d{2}\b|pitch-shifting|DADGAD/);
      descriptions.add(note.description); questions.add(note.question);
    }
    const data = read(`../src/data/${expected.file}`);
    assert.equal(data.entries.length, album.trackEntries.length);
    assert.equal(descriptions.size, album.trackEntries.length);
    assert.equal(questions.size, album.trackEntries.length);
  });
  test(`${expected.albumId}: fails closed on absent/stale research and wrong exact identity`, () => {
    const track = album.trackEntries[0];
    assert.equal(resolveTrackEditorial(null, track), undefined);
    assert.equal(resolveTrackEditorial(album, undefined), undefined);
    for (const patch of [{ albumId: 'other' }, { editionNumber: 999 }, { contentHash: 'stale' }]) {
      assert.equal(resolveTrackEditorial({ ...album, ...patch }, track), undefined);
    }
    for (const patch of [{ albumId: 'other' }, { trackTitle: track.trackTitle.toLowerCase() }, { discNumber: 2 }, { trackNumber: 2 }]) {
      assert.equal(resolveTrackEditorial(album, { ...track, ...patch }), undefined);
    }
  });
  test(`${expected.albumId}: missing facts, sources, evidence or ambiguous identity cannot authorize prose`, () => {
    const original = album.trackEntries[0];
    for (const patch of [{ verifiedFacts: [] }, { evidenceLevel: 'unresearched' }, { verifiedFacts: original.verifiedFacts.map(f => ({ ...f, sourceRefs: [] })) }]) {
      const track = { ...original, ...patch };
      const changed = { ...album, trackEntries: [track, ...album.trackEntries.slice(1)] };
      assert.equal(resolveTrackEditorial(changed, track), undefined);
    }
    assert.equal(resolveTrackEditorial({ ...album, trackEntries: [...album.trackEntries, original] }, original), undefined);
  });
}
test('no content borrowing between the two editorial albums', () => {
  const a = research[cases[0].albumId]; const b = research[cases[1].albumId];
  assert.equal(resolveTrackEditorial(a, b.trackEntries[0]), undefined);
  assert.equal(resolveTrackEditorial(b, a.trackEntries[0]), undefined);
});
test('other albums remain unchanged; inputs are immutable', () => {
  const before = JSON.stringify(research);
  for (const other of Object.values(research)) for (const track of other.trackEntries) {
    const note = resolveTrackEditorial(other, track);
    if (!cases.some(c => c.albumId === other.albumId) && Number(other.albumId.slice(0, 3)) > 21) assert.equal(note, undefined);
  }
  assert.equal(JSON.stringify(research), before);
});
