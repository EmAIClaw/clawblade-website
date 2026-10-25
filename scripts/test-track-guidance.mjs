// Reader policy: unchecked legacy prose is never a description or secondary guide.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveTrackGuidance, detectTitleAmbiguity, buildAmbiguousTitleSet } from '../src/trackGuidance.ts';

const legacyVariants = [
  undefined,
  { trackTitle: 'Song', guide: 'Track 1 of 10. No confident track-specific external source was found.', focus: 'Metadata', source: null },
  { trackTitle: 'Song', guide: 'Triple-tracked vocals and pitch shifting.', focus: 'Production', source: null },
  // A URL alone is not claim-level review or proof of exact edition identity.
  { trackTitle: 'Song', guide: 'Triple-tracked vocals and pitch shifting.', focus: 'Production', source: { url: 'https://example.com/review', title: 'Review', label: 'Review' } },
];
const levels = ['documented', 'contextual', 'limited', 'insufficient-evidence', 'unresearched'];
function entry(level) {
  return { albumId: 'test', discNumber: 1, trackNumber: 1, trackTitle: 'Song', evidenceLevel: level,
    verifiedFacts: level === 'documented' ? [{ claim: 'A retained documented fact.', sourceRefs: [{ url: 'https://example.com/evidence' }] }] : [],
    musicalCharacter: '', albumContext: '', historicalContext: '', listeningNotes: '', limitations: level === 'insufficient-evidence' ? ['Research completed without sufficient evidence.'] : [] };
}
for (const status of ['loading', 'error', 'missing', 'loaded']) {
  for (const titleAmbiguous of [false, true]) {
    test(`${status}, ambiguous=${titleAmbiguous}: no legacy fallback or secondary prose`, () => {
      for (const legacyGuide of legacyVariants) {
        const input = { researchLoadStatus: status, researchEntry: undefined, legacyGuide, titleAmbiguous, researchErrorMessage: 'Network failure' };
        const before = JSON.stringify(input);
        const result = resolveTrackGuidance(input);
        assert.equal(result.kind, status === 'loaded' ? 'missing' : status);
        assert.equal(result.legacyGuide, undefined);
        assert.equal(result.legacySuppressed, true);
        if (status === 'missing' || status === 'loaded') assert.equal(result.leadText, 'Track commentary not yet researched.');
        if (status === 'error') assert.equal(result.message, 'Network failure');
        assert.equal(JSON.stringify(input), before, 'selector must not mutate source content');
      }
    });
  }
}
for (const level of levels) {
  test(`${level}: preserve exact research, exclude all legacy content`, () => {
    for (const legacyGuide of legacyVariants) for (const titleAmbiguous of [false, true]) {
      const researchEntry = entry(level);
      const result = resolveTrackGuidance({ researchLoadStatus: 'loaded', researchEntry, legacyGuide, titleAmbiguous });
      assert.equal(result.kind, level);
      assert.equal(result.entry, researchEntry);
      assert.equal(result.legacyGuide, undefined);
      assert.equal(result.legacySuppressed, true);
      if (level === 'documented') assert.equal(result.leadText, researchEntry.verifiedFacts[0].claim);
      if (level === 'insufficient-evidence') assert.equal(result.leadText, researchEntry.limitations[0]);
      if (level === 'unresearched') assert.equal(result.leadText, 'Track commentary not yet researched.');
    }
  });
}
test('loading and error never expose a stale research entry', () => {
  for (const status of ['loading', 'error']) {
    const result = resolveTrackGuidance({ researchLoadStatus: status, researchEntry: entry('documented'), legacyGuide: legacyVariants[2], titleAmbiguous: false });
    assert.equal(result.kind, status);
    assert.equal(result.entry, undefined);
  }
});
test('title ambiguity remains exact, including duplicates across discs and duplicate guides', () => {
  const tracks = [{ discNumber: 1, trackNumber: 1, title: 'Song', durationMs: null }, { discNumber: 2, trackNumber: 1, title: 'Song', durationMs: null }];
  assert.equal(detectTitleAmbiguity('Song', tracks, []), true);
  assert.equal(detectTitleAmbiguity('song', tracks, []), false);
  assert.equal(detectTitleAmbiguity('Song', tracks.slice(0, 1), [legacyVariants[1]]), false);
  assert.equal(detectTitleAmbiguity('Song', [], [legacyVariants[1], legacyVariants[2]]), true);
  assert.deepEqual([...buildAmbiguousTitleSet(tracks, [])], ['Song']);
});
test('every catalogue track: documented claims preserved, unchecked legacy excluded', () => {
  const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
  const catalog = read('../src/data/catalog.generated.json').albums;
  const legacy = read('../src/data/encyclopedia.generated.json').entries;
  const research = read('../src/data/track-encyclopedia/track-encyclopedia.generated.json').entries;
  for (const album of catalog) {
    const guides = legacy[album.id]?.trackGuide ?? [];
    const ambiguous = buildAmbiguousTitleSet(album.tracks, guides);
    for (const track of album.tracks) {
      const researchEntry = research[album.id]?.trackEntries.find(t => t.discNumber === track.discNumber && t.trackNumber === track.trackNumber && t.trackTitle === track.title);
      const result = resolveTrackGuidance({ researchLoadStatus: research[album.id] ? 'loaded' : 'missing', researchEntry, legacyGuide: guides.find(g => g.trackTitle === track.title), titleAmbiguous: ambiguous.has(track.title) });
      assert.equal(result.legacyGuide, undefined, `${album.title}: ${track.title}`);
      if (researchEntry?.verifiedFacts.length) assert.equal(result.leadText, researchEntry.verifiedFacts[0].claim);
      if (!researchEntry) assert.equal(result.leadText, 'Track commentary not yet researched.');
    }
  }
});
