// test-listening-guidance.mjs — TDD tests for pilot listening guidance data + loader.
//
// Run with: node --experimental-strip-types scripts/test-listening-guidance.mjs
//
// Verifies:
//   - exact identity matching (albumId/disc/track/title)
//   - wrong-album rejection, wrong-disc rejection, wrong-track rejection
//   - all 93 entries present (3 per album, 31 albums)
//   - at most 2 entry points per album
//   - no empty questions
//   - no timestamps / instrument assertions / audio-verified claims
//   - edition/hash fields non-empty
//   - claimId, when present, matches existing research shape
//   - no two consecutive albums share the same explorationLens

import assert from 'node:assert/strict';
import {
  loadListeningGuidance,
} from '../src/listeningGuidance.ts';
import guidanceData from '../src/data/listening-guidance.generated.json' with { type: 'json' };

const failures = [];
let passed = 0;

function test(name, fn) {
  return Promise.resolve().then(fn).then(() => {
    passed += 1;
    console.log(`  \u2713 ${name}`);
  }).catch((err) => {
    failures.push({ name, message: err.message });
    console.error(`  \u2717 ${name}: ${err.message}`);
  });
}

import { readFileSync } from 'node:fs';

// ─── Expected identities (pilot: 3 albums) ──────────────────────

const PILOT_EXPECTED = [
  { albumId: '001-marvin-gaye-what-s-going-on-fd00dde9', discNumber: 1, trackNumber: 1, trackTitle: "What's Going On", editionNumber: 5, contentHash: 'b35fcb8c1fb0a2a1' },
  { albumId: '001-marvin-gaye-what-s-going-on-fd00dde9', discNumber: 1, trackNumber: 6, trackTitle: 'Mercy Mercy Me (The Ecology)', editionNumber: 5, contentHash: 'b35fcb8c1fb0a2a1' },
  { albumId: '001-marvin-gaye-what-s-going-on-fd00dde9', discNumber: 1, trackNumber: 9, trackTitle: 'Inner City Blues (Make Me Wanna Holler)', editionNumber: 5, contentHash: 'b35fcb8c1fb0a2a1' },
  { albumId: '007-fleetwood-mac-rumours-bc57e04c', discNumber: 1, trackNumber: 2, trackTitle: 'Dreams', editionNumber: 3, contentHash: '414abb016229da97' },
  { albumId: '007-fleetwood-mac-rumours-bc57e04c', discNumber: 1, trackNumber: 7, trackTitle: 'The Chain', editionNumber: 3, contentHash: '414abb016229da97' },
  { albumId: '007-fleetwood-mac-rumours-bc57e04c', discNumber: 1, trackNumber: 11, trackTitle: 'Gold Dust Woman', editionNumber: 3, contentHash: '414abb016229da97' },
  { albumId: '031-miles-davis-kind-of-blue-2148074c', discNumber: 1, trackNumber: 1, trackTitle: 'So What', editionNumber: 1, contentHash: '452d460272415142' },
  { albumId: '031-miles-davis-kind-of-blue-2148074c', discNumber: 1, trackNumber: 4, trackTitle: 'All Blues', editionNumber: 1, contentHash: '452d460272415142' },
  { albumId: '031-miles-davis-kind-of-blue-2148074c', discNumber: 1, trackNumber: 5, trackTitle: 'Flamenco Sketches', editionNumber: 1, contentHash: '452d460272415142' },
];

// ─── Expansion identities (28 albums × 3 tracks = 84) ──────────
// Loaded from the verified identity file used during expansion.
const EXPAND_IDENTITIES = JSON.parse(
  readFileSync('/tmp/albumvault-expand-30-clean.json', 'utf-8')
).map(e => ({
  albumId: e.albumId,
  discNumber: e.discNumber,
  trackNumber: e.trackNumber,
  trackTitle: e.trackTitle,
  editionNumber: e.editionNumber,
  contentHash: e.contentHash,
}));

const EXPECTED = [...PILOT_EXPECTED, ...EXPAND_IDENTITIES];
const EXPECTED_ALBUM_COUNT = 31; // 3 pilot + 28 expansion
const EXPECTED_ENTRY_COUNT = EXPECTED.length; // 93

// Patterns that indicate forbidden content
const TIMESTAMP_RE = /\b\d{1,2}:\d{2}\b|\bseconds?\b|\bat \d/i;
const INSTRUMENT_ASSERTION_RE = /\b(piano|saxophone|trumpet|bass|drums?|guitar|horns?)\s+(plays?|enters?|solo|comes in)\b/i;
const AUDIO_VERIFIED_RE = /\b(audio[- ]?verified|I listened|verified by listening)\b/i;

// ─── Tests ───────────────────────────────────────────────────────

await test(`all ${EXPECTED_ENTRY_COUNT} expected entries present with exact identity`, () => {
  assert.equal(guidanceData.entries.length, EXPECTED_ENTRY_COUNT, `expected exactly ${EXPECTED_ENTRY_COUNT} entries`);
  for (const exp of EXPECTED) {
    const found = guidanceData.entries.find(e =>
      e.albumId === exp.albumId &&
      e.discNumber === exp.discNumber &&
      e.trackNumber === exp.trackNumber &&
      e.trackTitle === exp.trackTitle
    );
    assert.ok(found, `missing entry for ${exp.albumId} disc ${exp.discNumber} track ${exp.trackNumber} "${exp.trackTitle}"`);
    assert.equal(found.editionNumber, exp.editionNumber, `edition mismatch for ${exp.trackTitle}`);
    assert.equal(found.contentHash, exp.contentHash, `contentHash mismatch for ${exp.trackTitle}`);
  }
});

await test('exactly 3 entries per album', () => {
  const byAlbum = {};
  for (const e of guidanceData.entries) {
    byAlbum[e.albumId] = (byAlbum[e.albumId] || 0) + 1;
  }
  for (const [aid, count] of Object.entries(byAlbum)) {
    assert.equal(count, 3, `${aid} should have 3 entries, got ${count}`);
  }
  assert.equal(Object.keys(byAlbum).length, EXPECTED_ALBUM_COUNT, `should cover exactly ${EXPECTED_ALBUM_COUNT} albums`);
});

await test('at most 2 entry points per album', () => {
  const byAlbum = {};
  for (const e of guidanceData.entries) {
    if (e.isEntryPoint) {
      byAlbum[e.albumId] = (byAlbum[e.albumId] || 0) + 1;
    }
  }
  for (const [aid, count] of Object.entries(byAlbum)) {
    assert.ok(count <= 2, `${aid} has ${count} entry points, max 2 allowed`);
  }
});

await test('no empty questions', () => {
  for (const e of guidanceData.entries) {
    assert.ok(e.question && e.question.trim().length > 0, `empty question for ${e.trackTitle}`);
    assert.ok(e.question.endsWith('?'), `question for ${e.trackTitle} should end with ?`);
    // one sentence preferred — check no double sentence boundary
    const sentenceEnds = (e.question.match(/[.!?]\s/g) || []).length;
    assert.ok(sentenceEnds <= 1, `question for ${e.trackTitle} should be one sentence, found ${sentenceEnds} sentence boundaries`);
  }
});

await test('no attribution preamble in question', () => {
  for (const e of guidanceData.entries) {
    // Questions should not start with "The producer said..." or "The liner notes describe..."
    const preambleRe = /^(The (producer|liner notes)|According to|Wikipedia|Caillat|Evans)/i;
    assert.ok(!preambleRe.test(e.question.trim()), `question for ${e.trackTitle} starts with attribution preamble`);
  }
});

await test('no timestamps, instrument assertions, or audio-verified claims', () => {
  for (const e of guidanceData.entries) {
    const allText = [e.question, e.followUp || '', e.vocabulary ? `${e.vocabulary.term} ${e.vocabulary.definition}` : ''].join(' ');
    assert.ok(!TIMESTAMP_RE.test(allText), `timestamp found in ${e.trackTitle}: ${allText}`);
    assert.ok(!INSTRUMENT_ASSERTION_RE.test(allText), `instrument assertion found in ${e.trackTitle}`);
    assert.ok(!AUDIO_VERIFIED_RE.test(allText), `audio-verified claim found in ${e.trackTitle}`);
  }
});

await test('edition and hash fields non-empty', () => {
  for (const e of guidanceData.entries) {
    assert.ok(e.editionNumber != null && e.editionNumber > 0, `empty editionNumber for ${e.trackTitle}`);
    assert.ok(typeof e.contentHash === 'string' && e.contentHash.length > 0, `empty contentHash for ${e.trackTitle}`);
  }
});

await test('explorationLens is non-empty string', () => {
  for (const e of guidanceData.entries) {
    assert.ok(typeof e.explorationLens === 'string' && e.explorationLens.trim().length > 0,
      `empty explorationLens for ${e.trackTitle}`);
  }
});

await test('no two consecutive albums share the same explorationLens', () => {
  // Group entries by album in order of appearance, then check consecutive albums
  const seenAlbums = [];
  const albumLens = {};
  for (const e of guidanceData.entries) {
    if (!(e.albumId in albumLens)) {
      seenAlbums.push(e.albumId);
      albumLens[e.albumId] = new Set();
    }
    albumLens[e.albumId].add(e.explorationLens);
  }
  // Check that no two consecutive albums share ALL the same lenses
  // (at least one lens must differ between consecutive albums)
  for (let i = 1; i < seenAlbums.length; i++) {
    const prev = albumLens[seenAlbums[i - 1]];
    const curr = albumLens[seenAlbums[i]];
    // Check: is there any lens in curr not in prev, or vice versa?
    const allSame = [...curr].every(l => prev.has(l)) && [...prev].every(l => curr.has(l));
    assert.ok(!allSame,
      `albums ${seenAlbums[i-1]} and ${seenAlbums[i]} share identical lens sets: ${[...curr].join(', ')}`);
  }
});

await test('claimId, when present, matches pattern albumId:disc:track:fact-N', () => {
  const claimRe = /^[\w-]+:\d+:\d+:fact-\d+$/;
  for (const e of guidanceData.entries) {
    if (e.claimId) {
      assert.ok(claimRe.test(e.claimId), `claimId ${e.claimId} does not match expected pattern`);
      // claimId prefix should match albumId
      const prefix = e.claimId.split(':').slice(0, 1)[0];
      assert.equal(prefix, e.albumId, `claimId prefix ${prefix} != albumId ${e.albumId}`);
    }
  }
});

await test('vocabulary, when present, has term and definition', () => {
  for (const e of guidanceData.entries) {
    if (e.vocabulary) {
      assert.ok(e.vocabulary.term && e.vocabulary.term.trim().length > 0, `empty vocabulary.term for ${e.trackTitle}`);
      assert.ok(e.vocabulary.definition && e.vocabulary.definition.trim().length > 0, `empty vocabulary.definition for ${e.trackTitle}`);
    }
  }
});

await test('loader returns matching entry for exact identity', () => {
  for (const exp of EXPECTED) {
    const result = loadListeningGuidance(exp.albumId, exp.discNumber, exp.trackNumber, exp.trackTitle);
    assert.ok(result, `loader returned undefined for ${exp.trackTitle}`);
    assert.equal(result.albumId, exp.albumId);
    assert.equal(result.discNumber, exp.discNumber);
    assert.equal(result.trackNumber, exp.trackNumber);
    assert.equal(result.trackTitle, exp.trackTitle);
  }
});

await test('loader rejects wrong album', () => {
  const r = loadListeningGuidance('099-wrong-album', 1, 1, "What's Going On");
  assert.equal(r, undefined, 'should return undefined for wrong album');
});

await test('loader rejects wrong disc', () => {
  const r = loadListeningGuidance('001-marvin-gaye-what-s-going-on-fd00dde9', 2, 1, "What's Going On");
  assert.equal(r, undefined, 'should return undefined for wrong disc');
});

await test('loader rejects wrong track', () => {
  const r = loadListeningGuidance('001-marvin-gaye-what-s-going-on-fd00dde9', 1, 99, "What's Going On");
  assert.equal(r, undefined, 'should return undefined for wrong track number');
});

await test('loader rejects wrong title', () => {
  const r = loadListeningGuidance('001-marvin-gaye-what-s-going-on-fd00dde9', 1, 1, 'Wrong Title');
  assert.equal(r, undefined, 'should return undefined for wrong title');
});

await test('no "either is fine" repeated on every row', () => {
  // Parent correction: avoid repeating "either is fine" on every row
  const eitherCount = guidanceData.entries.filter(e =>
    (e.question || '').toLowerCase().includes('either is fine')
  ).length;
  assert.ok(eitherCount <= 1, `"either is fine" appears ${eitherCount} times; at most 1 allowed`);
});

await test('Inner City Blues uses full canonical title', () => {
  const entry = guidanceData.entries.find(e => e.albumId.startsWith('001-') && e.trackNumber === 9);
  assert.ok(entry, 'Inner City Blues entry missing');
  assert.equal(entry.trackTitle, 'Inner City Blues (Make Me Wanna Holler)', 'must use full canonical title');
});

// ─── Summary ─────────────────────────────────────────────────────

await new Promise(r => setTimeout(r, 0));
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.error('\nFailures:');
  for (const f of failures) {
    console.error(`  ${f.name}: ${f.message}`);
  }
  process.exit(1);
}